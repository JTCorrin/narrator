import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initApiClient } from "../../../../src/api/client";
import { startTranscriptionStream } from "../../../../src/api/endpoints/transcription";

class MockWebSocket {
	static OPEN = 1;
	static instances: MockWebSocket[] = [];

	readyState = MockWebSocket.OPEN;
	onopen: ((ev: unknown) => void) | null = null;
	onmessage: ((ev: { data: string }) => void) | null = null;
	onerror: (() => void) | null = null;
	onclose: (() => void) | null = null;
	sent: string[] = [];

	constructor(public url: string) {
		MockWebSocket.instances.push(this);
		queueMicrotask(() => this.onopen?.(null));
	}

	send(data: string) {
		this.sent.push(data);
	}

	close() {
		this.readyState = 3;
	}

	emit(data: unknown) {
		this.onmessage?.({ data: JSON.stringify(data) });
	}
}

describe("transcription stream client", () => {
	const OriginalWebSocket = globalThis.WebSocket;

	beforeEach(() => {
		MockWebSocket.instances = [];
		// @ts-expect-error mock
		globalThis.WebSocket = MockWebSocket;
		initApiClient({
			apiKey: "test-key",
			baseUrl: "http://localhost:8000/api/v1",
		});
	});

	afterEach(() => {
		globalThis.WebSocket = OriginalWebSocket;
	});

	it("opens STT websocket with api_key and streams words", async () => {
		const words: string[] = [];
		let finalText = "";
		const handle = startTranscriptionStream({
			onWord: (text) => words.push(text),
			onFinal: (text) => {
				finalText = text;
			},
		});

		await Promise.resolve();
		const ws = MockWebSocket.instances[0]!;
		expect(ws.url).toContain("/stt/stream?api_key=test-key");

		ws.emit({ status: "ready", sample_rate: 24000 });
		handle.sendPcm(new Float32Array([0.1, 0.2]));
		expect(ws.sent.some((s) => s.includes('"type":"audio"'))).toBe(true);

		ws.emit({ type: "word", text: "hello", start_time: 0.1 });
		ws.emit({ type: "finalComplete", text: "hello world" });

		expect(words).toEqual(["hello"]);
		expect(finalText).toBe("hello world");
	});

	it("preserves final text and reports the monthly quota notice", () => {
        let result: unknown;
        startTranscriptionStream({ onFinal: (text, message) => { result = { text, message }; } });
        MockWebSocket.instances[0]!.emit({ type: "finalComplete", text: "saved words", limit_reached: true, message: "Monthly limit reached" });
        expect(result).toEqual({ text: "saved words", message: "Monthly limit reached" });
    });

	it("queues frames until ready then sends stop", async () => {
		const handle = startTranscriptionStream();
		await Promise.resolve();
		const ws = MockWebSocket.instances[0]!;

		handle.sendPcm(new Float32Array([0.0]));
		expect(ws.sent.length).toBe(0);

		ws.emit({ status: "ready", sample_rate: 24000 });
		expect(ws.sent.length).toBe(1);

		handle.stop();
		expect(ws.sent.at(-1)).toBe(JSON.stringify({ type: "stop" }));
	});
});
