import { z } from "zod";
import { type UIMessage } from "ai";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  createBrowserSession,
  stopBrowserSession,
  isBrowserSessionAlive,
} from "~/server/services/browser-use";

export const conversationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ title: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      // Credits exhausted — create conversation record but skip browser session
      const conversation = await ctx.db.conversation.create({
        data: {
          userId: ctx.session.user.id,
          title: input?.title ?? null,
          browserSessionId: "credits-exhausted",
          browserLiveUrl: null,
        },
      });

      return conversation;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.db.conversation.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (!conversation) throw new Error("Conversation not found");

      // Credits exhausted — don't recreate browser sessions
      const { browserSessionId, browserLiveUrl } = conversation;

      // parse stored messages back to UIMessage format
      const uiMessages = conversation.messages.map(
        (m) => JSON.parse(m.content) as UIMessage,
      );

      return {
        ...conversation,
        browserSessionId,
        browserLiveUrl,
        uiMessages,
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.conversation.findMany({
      where: {
        userId: ctx.session.user.id,
        OR: [
          { title: { not: null } },
          { lastVisitedUrl: { not: null } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.db.conversation.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!conversation) throw new Error("Conversation not found");

      // Clean up Browser Use session
      if (conversation.browserSessionId) {
        try {
          await stopBrowserSession(conversation.browserSessionId);
        } catch {
          // Session may already be expired
        }
      }

      await ctx.db.conversation.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
