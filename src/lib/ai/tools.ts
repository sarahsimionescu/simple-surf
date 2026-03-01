import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";
import { runBrowserTask } from "~/server/services/browser-use";
import { db } from "~/server/db";
import { env } from "~/env";

// extract the first url from a string
function extractUrl(text: string): string | null {
  const match = /https?:\/\/[^\s)"',]+/i.exec(text);
  return match?.[0] ?? null;
}

export function createBrowseTool(
  browserSessionId: string,
  conversationId: string,
) {
  return tool({
    description:
      "Browse the web on behalf of the user. Give a natural language instruction for what to do in the browser.",
    inputSchema: z.object({
      instruction: z
        .string()
        .describe(
          'What to do in the browser, e.g. "search for flights to Paris on Google Flights"',
        ),
    }),
    execute: async ({ instruction }) => {
      const result = await runBrowserTask(browserSessionId, instruction);

      // update lastVisitedUrl and screenshot from output or instruction
      const url = extractUrl(result.output) ?? extractUrl(instruction);
      if (url || result.screenshotUrl) {
        await db.conversation.update({
          where: { id: conversationId },
          data: {
            ...(url && { lastVisitedUrl: url }),
            ...(result.screenshotUrl && { lastScreenshotUrl: result.screenshotUrl }),
          },
        });
      }

      return result.output;
    },
  });
}

export const webSearchTool = tool({
  description:
    "Search the web for quick answers and background context. Use this for factual questions, looking up information, or gathering context before browsing. Returns relevant results with titles, URLs, and highlights.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    const exa = new Exa(env.EXA_API_KEY);
    const results = await exa.search(query, {
      type: "auto",
      numResults: 5,
      contents: {
        highlights: {
          maxCharacters: 300,
        },
      },
    });

    const searchResults = results.results.map((r) => ({
      title: r.title ?? "",
      url: r.url,
      highlights: (r as { highlights?: string[] }).highlights ?? [],
    }));

    return JSON.stringify(searchResults);
  },
});

export const renderScreenTool = tool({
  description:
    "Show a screen to the user to collect input. Use for choices, free text input, or when the user needs to authenticate in the browser.",
  inputSchema: z.object({
    type: z
      .enum(["select-one", "select-multi", "text", "auth"])
      .describe("The type of input to collect"),
    prompt: z.string().describe("What to ask the user"),
    options: z
      .array(z.string())
      .optional()
      .describe("Options for select-one or select-multi types"),
  }),
  // No execute — handled on the client via addToolOutput
});
