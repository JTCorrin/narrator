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
	modelName?: string;
}

/**
 * Script line from API
 */
export interface ScriptLine {
	character: string;
	text: string;
	line_number: number;
}

/**
 * Script data from API
 */
export interface ScriptData {
	title?: string;
	lines: ScriptLine[];
	characters: string[];
}

/**
 * API response for script formatting
 */
export interface ScriptExtractionResult {
	filename?: string;
	success: boolean;
	script: ScriptData;
	formatted_text: string;
	error: string | null;
	processing_time?: number;
	text_length?: number;
	model_used?: string;
}

/**
 * Generated script response (for plugin use)
 */
export interface ScriptResponse {
	content: string;
	characters: string[];
	formattedText?: string;
	processingTime?: number;
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
