import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  createBrowserSession,
  stopBrowserSession,
} from "~/server/services/browser-use";

export const conversationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ title: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      // Create Browser Use Cloud session
      const browserSession = await createBrowserSession();

      // Create conversation in DB
      const conversation = await ctx.db.conversation.create({
        data: {
          userId: ctx.session.user.id,
          title: input?.title ?? null,
          browserSessionId: browserSession.id,
          browserLiveUrl: browserSession.liveUrl,
        },
      });

      return conversation;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.db.conversation.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!conversation) throw new Error("Conversation not found");
      return conversation;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.conversation.findMany({
      where: { userId: ctx.session.user.id },
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
