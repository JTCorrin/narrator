import { App, TFile } from "obsidian";

/**
 * Script line with character attribution
 */
export interface ScriptLine {
	character: string;
	text: string;
	lineNumber: number;
}

/**
 * Character to voice mapping
 */
export interface CharacterVoiceMap {
	[characterName: string]: string;
}

/**
 * Script validation result
 */
export interface ScriptValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	unmappedCharacters: string[];
}

/**
 * Check if a file is a narrator script
 * @param file The file to check
 * @param app The Obsidian app instance
 * @returns true if the file is a narrator script
 */
export function isScriptFile(file: TFile, app: App): boolean {
	if (file.extension !== "md") {
		return false;
	}

	// Check frontmatter for narrator_script flag
	const cache = app.metadataCache.getFileCache(file);
	const frontmatter = cache?.frontmatter;

	if (frontmatter?.narrator_script === true) {
		return true;
	}

	// Fallback: check filename ends with "-script"
	if (file.basename.endsWith("-script")) {
		return true;
	}

	// Additional check: look for character voice properties
	if (frontmatter) {
		const hasCharacterVoices = Object.keys(frontmatter).some((key) =>
			key.endsWith(" VOICE")
		);
		if (hasCharacterVoices) {
			return true;
		}
	}

	return false;
}

/**
 * Extract character voice mappings from script frontmatter
 * @param file The script file
 * @param app The Obsidian app instance
 * @returns Character to voice mapping
 */
export function extractCharacterVoices(
	file: TFile,
	app: App
): CharacterVoiceMap {
	const cache = app.metadataCache.getFileCache(file);
	const frontmatter = cache?.frontmatter;
	const voices: CharacterVoiceMap = {};

	if (!frontmatter) {
		return voices;
	}

	// Extract all properties ending with " VOICE"
	for (const [key, value] of Object.entries(frontmatter)) {
		if (key.endsWith(" VOICE")) {
			const characterName = key.replace(" VOICE", "");
			// Only add if voice is assigned (not empty string)
			if (value && typeof value === "string" && value.trim() !== "") {
				voices[characterName] = value.trim();
			}
		}
	}

	return voices;
}

/**
 * Parse script content into structured lines with character attribution
 * @param content The script content (including frontmatter)
 * @returns Array of script lines
 */
export function parseScriptContent(content: string): ScriptLine[] {
	const lines: ScriptLine[] = [];
	let currentCharacter: string | null = null;
	let lineNumber = 0;

	// Remove frontmatter section (everything between first --- and second ---)
	const frontmatterEndMatch = content.match(/^---\n.*?\n---\n/s);
	const contentWithoutFrontmatter = frontmatterEndMatch
		? content.slice(frontmatterEndMatch[0].length)
		: content;

	// Split into lines and process
	for (const line of contentWithoutFrontmatter.split("\n")) {
		const trimmed = line.trim();

		// Skip empty lines
		if (!trimmed) {
			continue;
		}

		// Skip markdown headers
		if (trimmed.startsWith("#")) {
			continue;
		}

		// Skip horizontal rules
		if (trimmed === "---") {
			continue;
		}

		// Skip instruction blocks (italic text)
		if (trimmed.startsWith("*") && trimmed.endsWith("*")) {
			continue;
		}

		// Check for character tag: [CHARACTER NAME]
		const characterMatch = trimmed.match(/^\[([^\]]+)\]$/);
		if (characterMatch) {
			currentCharacter = characterMatch[1].trim();
			continue;
		}

		// If we have a current character and non-empty text, add as dialogue line
		if (currentCharacter && trimmed.length > 0) {
			lines.push({
				character: currentCharacter,
				text: trimmed,
				lineNumber: ++lineNumber,
			});
		}
	}

	return lines;
}

/**
 * Validate script voices and character mappings
 * @param scriptLines Parsed script lines
 * @param voiceMap Character to voice mapping from frontmatter
 * @param defaultVoice Fallback voice for unmapped characters
 * @returns Validation result with errors and warnings
 */
export function validateScriptVoices(
	scriptLines: ScriptLine[],
	voiceMap: CharacterVoiceMap,
	defaultVoice: string
): ScriptValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const unmappedCharacters: string[] = [];

	// Check if there are any lines
	if (scriptLines.length === 0) {
		errors.push("Script contains no dialogue lines");
		return { isValid: false, errors, warnings, unmappedCharacters };
	}

	// Get unique characters from script
	const charactersInScript = new Set<string>();
	for (const line of scriptLines) {
		charactersInScript.add(line.character);
	}

	// Check each character has a voice mapping
	for (const character of charactersInScript) {
		if (!voiceMap[character]) {
			unmappedCharacters.push(character);
		}
	}

	// Generate warnings for unmapped characters
	if (unmappedCharacters.length > 0) {
		warnings.push(
			`${unmappedCharacters.length} character(s) have no voice assignment: ${unmappedCharacters.join(", ")}`
		);
		warnings.push(`These characters will use the default voice: ${defaultVoice}`);
	}

	// Check if default voice is set
	if (!defaultVoice || defaultVoice.trim() === "") {
		errors.push("No default voice configured in settings");
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		unmappedCharacters,
	};
}

/**
 * Get all unique characters from script lines
 * @param scriptLines Parsed script lines
 * @returns Array of unique character names
 */
export function getUniqueCharacters(scriptLines: ScriptLine[]): string[] {
	const characters = new Set<string>();
	for (const line of scriptLines) {
		characters.add(line.character);
	}
	return Array.from(characters).sort();
}

/**
 * Get character line counts from script
 * @param scriptLines Parsed script lines
 * @returns Record mapping character names to line counts
 */
export function getCharacterLineCounts(
	scriptLines: ScriptLine[]
): Record<string, number> {
	const counts: Record<string, number> = {};

	for (const line of scriptLines) {
		counts[line.character] = (counts[line.character] || 0) + 1;
	}

	return counts;
}

/**
 * Get clean script content by removing frontmatter and instruction sections
 * @param content Raw script content with frontmatter
 * @returns Cleaned content with only character tags and dialogue
 */
export function getCleanScriptContent(content: string): string {
	// Remove frontmatter (everything between first --- and second ---)
	let cleaned = content.replace(/^---\n[\s\S]*?\n---\n*/m, '');

	// Remove the instruction section (### Script Generation through the final ---)
	cleaned = cleaned.replace(/### Script Generation[\s\S]*?---\n*/m, '');

	// Trim extra whitespace
	return cleaned.trim();
}
