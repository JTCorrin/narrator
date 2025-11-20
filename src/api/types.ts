/**
 * Voice options for narration
 */
export type VoiceType = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

/**
 * Audio format options
 */
export type AudioFormat = "mp3" | "opus" | "aac" | "flac" | "wav";

/**
 * Options for narration requests
 */
export interface NarrationOptions {
	voice: string;
	speed?: number;
	format?: AudioFormat;
	onComplete?: (audioData: ArrayBuffer) => void; // Callback when streaming completes
	onError?: (error: Error) => void; // Callback when error occurs
}

/**
 * Options for script narration requests
 * Client extracts character voices from frontmatter and sends cleaned content
 */
export interface ScriptNarrationOptions extends Omit<NarrationOptions, 'voice'> {
	defaultVoice: string;
	voices?: Record<string, string>; // Character voice mappings: { "NARRATOR": "onyx", "IBRAHIM": "alloy" }
}

/**
 * Response from narration API
 */
export interface NarrationResponse {
	audioUrl?: string;
	audioData?: ArrayBuffer;
	duration?: number;
	format: AudioFormat;
	player?: any; // StreamingAudioPlayer instance (using any to avoid circular dependency)
	cancel?: () => void; // Function to cancel streaming
}

/**
 * Script generation options
 */
export interface ScriptOptions {
	modelName?: string;
	orApiKey?: string;
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

/**
 * AI Model pricing information
 */
export interface AIModelPricing {
	prompt: string;
	completion: string;
	request: string;
	image: string;
}

/**
 * AI Model architecture information
 */
export interface AIModelArchitecture {
	modality: string;
	input_modalities: string[];
	output_modalities: string[];
	tokenizer: string;
	instruct_type?: string;
}

/**
 * AI Model top provider information
 */
export interface AIModelTopProvider {
	context_length: number;
	max_completion_tokens: number;
	is_moderated: boolean;
}

/**
 * AI Model information
 */
export interface AIModel {
	id: string;
	name: string;
	canonical_slug?: string;
	created?: number;
	description?: string;
	pricing?: AIModelPricing;
	context_length?: number;
	max_completion_tokens?: number;
	architecture?: AIModelArchitecture;
	top_provider?: AIModelTopProvider;
	supported_parameters?: string[];
}

/**
 * Response from models API
 */
export interface ModelsResponse {
	models: AIModel[];
	count?: number;
	filters_applied?: Record<string, boolean>;
	cached?: boolean;
}
