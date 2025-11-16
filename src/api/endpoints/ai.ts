import { apiRequest } from "../client";
import type { AIModel, ModelsResponse } from "../types";

/**
 * Get available AI models from the API
 */
export async function getModels(): Promise<AIModel[]> {
	const response = await apiRequest<ModelsResponse>("/ai/models", {
		method: "GET",
	});

	return response.models;
}
