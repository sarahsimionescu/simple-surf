import { Redis } from "@upstash/redis";
import { type LanguageModelMiddleware, simulateReadableStream } from "ai";
import { env } from "~/env";

const redis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
});

export const cacheMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",
  wrapGenerate: async ({ doGenerate, params }) => {
    const cacheKey = JSON.stringify(params);
    const cached = await redis.get(cacheKey);

    if (cached !== null) {
      return {
        ...(cached as any),
        response: {
          ...(cached as any).response,
          timestamp: (cached as any)?.response?.timestamp
            ? new Date((cached as any).response.timestamp as string)
            : undefined,
        },
      };
    }

    const result = await doGenerate();
    await redis.set(cacheKey, result);
    return result;
  },

  wrapStream: async ({ doStream, params }) => {
    const cacheKey = JSON.stringify(params);
    const cached = await redis.get(cacheKey);

    if (cached !== null) {
      const formattedChunks = (cached as any[]).map(
        (p: { type: string; timestamp?: string }) => {
          if (
            p.type === "response-metadata" &&
            "timestamp" in p &&
            p.timestamp
          ) {
            return { ...p, timestamp: new Date(p.timestamp) };
          }
          return p;
        },
      );
      return {
        stream: simulateReadableStream({
          initialDelayInMs: 0,
          chunkDelayInMs: 10,
          chunks: formattedChunks,
        }),
      };
    }

    const { stream, ...rest } = await doStream();
    const fullResponse: unknown[] = [];

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        fullResponse.push(chunk);
        controller.enqueue(chunk);
      },
      flush() {
        void redis.set(cacheKey, fullResponse);
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};
