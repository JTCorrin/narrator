import { beforeEach, describe, expect, it } from "vitest";
import { requestUrl } from "../mocks/obsidian";
import { initApiClient } from "../../src/api/client";
import { generateScript, validateScript } from "../../src/api/endpoints/scripting";
import successFixture from "../fixtures/api/script-format-success.json";

describe("e2e script generate flow", () => {
	beforeEach(() => {
		requestUrl.mockReset();
		initApiClient({
			apiKey: "test-key",
			baseUrl: "http://localhost:8000/api/v1",
			openRouterApiKey: "or-key",
		});
	});

	it("generateScript then validate formatted script tags", async () => {
		requestUrl.mockResolvedValue({
			status: 200,
			headers: { "content-type": "application/json" },
			json: successFixture,
		});

		const generated = await generateScript(
			"Once upon a time the hero said hello."
		);
		expect(generated.content).toContain("narrator_script: true");
		expect(generated.formattedText).toContain("[NARRATOR]");

		const validation = validateScript(generated.formattedText);
		expect(validation.characters).toEqual(
			expect.arrayContaining(["NARRATOR", "HERO"])
		);
		expect(validation.characters.length).toBeGreaterThan(0);
	});
});
