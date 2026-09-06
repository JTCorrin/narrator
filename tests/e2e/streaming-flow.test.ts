import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initApiClient } from "../../src/api/client";

class FakeWebSocket {
	static OPEN = 1;
	readyState = FakeWebSocket.OPEN;
	onopen: ((ev?: unknown) => void) | null = null;
	onmessage: ((ev: { data: string }) => void) | null = null;
	onerror: ((ev?: unknown) => void) | null = null;
	onclose: ((ev?: unknown) => void) | null = null;
	sent: string[] = [];
	url: string;

	constructor(url: string) {
		this.url = url;
		FakeWebSocket.instances.push(this);
		queueMicrotask(() => this.onopen?.({}));
	}

	send(data: string) {
		this.sent.push(data);
	}

	close() {
		this.onclose?.({});
	}

	emit(msg: unknown) {
		this.onmessage?.({ data: JSON.stringify(msg) });
	}

	static instances: FakeWebSocket[] = [];
	static reset() {
		FakeWebSocket.instances = [];
	}
}

vi.mock("../../src/utils/audioPlayer", () => {
	return {
		StreamingAudioPlayer: class {
			private chunks: Float32Array[] = [];
			private sampleRate = 22050;
			async addPCMChunk(data: Float32Array, sampleRate: number) {
				this.chunks.push(data);
				this.sampleRate = sampleRate;
			}
			getCollectedAudio() {
				const total = this.chunks.reduce((n, c) => n + c.length, 0);
				const out = new Float32Array(total);
				let offset = 0;
				for (const c of this.chunks) {
					out.set(c, offset);
					offset += c.length;
				}
				return out;
			}
			getSampleRate() {
				return this.sampleRate;
			}
			getRemainingPlaybackTime() {
				return 0;
			}
			stop() {}
			async destroy() {}
		},
	};
});

describe("e2e streaming flow", () => {
	const OriginalWebSocket = globalThis.WebSocket;

	beforeEach(() => {
		FakeWebSocket.reset();
		// @ts-expect-error test double
		globalThis.WebSocket = FakeWebSocket;
		initApiClient({
			apiKey: "test-key",
			baseUrl: "http://localhost:8000/api/v1",
		});
		vi.useFakeTimers();
		vi.stubGlobal("window", globalThis);
	});

	afterEach(() => {
		globalThis.WebSocket = OriginalWebSocket;
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("completes narrateTextStreaming with audio then finalComplete", async () => {
		const { narrateTextStreaming } = await import(
			"../../src/api/endpoints/narration"
		);

		const onComplete = vi.fn();
		const onError = vi.fn();
		const response = narrateTextStreaming("Hello stream", {
			voice: "Wonderstruck",
			onComplete,
			onError,
		});

		expect(response.cancel).toBeTypeOf("function");
		expect(FakeWebSocket.instances).toHaveLength(1);
		const ws = FakeWebSocket.instances[0];

		await vi.waitFor(() => expect(ws.sent).toContain("Hello stream"));

		const pcm = new Float32Array([0.1, -0.1, 0.2]);
		const bytes = new Uint8Array(pcm.buffer);
		let binary = "";
		for (const b of bytes) binary += String.fromCharCode(b);
		const b64 = Buffer.from(binary, "binary").toString("base64");

		ws.emit({
			type: "audio",
			data: b64,
			sample_rate: 22050,
		});
		ws.emit({ type: "finalComplete", total_chunks: 1 });

		await vi.advanceTimersByTimeAsync(200);
		await vi.waitFor(() => expect(onComplete).toHaveBeenCalled());
		expect(onError).not.toHaveBeenCalled();

		const wav = onComplete.mock.calls[0][0] as ArrayBuffer;
		expect(wav.byteLength).toBeGreaterThan(44);
		const header = new Uint8Array(wav.slice(0, 4));
		expect(String.fromCharCode(...header)).toBe("RIFF");
	});

	it("cancel closes websocket", async () => {
		const { narrateTextStreaming } = await import(
			"../../src/api/endpoints/narration"
		);
		const response = narrateTextStreaming("x", { voice: "Wonderstruck" });
		const ws = FakeWebSocket.instances[0];
		const closeSpy = vi.spyOn(ws, "close");
		response.cancel?.();
		expect(closeSpy).toHaveBeenCalled();
	});
	it.each(["text", "script"])("handles backend errors for %s streams exactly once", async kind => {
		const { narrateTextStreaming, narrateScriptStreaming } = await import("../../src/api/endpoints/narration");
		const onError = vi.fn();
		const onComplete = vi.fn();
		if (kind === "text") narrateTextStreaming("hello", { voice: "Wonderstruck", onError, onComplete });
		else narrateScriptStreaming("[NARRATOR] hello", "test", { defaultVoice: "Wonderstruck", onError, onComplete });
		const ws = FakeWebSocket.instances[0];
		ws.emit({ status: "error", error: "Demo request validation failed" });
		await vi.advanceTimersByTimeAsync(200);
		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "Demo request validation failed" }));
		expect(onComplete).not.toHaveBeenCalled();
	});

	it.each([
		null,
		{ type: "audio", data: 123 },
		{ type: "audio", data: "AAAAAA==", sample_rate: "24000" },
		{ type: "audio", data: "AAAAAA==", sample_rate: -1 },
		{ type: "audio", data: "invalid base64!" },
	])("rejects malformed stream data: %j", async message => {
		const { narrateTextStreaming } = await import("../../src/api/endpoints/narration");
		const onError = vi.fn();
		const onComplete = vi.fn();
		narrateTextStreaming("hello", { voice: "Wonderstruck", onError, onComplete });
		FakeWebSocket.instances[0].emit(message);
		await vi.advanceTimersByTimeAsync(200);
		expect(onError).toHaveBeenCalledOnce();
		expect(onError).toHaveBeenCalledWith(expect.any(Error));
		expect(onComplete).not.toHaveBeenCalled();
	});

	it("reports an unexpected close", async () => {
		const { narrateTextStreaming } = await import("../../src/api/endpoints/narration");
		const onError = vi.fn();
		narrateTextStreaming("hello", { voice: "Wonderstruck", onError });
		FakeWebSocket.instances[0].close();
		await vi.advanceTimersByTimeAsync(200);
		expect(onError).toHaveBeenCalledOnce();
	});

	it("does not complete or fail after cancellation of a completed download", async () => {
		const { narrateTextStreaming } = await import("../../src/api/endpoints/narration");
		const onComplete = vi.fn();
		const onError = vi.fn();
		const response = narrateTextStreaming("hello", { voice: "Wonderstruck", onComplete, onError });
		FakeWebSocket.instances[0].emit({ type: "finalComplete" });
		await vi.advanceTimersByTimeAsync(0);
		response.cancel?.();
		await vi.advanceTimersByTimeAsync(1000);
		expect(onComplete).not.toHaveBeenCalled();
		expect(onError).not.toHaveBeenCalled();
	});

	it("lets the server close after finalComplete", async () => {
		const { narrateTextStreaming } = await import("../../src/api/endpoints/narration");
		const onComplete = vi.fn();
		const onError = vi.fn();
		narrateTextStreaming("hello", { voice: "Wonderstruck", onComplete, onError });
		const ws = FakeWebSocket.instances[0];
		ws.emit({ type: "finalComplete" });
		ws.close();
		await vi.advanceTimersByTimeAsync(200);
		expect(onComplete).toHaveBeenCalledOnce();
		expect(onError).not.toHaveBeenCalled();
	});

	it("waits for paused playback to finish before saving", async () => {
		const { narrateTextStreaming } = await import("../../src/api/endpoints/narration");
		const onComplete = vi.fn();
		const response = narrateTextStreaming("hello", { voice: "Wonderstruck", onComplete });
		if (!response.player) throw new Error("Missing streaming player");
		const remaining = vi.spyOn(response.player, "getRemainingPlaybackTime").mockReturnValue(2);
		FakeWebSocket.instances[0].emit({ type: "finalComplete" });
		await vi.advanceTimersByTimeAsync(5000);
		expect(onComplete).not.toHaveBeenCalled();
		remaining.mockReturnValue(0);
		await vi.advanceTimersByTimeAsync(200);
		expect(onComplete).toHaveBeenCalledOnce();
	});

});
