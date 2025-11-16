import { apiRequest, getApiBaseUrl } from "../client";
import type { NarrationOptions, NarrationResponse, VoiceType } from "../types";
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
export async function getVoices(): Promise<VoiceType[]> {
	return ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
}

/**
 * Download audio from URL
 * Used if the API returns a URL instead of direct audio data
 */
export async function downloadAudio(url: string): Promise<ArrayBuffer> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to download audio: ${response.statusText}`);
	}

	return await response.arrayBuffer();
}

/**
 * Save audio data to vault
 * Helper function to save audio buffer as a file
 */
export function createAudioBlob(
	audioData: ArrayBuffer,
	format: string = "mp3"
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

/**
 * Stream narration using WebSocket with real-time playback
 * Plays audio as chunks arrive and returns complete WAV file at the end
 */
export async function narrateTextStreaming(
	text: string,
	options: NarrationOptions
): Promise<NarrationResponse> {
	const { voice } = options;
	const baseUrl = getApiBaseUrl();

	// Convert http(s) to ws(s)
	const wsUrl = baseUrl.replace(/^http/, "ws");
	const wsEndpoint = `${wsUrl}/tts/stream?voice=${encodeURIComponent(voice)}`;

	return new Promise((resolve, reject) => {
		const ws = new WebSocket(wsEndpoint);
		const audioPlayer = new StreamingAudioPlayer();
		let chunkCount = 0;

		ws.onopen = () => {
			ws.send(text);
		};

		ws.onmessage = async (event) => {
			try {
				// Parse JSON message
				const msg = JSON.parse(event.data);

				if (msg.type === "audio") {
					// Decode base64 to Float32Array
					const audioData = decodeBase64ToFloat32Array(msg.data);
					const sampleRate = msg.sample_rate || 22050;

					// Play chunk immediately for real-time playback
					await audioPlayer.addPCMChunk(audioData, sampleRate);

					chunkCount++;
					console.log(`Played audio chunk ${chunkCount}`);

				} else if (msg.type === "complete") {
					// Get all collected audio
					const combinedAudio = audioPlayer.getCollectedAudio();
					const sampleRate = audioPlayer.getSampleRate();

					// Encode to WAV format
					const wavData = encodeWAV(combinedAudio, sampleRate);

					// Clean up
					await audioPlayer.destroy();
					ws.close();

					console.log(`Streaming complete: ${chunkCount} chunks, ${combinedAudio.length} samples`);

					resolve({
						audioData: wavData,
						format: "wav",
					});

				} else if (msg.type === "error") {
					await audioPlayer.destroy();
					ws.close();
					reject(new Error(msg.message || "Streaming TTS failed"));
				}

			} catch (error) {
				console.error("Error processing WebSocket message:", error);
				await audioPlayer.destroy();
				ws.close();
				reject(error);
			}
		};

		ws.onerror = async (error) => {
			console.error("WebSocket error:", error);
			await audioPlayer.destroy();
			ws.close();
			reject(new Error("WebSocket connection failed"));
		};

		ws.onclose = () => {
			console.log("WebSocket connection closed");
		};
	});
}
