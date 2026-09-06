import { beforeEach, describe, expect, it } from "vitest";
import { requestUrl } from "../mocks/obsidian";
import { initApiClient } from "../../src/api/client";
import {
	createAudioBlob,
	getVoices,
	narrateText,
} from "../../src/api/endpoints/narration";
import voicesFixture from "../fixtures/api/voices.json";

describe("e2e narrate flow", () => {
	beforeEach(() => {
		requestUrl.mockReset();
		initApiClient({
			apiKey: "test-key",
			baseUrl: "http://localhost:8000/api/v1",
		});
	});

	it("init → getVoices → narrateText → createAudioBlob", async () => {
		requestUrl
			.mockResolvedValueOnce({
				status: 200,
				headers: { "content-type": "application/json" },
				json: voicesFixture,
			})
			.mockResolvedValueOnce({
				status: 200,
				headers: { "content-type": "audio/wav" },
				arrayBuffer: new ArrayBuffer(32),
			});

		const voices = await getVoices();
		expect(voices.length).toBeGreaterThan(0);

		const narration = await narrateText("Hello from e2e", {
			voice: voices[0],
		});
		const audioData = narration.audioData;
		expect(audioData).toBeInstanceOf(ArrayBuffer);
		const blob = createAudioBlob(audioData as ArrayBuffer, "wav");
		expect(blob.type).toBe("audio/wav");
		expect(blob.size).toBe(32);
	});
});
