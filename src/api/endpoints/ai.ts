import { apiRequest } from "../client";
import type { AIModel, ModelsOptions, ModelsResponse } from "../types";

/**
 * Get available AI models from the API
 */
export async function getModels(options: ModelsOptions): Promise<AIModel[]> {
	const response = await apiRequest<ModelsResponse>("/models", {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			...(options.orApiKey && { "x-openrouter-api-key": options.orApiKey }),
		},
	});

	return response.models;
}
