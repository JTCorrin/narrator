import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
	getCharacterLineCounts,
	getCleanScriptContent,
	getUniqueCharacters,
	parseScriptContent,
	validateScriptVoices,
} from "../../../src/utils/scriptParser";

const fixtures = join(__dirname, "../../fixtures/scripts");

describe("parseScriptContent", () => {
	it("parses character tags and dialogue", () => {
		const content = readFileSync(join(fixtures, "minimal-script.md"), "utf8");
		const lines = parseScriptContent(content);
		expect(lines).toEqual([
			{ character: "NARRATOR", text: "Once upon a time.", lineNumber: 1 },
			{ character: "HERO", text: "Hello!", lineNumber: 2 },
		]);
	});

	it("strips frontmatter and instruction blocks", () => {
		const content = readFileSync(join(fixtures, "with-frontmatter.md"), "utf8");
		const lines = parseScriptContent(content);
		expect(lines.map((l) => l.character)).toEqual(["NARRATOR", "HERO"]);
		expect(lines.every((l) => !l.text.includes("Instructions"))).toBe(true);
	});

	it("returns empty for empty content", () => {
		expect(parseScriptContent("")).toEqual([]);
	});
});

describe("validateScriptVoices", () => {
	it("rejects empty scripts", () => {
		const result = validateScriptVoices([], {}, "Wonderstruck");
		expect(result.isValid).toBe(false);
		expect(result.errors[0]).toMatch(/no dialogue/i);
	});

	it("warns on unmapped characters", () => {
		const lines = parseScriptContent("[HERO]\nHi");
		const result = validateScriptVoices(lines, {}, "Wonderstruck");
		expect(result.isValid).toBe(true);
		expect(result.unmappedCharacters).toContain("HERO");
		expect(result.warnings.length).toBeGreaterThan(0);
	});

	it("errors when default voice missing", () => {
		const lines = parseScriptContent("[HERO]\nHi");
		const result = validateScriptVoices(lines, { HERO: "Wonderstruck" }, "");
		expect(result.isValid).toBe(false);
	});
});

describe("helpers", () => {
	it("getUniqueCharacters sorts names", () => {
		const lines = parseScriptContent("[ZEBRA]\na\n[ALPHA]\nb");
		expect(getUniqueCharacters(lines)).toEqual(["ALPHA", "ZEBRA"]);
	});

	it("getCharacterLineCounts counts lines", () => {
		const lines = parseScriptContent("[HERO]\na\n[HERO]\nb\n[NARRATOR]\nc");
		expect(getCharacterLineCounts(lines)).toEqual({ HERO: 2, NARRATOR: 1 });
	});

	it("getCleanScriptContent removes frontmatter and instructions", () => {
		const content = readFileSync(join(fixtures, "with-frontmatter.md"), "utf8");
		const cleaned = getCleanScriptContent(content);
		expect(cleaned).not.toMatch(/^---/);
		expect(cleaned).not.toContain("Script Generation");
		expect(cleaned).toContain("[NARRATOR]");
	});
});
