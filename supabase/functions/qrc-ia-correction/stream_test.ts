import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { streamText } from "npm:ai";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("503 upstream is captured without SDK replay", async () => {
  let calls = 0;
  let failure: unknown;
  const provider = createOpenAICompatible({ name: "lovable", baseURL: "https://offline.invalid/v1", fetch: async () => {
    calls++;
    return new Response(JSON.stringify({ error: { message: "finished upstream 503" } }), { status: 503, headers: { "Content-Type": "application/json" } });
  } });
  const result = streamText({ model: provider("unchanged-model"), prompt: "offline test", maxRetries: 0, onError: ({ error }) => { failure = error; } });
  try { await result.text; } catch (error) { failure ??= error; }
  assert(calls === 1, "No immediate SDK retry is allowed");
  assert((failure as { statusCode?: number })?.statusCode === 503, "503 must survive the stream error path");
});

Deno.test("partial stream interruption is not successful provider completion", async () => {
  let failure: unknown;
  let calls = 0;
  const provider = createOpenAICompatible({ name: "lovable", baseURL: "https://offline.invalid/v1", fetch: async () => {
    calls++;
    let sent = false;
    return new Response(new ReadableStream({ pull(controller) {
      if (!sent) {
        sent = true;
        controller.enqueue(new TextEncoder().encode('data: {"id":"offline","object":"chat.completion.chunk","created":0,"model":"unchanged-model","choices":[{"index":0,"delta":{"content":"{\\"note\\":2}"},"finish_reason":null}]}\n\n'));
      } else controller.error(new Error("stream interrupted, billing outcome unknown"));
    } }), { headers: { "Content-Type": "text/event-stream" } });
  } });
  const result = streamText({ model: provider("unchanged-model"), prompt: "offline test", maxRetries: 0, onError: ({ error }) => { failure = error; } });
  try { await result.text; } catch (error) { failure ??= error; }
  assert(calls === 1, "An interrupted stream cannot be replayed");
  assert(Boolean(failure), "Partial text must retain an explicit stream failure");
});