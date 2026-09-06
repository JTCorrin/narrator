import { beforeEach, describe, expect, it } from "vitest";
import { requestUrl } from "../../../mocks/obsidian";
import { initApiClient } from "../../../../src/api/client";
import {
	createAudioBlob,
	getVoices,
	narrateText,
} from "../../../../src/api/endpoints/narration";
import voicesFixture from "../../../fixtures/api/voices.json";

describe("narration endpoints", () => {
	beforeEach(() => {
		requestUrl.mockReset();
		initApiClient({
			apiKey: "test-key",
			baseUrl: "http://localhost:8000/api/v1",
		});
	});

	it("getVoices extracts voices array", async () => {
		requestUrl.mockResolvedValue({
			status: 200,
			headers: { "content-type": "application/json" },
			json: voicesFixture,
		});
		await expect(getVoices()).resolves.toEqual(voicesFixture.voices);
	});

	it("narrateText posts text and voice and returns wav buffer", async () => {
		const audio = new ArrayBuffer(16);
		requestUrl.mockResolvedValue({
			status: 200,
			headers: { "content-type": "audio/wav" },
			arrayBuffer: audio,
		});
		const result = await narrateText("Hello", { voice: "Wonderstruck" });
		expect(result.format).toBe("wav");
		expect(result.audioData).toBe(audio);
		expect(requestUrl).toHaveBeenCalledWith(
			expect.objectContaining({
				method: "POST",
				url: "http://localhost:8000/api/v1/tts/synthesize",
				body: JSON.stringify({ text: "Hello", voice: "Wonderstruck" }),
			})
		);
	});

	it("createAudioBlob sets mime type", () => {
		const blob = createAudioBlob(new ArrayBuffer(4), "wav");
		expect(blob.type).toBe("audio/wav");
		expect(blob.size).toBe(4);
	});
});
