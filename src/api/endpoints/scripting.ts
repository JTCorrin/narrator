import { apiRequest } from "../client";
import type { ScriptOptions, ScriptResponse, Character, ScriptExtractionResult } from "../types";

/**
 * Generate a script with character breakdowns from content using the API
 */
export async function generateScript(
	content: string,
	options: ScriptOptions = {}
): Promise<ScriptResponse> {
	const { modelName = "gpt-4o-mini" } = options;

	// Call the API to format the script
	const result = await apiRequest<ScriptExtractionResult>(
		`/script/format?text=${encodeURIComponent(content)}&model_name=${modelName}`,
		{
			method: "POST",
		}
	);

	if (!result.success) {
		throw new Error(result.error || "Script generation failed");
	}

	// Build character voice properties
	const characterVoices = result.script.characters
		.map(char => `${char} VOICE: ""`)
		.join('\n');

	// Build the script content with frontmatter properties and instructions
	const properties = `---
epoch: ${Date.now()}
model_used: "${result.model_used || modelName}"
processing_time: ${result.processing_time || 0}
${characterVoices}
---`;

	const instructions = `### Script Generation

*Instructions:*
- Read through this generated script and rectify any mistakes. The AI can make mistakes.
- In the instance where the AI has missed dialogue or even a character, use tags like [CHARACTER NAME] to add them in. Don't forget to add them into the frontmatter above and assign them a voice.
- To add or change character voices use the properties in the frontmatter above. Make sure the names match exactly. You can see a list of available voices in the plugins settings.

---
`;

	// Combine properties, instructions, and formatted script
	const scriptContent = `${properties}

${instructions}

${result.formatted_text}
`;

	return {
		content: scriptContent,
		characters: result.script.characters,
		formattedText: result.formatted_text,
		processingTime: result.processing_time,
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
