import { describe, expect, it, vi } from "vitest";
import {
	extractCharacterVoices,
	isScriptFile,
} from "../../../src/utils/scriptParser";

function makeFile(partial: { extension?: string; basename?: string }) {
	return {
		extension: partial.extension ?? "md",
		basename: partial.basename ?? "note",
	} as import("obsidian").TFile;
}

function makeApp(frontmatter: Record<string, unknown> | undefined) {
	return {
		metadataCache: {
			getFileCache: vi.fn(() =>
				frontmatter === undefined ? null : { frontmatter }
			),
		},
	} as unknown as import("obsidian").App;
}

describe("isScriptFile", () => {
	it("rejects non-markdown", () => {
		expect(isScriptFile(makeFile({ extension: "txt" }), makeApp({}))).toBe(false);
	});

	it("detects narrator_script frontmatter", () => {
		expect(
			isScriptFile(makeFile({}), makeApp({ narrator_script: true }))
		).toBe(true);
	});

	it("detects -script basename", () => {
		expect(
			isScriptFile(makeFile({ basename: "chapter-script" }), makeApp({}))
		).toBe(true);
	});

	it("detects VOICE properties", () => {
		expect(
			isScriptFile(makeFile({}), makeApp({ "HERO VOICE": "Wonderstruck" }))
		).toBe(true);
	});

	it("returns false when nothing matches", () => {
		expect(isScriptFile(makeFile({}), makeApp({ title: "x" }))).toBe(false);
	});
});

describe("extractCharacterVoices", () => {
	it("maps VOICE properties", () => {
		const voices = extractCharacterVoices(
			makeFile({}),
			makeApp({
				"HERO VOICE": "Wonderstruck",
				"NARRATOR VOICE": "Chronicler",
				"EMPTY VOICE": "",
				title: "ignore",
			})
		);
		expect(voices).toEqual({
			HERO: "Wonderstruck",
			NARRATOR: "Chronicler",
		});
	});

	it("returns empty without frontmatter", () => {
		expect(extractCharacterVoices(makeFile({}), makeApp(undefined))).toEqual({});
	});
});
