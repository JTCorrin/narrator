import { getApiBaseUrl, getApiKey } from "../client";
import { encodePcmBase64 } from "../../utils/micCapture";

export interface TranscriptionStreamOptions {
	onReady?: (sampleRate: number) => void;
	onWord?: (text: string, startTime: number) => void;
	onFinal?: (text: string) => void;
	onError?: (error: Error) => void;
}

export interface TranscriptionStreamHandle {
	/** Send one PCM float32 frame (already 24 kHz mono). */
	sendPcm: (pcm: Float32Array) => void;
	/** Stop upstream and wait for finalComplete. */
	stop: () => void;
	/** Abort without waiting for final flush. */
	cancel: () => void;
}

/**
 * Open WSS /stt/stream and proxy base64 PCM frames ↔ live words.
 */
export function startTranscriptionStream(
	options: TranscriptionStreamOptions = {}
): TranscriptionStreamHandle {
	const wsUrl = getApiBaseUrl().replace(/\/$/, "").replace(/^http/, "ws");
	const ws = new WebSocket(
		`${wsUrl}/stt/stream?api_key=${encodeURIComponent(getApiKey())}`
	);

	let settled = false;
	let ready = false;
	let stopRequested = false;
	const pendingFrames: string[] = [];

	const fail = (error: unknown) => {
		if (settled) return;
		settled = true;
		try {
			ws.close();
		} catch {
			/* ignore */
		}
		options.onError?.(
			error instanceof Error ? error : new Error(String(error))
		);
	};

	const flushPending = () => {
		while (pendingFrames.length > 0 && ready && ws.readyState === WebSocket.OPEN) {
			const data = pendingFrames.shift()!;
			ws.send(JSON.stringify({ type: "audio", data }));
		}
		if (stopRequested && ready && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({ type: "stop" }));
			stopRequested = false;
		}
	};

	ws.onopen = () => {
		/* wait for server ready status */
	};

	ws.onmessage = (event) => {
		if (settled) return;
		try {
			if (typeof event.data !== "string") {
				throw new Error("Expected a text STT message");
			}
			const msg: unknown = JSON.parse(event.data);
			if (typeof msg !== "object" || msg === null || Array.isArray(msg)) {
				throw new Error("Invalid STT message");
			}
			const message = msg as Record<string, unknown>;

			if (message.status === "error" || message.type === "error") {
				throw new Error(
					typeof message.error === "string"
						? message.error
						: "Speech-to-text failed"
				);
			}

			if (message.status === "ready") {
				ready = true;
				const sampleRate =
					typeof message.sample_rate === "number"
						? message.sample_rate
						: 24000;
				options.onReady?.(sampleRate);
				flushPending();
				return;
			}

			if (message.type === "word") {
				const text = typeof message.text === "string" ? message.text : "";
				const startTime =
					typeof message.start_time === "number" ? message.start_time : 0;
				if (text) options.onWord?.(text, startTime);
				return;
			}

			if (message.type === "finalComplete") {
				settled = true;
				const text = typeof message.text === "string" ? message.text : "";
				try {
					ws.close();
				} catch {
					/* ignore */
				}
				options.onFinal?.(text);
			}
		} catch (error) {
			fail(error);
		}
	};

	ws.onerror = () => fail(new Error("Transcription WebSocket connection failed"));
	ws.onclose = () => {
		if (!settled) {
			fail(new Error("Transcription connection closed unexpectedly"));
		}
	};

	return {
		sendPcm: (pcm: Float32Array) => {
			if (settled) return;
			const data = encodePcmBase64(pcm);
			if (ready && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "audio", data }));
			} else {
				pendingFrames.push(data);
			}
		},
		stop: () => {
			if (settled) return;
			stopRequested = true;
			flushPending();
			if (!ready) {
				/* stop will send once ready arrives */
			}
		},
		cancel: () => {
			if (settled) return;
			settled = true;
			try {
				ws.close();
			} catch {
				/* ignore */
			}
		},
	};
}
