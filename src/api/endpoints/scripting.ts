import type { ScriptOptions, ScriptResponse, Character } from "../types";

/**
 * Generate a script with character breakdowns from content
 * This is currently a client-side implementation
 * Can be extended to use an AI API in the future
 */
export async function generateScript(
	content: string,
	options: ScriptOptions = {}
): Promise<ScriptResponse> {
	const { detectCharacters = true, includeNarrator = true } = options;

	let scriptContent = `# Script\n\n*Generated from original note*\n\n---\n\n`;

	if (includeNarrator) {
		scriptContent += `[NARRATOR]\n${content}\n\n---\n\n`;
	}

	scriptContent += `*Instructions:*\n`;
	scriptContent += `- Edit this script to assign dialogue to different characters\n`;
	scriptContent += `- Use tags like [NARRATOR], [CHARACTER 1], [CHARACTER 2], etc.\n`;
	scriptContent += `- Each character can be assigned a different voice when narrating\n`;

	const characters = detectCharacters
		? await parseCharacters(content)
		: [];

	return {
		content: scriptContent,
		characters: characters.map((c) => c.name),
	};
}

/**
 * Parse and extract characters from text
 * Looks for dialogue patterns and speaker attributions
 */
export async function parseCharacters(content: string): Promise<Character[]> {
	const characters: Map<string, number> = new Map();

	// Look for quoted dialogue with attribution
	// Pattern: "dialogue" said Character
	// Pattern: Character: "dialogue"
	// Pattern: Character said, "dialogue"

	const patterns = [
		/"([^"]+)"\s+(?:said|asked|replied|responded)\s+([A-Z][a-z]+)/g,
		/([A-Z][a-z]+):\s+"([^"]+)"/g,
		/([A-Z][a-z]+)\s+(?:said|asked|replied|responded),?\s+"([^"]+)"/g,
	];

	for (const pattern of patterns) {
		let match;
		while ((match = pattern.exec(content)) !== null) {
			// Character name is in different positions depending on pattern
			const characterName =
				match[2] && /^[A-Z]/.test(match[2]) ? match[2] : match[1];

			if (characterName) {
				const count = characters.get(characterName) || 0;
				characters.set(characterName, count + 1);
			}
		}
	}

	// Convert to array and sort by frequency
	return Array.from(characters.entries())
		.map(([name, lineCount]) => ({ name, lineCount }))
		.sort((a, b) => b.lineCount - a.lineCount);
}

/**
 * Validate script format
 * Checks if script follows the expected [CHARACTER] format
 */
export async function validateScript(script: string): Promise<{
	isValid: boolean;
	errors: string[];
	characters: string[];
}> {
	const errors: string[] = [];
	const characters = new Set<string>();

	// Look for character tags: [CHARACTER NAME]
	const characterTagPattern = /\[([^\]]+)\]/g;
	let hasCharacterTags = false;
	let match;

	while ((match = characterTagPattern.exec(script)) !== null) {
		hasCharacterTags = true;
		const characterName = match[1].trim();

		if (!characterName) {
			errors.push(`Empty character tag found at position ${match.index}`);
		} else {
			characters.add(characterName);
		}
	}

	if (!hasCharacterTags) {
		errors.push("No character tags found. Use [CHARACTER NAME] format.");
	}

	// Check for orphaned dialogue (text without character attribution)
	const lines = script.split("\n").filter((line) => line.trim().length > 0);
	let currentCharacter: string | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// Skip markdown headers and horizontal rules
		if (line.startsWith("#") || line === "---" || line.startsWith("*")) {
			continue;
		}

		// Check if line is a character tag
		const isCharacterTag = /^\[([^\]]+)\]$/.test(line);

		if (isCharacterTag) {
			const characterMatch = line.match(/^\[([^\]]+)\]$/);
			currentCharacter = characterMatch ? characterMatch[1] : null;
		} else if (line.length > 0 && !currentCharacter) {
			// Found dialogue without a character
			errors.push(
				`Dialogue found without character tag at line ${i + 1}: "${line.substring(0, 50)}..."`
			);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		characters: Array.from(characters),
	};
}

/**
 * Extract script metadata
 * Returns information about the script structure
 */
export async function getScriptMetadata(script: string): Promise<{
	characterCount: number;
	totalLines: number;
	charactersWithLineCounts: Record<string, number>;
}> {
	const validation = await validateScript(script);

	const charactersWithLineCounts: Record<string, number> = {};
	let currentCharacter: string | null = null;

	const lines = script.split("\n").filter((line) => line.trim().length > 0);

	for (const line of lines) {
		const trimmedLine = line.trim();

		// Skip markdown
		if (
			trimmedLine.startsWith("#") ||
			trimmedLine === "---" ||
			trimmedLine.startsWith("*")
		) {
			continue;
		}

		// Check for character tag
		const characterMatch = trimmedLine.match(/^\[([^\]]+)\]$/);
		if (characterMatch) {
			currentCharacter = characterMatch[1];
			if (!charactersWithLineCounts[currentCharacter]) {
				charactersWithLineCounts[currentCharacter] = 0;
			}
		} else if (currentCharacter && trimmedLine.length > 0) {
			charactersWithLineCounts[currentCharacter]++;
		}
	}

	return {
		characterCount: validation.characters.length,
		totalLines: Object.values(charactersWithLineCounts).reduce(
			(sum, count) => sum + count,
			0
		),
		charactersWithLineCounts,
	};
}
