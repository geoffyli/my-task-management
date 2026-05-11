import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { traverseNetwork } from "./network-graph";

export function handleNetworkStream(c: Context) {
  const taskId = c.req.param("id");
  if (!taskId) {
    return c.json({ error: "Missing task ID" }, 400);
  }

  return streamSSE(c, async (stream) => {
    try {
      for await (const level of traverseNetwork(taskId)) {
        await stream.writeSSE({
          event: "level",
          data: JSON.stringify(level),
        });
      }
      await stream.writeSSE({
        event: "done",
        data: "{}",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[network] Traversal error for ${taskId}:`, message);
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ error: message }),
      });
    }
  });
}
