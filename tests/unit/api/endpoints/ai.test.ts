import { beforeEach, describe, expect, it } from "vitest";
import { requestUrl } from "../../../mocks/obsidian";
import { initApiClient } from "../../../../src/api/client";
import { getModels } from "../../../../src/api/endpoints/ai";

describe("getModels", () => {
	beforeEach(() => {
		requestUrl.mockReset();
		initApiClient({
			apiKey: "test-key",
			baseUrl: "http://localhost:8000/api/v1",
		});
	});

	it("returns models array", async () => {
		requestUrl.mockResolvedValue({
			status: 200,
			headers: { "content-type": "application/json" },
			json: {
				models: [{ id: "openai/gpt-4o-mini" }],
				count: 1,
			},
		});
		const models = await getModels({ orApiKey: "or-key" });
		expect(models).toEqual([{ id: "openai/gpt-4o-mini" }]);
		expect(requestUrl).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({
					"x-openrouter-api-key": "or-key",
				}),
			})
		);
	});
});
