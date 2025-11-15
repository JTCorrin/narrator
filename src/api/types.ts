/**
 * Voice options for narration
 */
export type VoiceType = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

/**
 * Audio format options
 */
export type AudioFormat = "mp3" | "opus" | "aac" | "flac";

/**
 * Options for narration requests
 */
export interface NarrationOptions {
	voice: VoiceType;
	speed?: number;
	format?: AudioFormat;
}

/**
 * Response from narration API
 */
export interface NarrationResponse {
	audioUrl?: string;
	audioData?: ArrayBuffer;
	duration?: number;
	format: AudioFormat;
}

/**
 * Script generation options
 */
export interface ScriptOptions {
	detectCharacters?: boolean;
	includeNarrator?: boolean;
}

/**
 * Generated script response
 */
export interface ScriptResponse {
	content: string;
	characters: string[];
}

/**
 * Character information
 */
export interface Character {
	name: string;
	lineCount: number;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
	error: {
		message: string;
		type: string;
		code?: string;
	};
}
