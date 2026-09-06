import { beforeEach, describe, expect, it } from "vitest";
import { requestUrl } from "../../../mocks/obsidian";
import { initApiClient } from "../../../../src/api/client";
import {
	generateScript,
	getScriptMetadata,
	parseCharacters,
	validateScript,
} from "../../../../src/api/endpoints/scripting";
import successFixture from "../../../fixtures/api/script-format-success.json";

describe("scripting pure helpers", () => {
	it("parseCharacters finds attributed dialogue", () => {
		const chars = parseCharacters('"Hello," said Alice. Bob: "Hi there"');
		expect(chars.some((c) => c.name === "Alice" || c.name === "Bob")).toBe(true);
	});

	it("validateScript requires character tags", () => {
		const bad = validateScript("just plain text");
		expect(bad.isValid).toBe(false);

		const good = validateScript("[NARRATOR]\nOnce upon a time.");
		expect(good.isValid).toBe(true);
		expect(good.characters).toContain("NARRATOR");
	});

	it("getScriptMetadata counts lines", () => {
		const meta = getScriptMetadata(
			"[NARRATOR]\nOnce.\n[HERO]\nHi.\n[HERO]\nAgain."
		);
		expect(meta.characterCount).toBe(2);
		expect(meta.totalLines).toBe(3);
		expect(meta.charactersWithLineCounts.HERO).toBe(2);
	});
});

describe("generateScript", () => {
	beforeEach(() => {
		requestUrl.mockReset();
		initApiClient({
			apiKey: "test-key",
			baseUrl: "http://localhost:8000/api/v1",
			openRouterApiKey: "or-key",
		});
	});

	it("builds frontmatter and formatted content", async () => {
		requestUrl.mockResolvedValue({
			status: 200,
			headers: { "content-type": "application/json" },
			json: successFixture,
		});
		const result = await generateScript("Once upon a time the hero said hello.");
		expect(result.formattedText).toContain("[NARRATOR]");
		expect(result.content).toContain("narrator_script: true");
		expect(result.content).toContain("NARRATOR VOICE:");
		expect(result.content).toContain(successFixture.formatted_text);
		expect(result.characters).toEqual(["NARRATOR", "HERO"]);
	});

	it("throws when API reports failure", async () => {
		requestUrl.mockResolvedValue({
			status: 200,
			headers: { "content-type": "application/json" },
			json: { success: false, error: "nope", script: null },
		});
		await expect(generateScript("x")).rejects.toThrow(/nope|failed/i);
	});
});
