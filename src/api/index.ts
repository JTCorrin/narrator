import * as narration from "./endpoints/narration";
import * as scripting from "./endpoints/scripting";

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
};

/**
 * Default export for convenience
 */
export default apiClient;
