import { apiRequest } from "../client";
import type { NarrationOptions, NarrationResponse, VoiceType } from "../types";

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
