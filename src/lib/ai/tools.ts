import { tool } from "ai";
import { z } from "zod";
import { runBrowserTask } from "~/server/services/browser-use";

export function createBrowseTool(browserSessionId: string) {
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
      return result.output;
    },
  });
}

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
