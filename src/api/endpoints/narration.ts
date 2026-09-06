import { requestUrl } from "obsidian";
import { apiRequest, getApiBaseUrl, getApiKey } from "../client";
import type {
	NarrationOptions,
	NarrationResponse,
	ScriptNarrationOptions
} from "../types";
import { StreamingAudioPlayer } from "../../utils/audioPlayer";
import { encodeWAV } from "../../utils/wavEncoder";

/**
 * Narrate text using the API
 */
export async function narrateText(
	text: string,
	options: NarrationOptions
): Promise<NarrationResponse> {
	const { voice } = options;

	const response = await apiRequest<ArrayBuffer>("/tts/synthesize", {
		method: "POST",
		body: JSON.stringify({
			text,
			voice
		}),
	});

	return {
		audioData: response,
		format: "wav",
	};
}

/**
 * Narrate file content
 * Alias for narrateText but can have different logic in the future
 */
export async function narrateFile(
	content: string,
	options: NarrationOptions
): Promise<NarrationResponse> {
	return narrateText(content, options);
}

/**
 * Get list of available voices
 * (This is a static list for now, could be fetched from API in the future)
 */
export async function getVoices(): Promise<string[]> {
	const { voices } = await apiRequest<{ voices: string[] }>("/tts/voices", {
		method: "GET"
	});
	return voices
}

/**
 * Download audio from URL
 * Used if the API returns a URL instead of direct audio data
 */
export async function downloadAudio(url: string): Promise<ArrayBuffer> {
	const response = await requestUrl({ url, method: "GET" });

	if (response.status >= 400) {
		throw new Error(`Failed to download audio: status ${response.status}`);
	}

	return response.arrayBuffer;
}

/**
 * Save audio data to vault
 * Helper function to save audio buffer as a file
 */
export function createAudioBlob(
	audioData: ArrayBuffer,
	format = "mp3"
): Blob {
	const mimeType = `audio/${format}`;
	return new Blob([audioData], { type: mimeType });
}

/**
 * Decode base64 string to Float32Array
 * @param base64 Base64 encoded audio data
 * @returns Float32Array PCM audio data
 */
function decodeBase64ToFloat32Array(base64: string): Float32Array {
	// Decode base64 to binary string
	const binaryString = atob(base64);

	// Create Uint8Array from binary string
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	// Convert Uint8Array buffer to Float32Array
	return new Float32Array(bytes.buffer);
}

/** Shared transport: process chunks in order and settle each stream once. */
function streamNarration(
	endpoint: string,
	payload: string,
	options: Pick<NarrationOptions, "onComplete" | "onError">
): NarrationResponse {
	const wsUrl = getApiBaseUrl().replace(/\/$/, "").replace(/^http/, "ws");
	const separator = endpoint.includes("?") ? "&" : "?";
	const ws = new WebSocket(`${wsUrl}${endpoint}${separator}api_key=${encodeURIComponent(getApiKey())}`);
	const player = new StreamingAudioPlayer();
	let settled = false;
	let receivedComplete = false;
	let timer: number | undefined;
	let queue = Promise.resolve();

	const cleanup = () => {
		window.clearTimeout(timer);
		ws.close();
		return player.destroy();
	};
	const fail = (error: unknown) => {
		if (settled) return;
		settled = true;
		void cleanup().catch(console.error);
		options.onError?.(error instanceof Error ? error : new Error(String(error)));
	};
	const finishPlayback = () => {
		if (settled) return;
		// AudioContext time stops while paused; a wall-clock deadline would truncate audio.
		if (player.getRemainingPlaybackTime() > 0) {
			timer = window.setTimeout(finishPlayback, 100);
			return;
		}
		try {
			const wav = encodeWAV(player.getCollectedAudio(), player.getSampleRate());
			settled = true;
			void cleanup().then(() => options.onComplete?.(wav)).catch((error: unknown) => options.onError?.(error instanceof Error ? error : new Error(String(error))));
		} catch (error) {
			fail(error);
		}
	};

	ws.onopen = () => { if (!settled) ws.send(payload); };
	ws.onmessage = (event) => {
		queue = queue.then(async () => {
			if (settled || receivedComplete) return;
			const data: unknown = event.data;
			if (typeof data !== "string") throw new Error("Expected a text narration message");
			const msg: unknown = JSON.parse(data);
			if (typeof msg !== "object" || msg === null || Array.isArray(msg)) {
				throw new Error("Invalid narration message");
			}
			const message = msg as Record<string, unknown>;
			if (message.type === "error" || message.status === "error") {
				throw new Error(typeof message.message === "string" ? message.message : typeof message.error === "string" ? message.error : "Streaming narration failed");
			}
			if (message.type === "audio") {
				if (typeof message.data !== "string") throw new Error("Invalid audio payload");
				const sampleRate = message.sample_rate ?? 24000;
				if (typeof sampleRate !== "number" || !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
					throw new Error("Invalid audio sample rate");
				}
				await player.addPCMChunk(decodeBase64ToFloat32Array(message.data), sampleRate);
			} else if (message.type === "finalComplete") {
				receivedComplete = true;
				timer = window.setTimeout(finishPlayback, 100);
			}
		}).catch(fail);
	};
	ws.onerror = () => fail(new Error("WebSocket connection failed"));
	ws.onclose = () => {
		// A final message may still be queued when the server closes the socket.
		void queue.then(() => {
			if (!settled && !receivedComplete) fail(new Error("Narration connection closed before completion. Please try again."));
		});
	};

	return {
		format: "wav",
		player,
		cancel: () => {
			if (settled) return;
			settled = true;
			void cleanup().catch(console.error);
		},
	};
}

export function narrateTextStreaming(text: string, options: NarrationOptions): NarrationResponse {
	return streamNarration(`/tts/stream?voice=${encodeURIComponent(options.voice)}`, text, options);
}

export function narrateScriptStreaming(
	content: string,
	filename: string,
	options: ScriptNarrationOptions
): NarrationResponse {
	return streamNarration("/tts/script/stream", JSON.stringify({
		content,
		filename,
		default_voice: options.defaultVoice,
		voices: options.voices || {},
	}), options);
}
