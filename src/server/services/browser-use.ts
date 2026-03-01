import { env } from "~/env";

const BASE_URL = "https://api.browser-use.com/api/v1";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${env.BROWSER_USE_API_KEY}`,
};

export async function createBrowserSession(opts?: {
  startUrl?: string;
}) {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      startUrl: opts?.startUrl,
    }),
  });
  if (!res.ok) throw new Error(`Browser Use: failed to create session: ${res.statusText}`);
  return res.json() as Promise<{
    id: string;
    liveUrl: string;
    status: string;
  }>;
}

export async function deleteBrowserSession(sessionId: string) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`Browser Use: failed to delete session: ${res.statusText}`);
}

export async function createBrowserTask(opts: {
  sessionId: string;
  task: string;
  maxSteps?: number;
}) {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sessionId: opts.sessionId,
      task: opts.task,
      maxSteps: opts.maxSteps ?? 20,
    }),
  });
  if (!res.ok) throw new Error(`Browser Use: failed to create task: ${res.statusText}`);
  return res.json() as Promise<{ id: string; status: string }>;
}

export async function getTaskStatus(taskId: string) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/status`, {
    method: "GET",
    headers,
  });
  if (!res.ok) throw new Error(`Browser Use: failed to get task status: ${res.statusText}`);
  return res.json() as Promise<{
    id: string;
    status: string;
    output?: string;
    finished_at?: string;
  }>;
}

export async function pollTaskUntilDone(
  taskId: string,
  intervalMs = 2000,
  timeoutMs = 120000,
): Promise<{ output: string; status: string }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getTaskStatus(taskId);
    if (status.status === "finished" || status.status === "stopped") {
      return { output: status.output ?? "Task completed with no output.", status: status.status };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Browser Use: task timed out");
}

export async function pauseTask(taskId: string) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/pause`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error(`Browser Use: failed to pause task: ${res.statusText}`);
}

export async function resumeTask(taskId: string) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/resume`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error(`Browser Use: failed to resume task: ${res.statusText}`);
}
