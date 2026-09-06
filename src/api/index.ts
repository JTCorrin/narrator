import * as narration from "./endpoints/narration";
import * as scripting from "./endpoints/scripting";
import * as ai from "./endpoints/ai";
import * as transcription from "./endpoints/transcription";

export { apiRequest, apiRequestWithValidation, getApiBaseUrl, initApiClient } from "./client";
export * from "./errors";
export * from "./types";

/**
 * Main API client object
 * Organized by resource type
 */
export const apiClient = {
	narration,
	scripting,
	ai,
	transcription,
};

/**
 * Default export for convenience
 */
export default apiClient;
