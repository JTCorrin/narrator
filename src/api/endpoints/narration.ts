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
export async function getVoices(): Promise<string[]> {
	return ['expresso/ex01-ex02_default_001_channel1_168s.wav', 'expresso/ex01-ex02_default_001_channel2_198s.wav', 'expresso/ex01-ex02_enunciated_001_channel1_432s.wav', 'expresso/ex01-ex02_enunciated_001_channel2_354s.wav', 'expresso/ex01-ex02_fast_001_channel1_104s.wav', 'expresso/ex01-ex02_fast_001_channel2_73s.wav', 'expresso/ex01-ex02_projected_001_channel1_46s.wav', 'expresso/ex01-ex02_projected_002_channel2_248s.wav', 'expresso/ex01-ex02_whisper_001_channel1_579s.wav', 'expresso/ex01-ex02_whisper_001_channel2_717s.wav', 'expresso/ex03-ex01_angry_001_channel1_201s.wav', 'expresso/ex03-ex01_angry_001_channel2_181s.wav', 'expresso/ex03-ex01_awe_001_channel1_1323s.wav', 'expresso/ex03-ex01_awe_001_channel2_1290s.wav', 'expresso/ex03-ex01_calm_001_channel1_1143s.wav', 'expresso/ex03-ex01_calm_001_channel2_1081s.wav', 'expresso/ex03-ex01_confused_001_channel1_909s.wav', 'expresso/ex03-ex01_confused_001_channel2_816s.wav', 'expresso/ex03-ex01_desire_004_channel1_545s.wav', 'expresso/ex03-ex01_desire_004_channel2_580s.wav', 'expresso/ex03-ex01_disgusted_004_channel1_170s.wav', 'expresso/ex03-ex01_enunciated_001_channel1_388s.wav', 'expresso/ex03-ex01_enunciated_001_channel2_576s.wav', 'expresso/ex03-ex01_happy_001_channel1_334s.wav', 'expresso/ex03-ex01_happy_001_channel2_257s.wav', 'expresso/ex03-ex01_laughing_001_channel1_188s.wav', 'expresso/ex03-ex01_laughing_002_channel2_232s.wav', 'expresso/ex03-ex01_nonverbal_001_channel2_37s.wav', 'expresso/ex03-ex01_nonverbal_006_channel1_62s.wav', 'expresso/ex03-ex01_sarcastic_001_channel1_435s.wav', 'expresso/ex03-ex01_sarcastic_001_channel2_491s.wav', 'expresso/ex03-ex01_sleepy_001_channel1_619s.wav', 'expresso/ex03-ex01_sleepy_001_channel2_662s.wav', 'expresso/ex03-ex02_animal-animaldir_002_channel2_89s.wav', 'expresso/ex03-ex02_animal-animaldir_003_channel1_32s.wav', 'expresso/ex03-ex02_animaldir-animal_008_channel1_147s.wav', 'expresso/ex03-ex02_animaldir-animal_008_channel2_136s.wav', 'expresso/ex03-ex02_child-childdir_001_channel1_291s.wav', 'expresso/ex03-ex02_child-childdir_001_channel2_69s.wav', 'expresso/ex03-ex02_childdir-child_004_channel1_308s.wav', 'expresso/ex03-ex02_childdir-child_004_channel2_187s.wav', 'expresso/ex03-ex02_laughing_001_channel1_248s.wav', 'expresso/ex03-ex02_laughing_001_channel2_234s.wav', 'expresso/ex03-ex02_narration_001_channel1_674s.wav', 'expresso/ex03-ex02_narration_002_channel2_1136s.wav', 'expresso/ex03-ex02_sad-sympathetic_001_channel1_454s.wav', 'expresso/ex03-ex02_sad-sympathetic_001_channel2_400s.wav', 'expresso/ex03-ex02_sympathetic-sad_008_channel1_215s.wav', 'expresso/ex03-ex02_sympathetic-sad_008_channel2_268s.wav', 'expresso/ex04-ex01_animal-animaldir_006_channel1_196s.wav', 'expresso/ex04-ex01_animal-animaldir_006_channel2_49s.wav', 'expresso/ex04-ex01_animaldir-animal_001_channel1_118s.wav', 'expresso/ex04-ex01_animaldir-animal_004_channel2_88s.wav', 'expresso/ex04-ex01_child-childdir_003_channel2_283s.wav', 'expresso/ex04-ex01_child-childdir_004_channel1_118s.wav', 'expresso/ex04-ex01_childdir-child_001_channel1_228s.wav', 'expresso/ex04-ex01_childdir-child_001_channel2_420s.wav', 'expresso/ex04-ex01_disgusted_001_channel1_130s.wav', 'expresso/ex04-ex01_disgusted_001_channel2_325s.wav', 'expresso/ex04-ex01_laughing_001_channel1_306s.wav', 'expresso/ex04-ex01_laughing_001_channel2_293s.wav', 'expresso/ex04-ex01_narration_001_channel1_605s.wav', 'expresso/ex04-ex01_narration_001_channel2_686s.wav', 'expresso/ex04-ex01_sad-sympathetic_001_channel1_267s.wav', 'expresso/ex04-ex01_sad-sympathetic_001_channel2_346s.wav', 'expresso/ex04-ex01_sympathetic-sad_008_channel1_415s.wav', 'expresso/ex04-ex01_sympathetic-sad_008_channel2_453s.wav', 'expresso/ex04-ex02_angry_001_channel1_119s.wav', 'expresso/ex04-ex02_angry_001_channel2_150s.wav', 'expresso/ex04-ex02_awe_001_channel1_982s.wav', 'expresso/ex04-ex02_awe_001_channel2_1013s.wav', 'expresso/ex04-ex02_bored_001_channel1_254s.wav', 'expresso/ex04-ex02_bored_001_channel2_232s.wav', 'expresso/ex04-ex02_calm_001_channel2_336s.wav', 'expresso/ex04-ex02_calm_002_channel1_480s.wav', 'expresso/ex04-ex02_confused_001_channel1_499s.wav', 'expresso/ex04-ex02_confused_001_channel2_488s.wav', 'expresso/ex04-ex02_desire_001_channel1_657s.wav', 'expresso/ex04-ex02_desire_001_channel2_694s.wav', 'expresso/ex04-ex02_disgusted_001_channel2_98s.wav', 'expresso/ex04-ex02_disgusted_004_channel1_169s.wav', 'expresso/ex04-ex02_enunciated_001_channel1_496s.wav', 'expresso/ex04-ex02_enunciated_001_channel2_898s.wav', 'expresso/ex04-ex02_fearful_001_channel1_316s.wav', 'expresso/ex04-ex02_fearful_001_channel2_266s.wav', 'expresso/ex04-ex02_happy_001_channel1_118s.wav', 'expresso/ex04-ex02_happy_001_channel2_140s.wav', 'expresso/ex04-ex02_laughing_001_channel1_147s.wav', 'expresso/ex04-ex02_laughing_001_channel2_159s.wav', 'expresso/ex04-ex02_nonverbal_004_channel1_18s.wav', 'expresso/ex04-ex02_nonverbal_004_channel2_71s.wav', 'expresso/ex04-ex02_sarcastic_001_channel1_519s.wav', 'expresso/ex04-ex02_sarcastic_001_channel2_466s.wav', 'expresso/ex04-ex03_default_001_channel1_3s.wav', 'expresso/ex04-ex03_default_002_channel2_239s.wav', 'expresso/ex04-ex03_enunciated_001_channel1_86s.wav', 'expresso/ex04-ex03_enunciated_001_channel2_342s.wav', 'expresso/ex04-ex03_fast_001_channel1_208s.wav', 'expresso/ex04-ex03_fast_001_channel2_25s.wav', 'expresso/ex04-ex03_projected_001_channel1_192s.wav', 'expresso/ex04-ex03_projected_001_channel2_179s.wav', 'expresso/ex04-ex03_whisper_001_channel1_198s.wav', 'expresso/ex04-ex03_whisper_002_channel2_266s.wav', 'unmute-prod-website/default_voice.wav', 'unmute-prod-website/degaulle-2.wav', 'unmute-prod-website/developpeuse-3.wav', 'unmute-prod-website/ex04_narration_longform_00001.wav', 'unmute-prod-website/fabieng-enhanced-v2.wav', 'unmute-prod-website/p329_022.wav', 'vctk/p225_023.wav', 'vctk/p226_023.wav', 'vctk/p227_023.wav', 'vctk/p228_023.wav', 'vctk/p229_023.wav', 'vctk/p230_023.wav', 'vctk/p231_023.wav', 'vctk/p232_023.wav', 'vctk/p233_023.wav', 'vctk/p234_023.wav', 'vctk/p236_023.wav', 'vctk/p237_023.wav', 'vctk/p238_023.wav', 'vctk/p239_023.wav', 'vctk/p240_023.wav', 'vctk/p241_023.wav', 'vctk/p243_023.wav', 'vctk/p244_023.wav', 'vctk/p245_023.wav', 'vctk/p246_023.wav', 'vctk/p247_023.wav', 'vctk/p248_023.wav', 'vctk/p249_023.wav', 'vctk/p250_023.wav', 'vctk/p251_023.wav', 'vctk/p252_023.wav', 'vctk/p253_023.wav', 'vctk/p254_023.wav', 'vctk/p255_023.wav', 'vctk/p256_023.wav', 'vctk/p257_023.wav', 'vctk/p258_023.wav', 'vctk/p259_023.wav', 'vctk/p260_023.wav', 'vctk/p261_023.wav', 'vctk/p262_023.wav', 'vctk/p263_023.wav', 'vctk/p264_023.wav', 'vctk/p265_023.wav', 'vctk/p266_023.wav', 'vctk/p267_023.wav', 'vctk/p269_023.wav', 'vctk/p270_023.wav', 'vctk/p271_023.wav', 'vctk/p272_023.wav', 'vctk/p273_023.wav', 'vctk/p274_023.wav', 'vctk/p275_023.wav', 'vctk/p276_023.wav', 'vctk/p277_023.wav', 'vctk/p278_023.wav', 'vctk/p279_023.wav', 'vctk/p280_023.wav', 'vctk/p281_023.wav', 'vctk/p282_023.wav', 'vctk/p283_023.wav', 'vctk/p284_023.wav', 'vctk/p285_023.wav', 'vctk/p286_023.wav', 'vctk/p287_023.wav', 'vctk/p288_023.wav', 'vctk/p292_023.wav', 'vctk/p293_023.wav', 'vctk/p294_023.wav', 'vctk/p297_023.wav', 'vctk/p298_023.wav', 'vctk/p299_023.wav', 'vctk/p300_023.wav', 'vctk/p301_023.wav', 'vctk/p302_023.wav', 'vctk/p303_023.wav', 'vctk/p304_023.wav', 'vctk/p305_023.wav', 'vctk/p306_023.wav', 'vctk/p307_023.wav', 'vctk/p308_023.wav', 'vctk/p310_023.wav', 'vctk/p311_023.wav', 'vctk/p312_023.wav', 'vctk/p313_023.wav', 'vctk/p314_023.wav', 'vctk/p315_023.wav', 'vctk/p316_023.wav', 'vctk/p317_023.wav', 'vctk/p318_023.wav', 'vctk/p323_023.wav', 'vctk/p326_023.wav', 'vctk/p329_023.wav', 'vctk/p330_023.wav', 'vctk/p333_023.wav', 'vctk/p334_023.wav', 'vctk/p335_023.wav', 'vctk/p336_023.wav', 'vctk/p339_023.wav', 'vctk/p341_023.wav', 'vctk/p343_023.wav', 'vctk/p345_023.wav', 'vctk/p347_023.wav', 'vctk/p351_023.wav', 'vctk/p360_023.wav', 'vctk/p361_023.wav', 'vctk/p363_023.wav', 'vctk/p364_023.wav', 'vctk/p374_023.wav', 'vctk/p376_023.wav', 'vctk/s5_023.wav']
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

				} else if (msg.type === "complete") {
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

						resolve({
							audioData: wavData,
							format: "wav",
						});
					}, waitTime);

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
