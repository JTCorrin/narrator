import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestUrl } from "../../mocks/obsidian";
import {
	apiRequest,
	getApiBaseUrl,
	getApiKey,
	initApiClient,
} from "../../../src/api/client";
import {
	AuthenticationError,
	NarratorApiError,
	NotFoundError,
	RateLimitError,
	ValidationError,
} from "../../../src/api/errors";

describe("api client", () => {
	beforeEach(() => {
		requestUrl.mockReset();
		initApiClient({
			apiKey: "test-key",
			baseUrl: "http://localhost:8000/api/v1",
		});
	});

	it("getApiKey throws when unset", () => {
		initApiClient({ apiKey: "" });
		expect(() => getApiKey()).toThrow(AuthenticationError);
	});

	it("getApiBaseUrl uses default when unset", () => {
		initApiClient({ apiKey: "k" });
		expect(getApiBaseUrl()).toBe("http://192.168.5.140:8000/api/v1");
	});

	it("returns JSON and sets auth headers", async () => {
		requestUrl.mockResolvedValue({
			status: 200,
			headers: { "content-type": "application/json" },
			json: { voices: ["a"] },
			text: "",
			arrayBuffer: new ArrayBuffer(0),
		});
		const result = await apiRequest<{ voices: string[] }>("/tts/voices");
		expect(result.voices).toEqual(["a"]);
		expect(requestUrl).toHaveBeenCalledWith(
			expect.objectContaining({
				url: "http://localhost:8000/api/v1/tts/voices",
				headers: expect.objectContaining({ "x-api-key": "test-key" }),
			})
		);
	});

	it("maps 401 to AuthenticationError", async () => {
		requestUrl.mockResolvedValue({
			status: 401,
			headers: { "content-type": "application/json" },
			json: { error: { message: "nope", type: "authentication_error" } },
		});
		await expect(apiRequest("/x")).rejects.toBeInstanceOf(AuthenticationError);
	});

	it("maps 400 to ValidationError", async () => {
		requestUrl.mockResolvedValue({
			status: 400,
			headers: { "content-type": "application/json" },
			json: { error: { message: "bad", type: "validation_error" } },
		});
		await expect(apiRequest("/x")).rejects.toBeInstanceOf(ValidationError);
	});

	it("maps 429 to RateLimitError", async () => {
		requestUrl.mockResolvedValue({
			status: 429,
			headers: { "content-type": "application/json" },
			json: { error: { message: "slow", type: "rate_limit_error" } },
		});
		await expect(apiRequest("/x")).rejects.toBeInstanceOf(RateLimitError);
	});

	it("maps 404 to NotFoundError", async () => {
		requestUrl.mockResolvedValue({
			status: 404,
			headers: { "content-type": "application/json" },
			json: { error: { message: "gone", type: "not_found_error" } },
		});
		await expect(apiRequest("/x")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("returns arrayBuffer for audio responses", async () => {
		const audio = new ArrayBuffer(8);
		requestUrl.mockResolvedValue({
			status: 200,
			headers: { "content-type": "audio/wav" },
			arrayBuffer: audio,
			json: {},
			text: "",
		});
		const result = await apiRequest<ArrayBuffer>("/tts/synthesize", {
			method: "POST",
			body: "{}",
		});
		expect(result).toBe(audio);
	});

	it("wraps network failures", async () => {
		requestUrl.mockRejectedValue(new Error("offline"));
		await expect(apiRequest("/x")).rejects.toMatchObject({
			type: "network_error",
		} satisfies Partial<NarratorApiError>);
	});

	it("invokes loading callbacks", async () => {
		const onLoadingStart = vi.fn();
		const onLoadingEnd = vi.fn();
		initApiClient({
			apiKey: "test-key",
			baseUrl: "http://localhost:8000/api/v1",
			onLoadingStart,
			onLoadingEnd,
		});
		requestUrl.mockResolvedValue({
			status: 200,
			headers: { "content-type": "application/json" },
			json: { ok: true },
		});
		await apiRequest("/ok");
		expect(onLoadingStart).toHaveBeenCalledOnce();
		expect(onLoadingEnd).toHaveBeenCalledOnce();
	});
	it("uses the backend OpenRouter header for configured keys", async () => {
		initApiClient({ apiKey: "test-key", openRouterApiKey: "or-key" });
		requestUrl.mockResolvedValue({ status: 200, headers: { "content-type": "application/json" }, json: {} });
		await apiRequest("/models");
		expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({
			headers: expect.objectContaining({ "x-openrouter-api-key": "or-key" }),
		}));
	});

});
