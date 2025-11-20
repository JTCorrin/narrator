import { apiRequest, getApiBaseUrl } from "../client";
import type {
	NarrationOptions,
	NarrationResponse,
	VoiceType,
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
 * Returns player instance immediately and handles streaming in background
 * Calls onComplete/onError callbacks when streaming finishes
 */
export async function narrateTextStreaming(
	text: string,
	options: NarrationOptions
): Promise<NarrationResponse> {
	const { voice, onComplete, onError } = options;
	const baseUrl = getApiBaseUrl();

	// Convert http(s) to ws(s)
	const wsUrl = baseUrl.replace(/^http/, "ws");
	const wsEndpoint = `${wsUrl}/tts/stream?voice=${encodeURIComponent(voice)}`;

	// Create player and WebSocket
	const audioPlayer = new StreamingAudioPlayer();
	const ws = new WebSocket(wsEndpoint);
	let chunkCount = 0;

	// Cancel function to stop streaming
	const cancel = () => {
		console.log("Canceling streaming narration...");
		audioPlayer.stop();
		ws.close();
	};

	// Handle WebSocket events
	ws.onopen = () => {
		ws.send(text);
		console.log("WebSocket opened, sending text for narration");
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

			} else if (msg.type === "finalComplete") {
				// Wait for all scheduled audio to finish playing
				const remainingTime = audioPlayer.getRemainingPlaybackTime();
				console.log(`Waiting ${remainingTime.toFixed(2)}s for playback to complete...`);

				// Add small buffer to ensure last chunk completes
				const waitTime = (remainingTime + 0.1) * 1000; // Convert to ms and add 100ms buffer

				setTimeout(async () => {
					// Get all collected audio
					const combinedAudio = audioPlayer.getCollectedAudio();
					const sampleRate = audioPlayer.getSampleRate();

					// Encode to WAV format
					const wavData = encodeWAV(combinedAudio, sampleRate);

					// Clean up
					await audioPlayer.destroy();
					ws.close();

					console.log(`Streaming complete: ${chunkCount} chunks, ${combinedAudio.length} samples`);

					// Call completion callback
					if (onComplete) {
						onComplete(wavData);
					}
				}, waitTime);

			} else if (msg.type === "error") {
				const error = new Error(msg.message || "Streaming TTS failed");
				console.error("Streaming error:", error);

				await audioPlayer.destroy();
				ws.close();

				// Call error callback
				if (onError) {
					onError(error);
				}
			}

		} catch (error) {
			console.error("Error processing WebSocket message:", error);
			await audioPlayer.destroy();
			ws.close();

			// Call error callback
			if (onError && error instanceof Error) {
				onError(error);
			}
		}
	};

	ws.onerror = async (error) => {
		console.error("WebSocket error:", error);
		await audioPlayer.destroy();
		ws.close();

		// Call error callback
		if (onError) {
			onError(new Error("WebSocket connection failed"));
		}
	};

	ws.onclose = () => {
		console.log("WebSocket connection closed");
	};

	// Return immediately with player instance and cancel function
	return {
		format: "wav",
		player: audioPlayer,
		cancel,
	};
}

/**
 * Stream script narration using WebSocket with real-time playback
 * Sends cleaned content and extracted character voice mappings to server
 * Returns player instance immediately and handles streaming in background
 * Calls onComplete/onError callbacks when streaming finishes
 */
export async function narrateScriptStreaming(
	content: string,
	filename: string,
	options: ScriptNarrationOptions
): Promise<NarrationResponse> {
	const { defaultVoice, voices, onComplete, onError } = options;
	const baseUrl = getApiBaseUrl();

	// Convert http(s) to ws(s)
	const wsUrl = baseUrl.replace(/^http/, "ws");
	const wsEndpoint = `${wsUrl}/tts/script/stream`;

	// Create player and WebSocket
	const audioPlayer = new StreamingAudioPlayer();
	const ws = new WebSocket(wsEndpoint);
	let chunkCount = 0;

	// Cancel function to stop streaming
	const cancel = () => {
		console.log("Canceling script narration streaming...");
		audioPlayer.stop();
		ws.close();
	};

	// Prepare request payload - send cleaned content and character voices
	const requestPayload = {
		content,
		filename,
		default_voice: defaultVoice,
		voices: voices || {}
	};

	// Handle WebSocket events
	ws.onopen = () => {
		ws.send(JSON.stringify(requestPayload));
		console.log("WebSocket opened, sending script for narration");
		console.log(`Script: ${filename} (${content.length} characters)`);
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

			} else if (msg.type === "finalComplete") {
				// Wait for all scheduled audio to finish playing
				const remainingTime = audioPlayer.getRemainingPlaybackTime();
				console.log(`Waiting ${remainingTime.toFixed(2)}s for playback to complete...`);

				// Add small buffer to ensure last chunk completes
				const waitTime = (remainingTime + 0.1) * 1000; // Convert to ms and add 100ms buffer

				setTimeout(async () => {
					// Get all collected audio
					const combinedAudio = audioPlayer.getCollectedAudio();
					const sampleRate = audioPlayer.getSampleRate();

					// Encode to WAV format
					const wavData = encodeWAV(combinedAudio, sampleRate);

					// Clean up
					await audioPlayer.destroy();
					ws.close();

					console.log(`Script streaming complete: ${chunkCount} chunks, ${combinedAudio.length} samples`);

					// Call completion callback
					if (onComplete) {
						onComplete(wavData);
					}
				}, waitTime);

			} else if (msg.type === "error") {
				const error = new Error(msg.message || "Streaming script TTS failed");
				console.error("Script streaming error:", error);

				await audioPlayer.destroy();
				ws.close();

				// Call error callback
				if (onError) {
					onError(error);
				}
			}

		} catch (error) {
			console.error("Error processing WebSocket message:", error);
			await audioPlayer.destroy();
			ws.close();

			// Call error callback
			if (onError && error instanceof Error) {
				onError(error);
			}
		}
	};

	ws.onerror = async (error) => {
		console.error("WebSocket error:", error);
		await audioPlayer.destroy();
		ws.close();

		// Call error callback
		if (onError) {
			onError(new Error("WebSocket connection failed"));
		}
	};

	ws.onclose = () => {
		console.log("WebSocket connection closed");
	};

	// Return immediately with player instance and cancel function
	return {
		format: "wav",
		player: audioPlayer,
		cancel,
	};
}
