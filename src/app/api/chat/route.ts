import {
  type UIMessage,
  convertToModelMessages,
  streamText,
  stepCountIs,
  wrapLanguageModel,
} from "ai";
import { createGateway } from "@ai-sdk/gateway";
import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { cacheMiddleware } from "~/lib/ai/cache-middleware";
import { createBrowseTool, renderScreenTool, webSearchTool } from "~/lib/ai/tools";
import { env } from "~/env";
import { db } from "~/server/db";
import { auth } from "~/server/better-auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
  // Authenticate
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as {
    messages: UIMessage[];
    conversationId: string;
    location?: { lat?: number; lng?: number; name?: string };
  };
  const { messages, conversationId, location } = body;

  // Get conversation and verify ownership
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
  });
  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }
  if (!conversation.browserSessionId) {
    return new Response("No browser session", { status: 400 });
  }

  // auto-title from first user message if untitled
  if (!conversation.title) {
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      const text = firstUserMessage.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ")
        .slice(0, 100);
      if (text) {
        await db.conversation.update({
          where: { id: conversationId },
          data: { title: text },
        });
      }
    }
  }

  // Model stack: gateway → supermemory → cache middleware
  const gatewayProvider = createGateway({
    apiKey: env.AI_GATEWAY_API_KEY,
  });
  const baseModel = gatewayProvider("anthropic/claude-sonnet-4");
  const modelWithMemory = withSupermemory(baseModel, session.user.id, {
    apiKey: env.SUPERMEMORY_API_KEY,
    addMemory: "always",
  });
  const model = wrapLanguageModel({
    model: modelWithMemory,
    middleware: cacheMiddleware,
  });

  const result = streamText({
    model,
    system: `You are SimpleSurf, a friendly and patient browsing assistant designed for elderly users.

Your job is to help users browse the web. You have three tools:
- "webSearch": Use this first for quick factual lookups or finding the right page to visit. After getting results, use "browse" to navigate to the most relevant URL so the user can see it.
- "browse": Use this to perform actions in the browser (navigate, click, search, fill forms, etc.)
- "renderScreen": Use this to ask the user for input when you need choices or information from them.
${location ? `\nUser location context:${location.lat && location.lng ? ` coordinates ${location.lat}, ${location.lng}` : ""}${location.name ? ` (${location.name})` : ""}. Use this for location-based queries like finding nearby places, local weather, directions, etc.\n` : ""}
Guidelines:
- Use simple, clear language. Avoid jargon.
- Be patient and reassuring.
- When you find information, summarize it clearly.
- When presenting choices, use renderScreen with clear, simple options.
- For authentication (logging into websites), use renderScreen with type "auth" to prompt the user to log in directly in the browser iframe.
- Always confirm important actions before executing them.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      browse: createBrowseTool(conversation.browserSessionId, conversationId),
      webSearch: webSearchTool,
      renderScreen: renderScreenTool,
    },
  });

  return result.toUIMessageStreamResponse();
}
