import {
	NarratorApiError,
	AuthenticationError,
	ValidationError,
	RateLimitError,
	NotFoundError
} from "./errors";
import type { ApiErrorResponse } from "./types";

/**
 * Configuration for API client
 */
interface ApiClientConfig {
	apiKey: string;
	openRouterApiKey?: string;
	baseUrl?: string;
}

let apiConfig: ApiClientConfig | null = null;

/**
 * Initialize the API client with configuration
 */
export function initApiClient(config: ApiClientConfig): void {
	apiConfig = config;
}

/**
 * Get the API base URL
 * Hardcoded to localhost for Narrator API server
 */
export function getApiBaseUrl(): string {
	return apiConfig?.baseUrl || "http://localhost:8000/api/v1";
}

/**
 * Get API key from configuration
 */
function getApiKey(): string {
	if (!apiConfig?.apiKey) {
		throw new AuthenticationError("API key not configured. Please set your API key in settings.");
	}
	return apiConfig.apiKey;
}

/**
 * Parse error response from API
 */
function parseErrorResponse(data: unknown, statusCode: number): NarratorApiError {
	const errorData = data as ApiErrorResponse;

	if (errorData?.error) {
		const { message, type, code } = errorData.error;

		// Map specific status codes to error types
		switch (statusCode) {
			case 401:
			case 403:
				return new AuthenticationError(message);
			case 400:
				return new ValidationError(message);
			case 429:
				return new RateLimitError(message);
			case 404:
				return new NotFoundError(message);
			default:
				return new NarratorApiError(message, statusCode, type, code);
		}
	}

	return new NarratorApiError(
		`API request failed with status ${statusCode}`,
		statusCode
	);
}

/**
 * Generic API request function with authentication
 */
export async function apiRequest<T = unknown>(
	endpoint: string,
	options: RequestInit = {}
): Promise<T> {
	const apiKey = getApiKey();
	const baseUrl = getApiBaseUrl();
	const url = `${baseUrl}${endpoint}`;

	const headers = new Headers(options.headers || {});
	headers.set("Content-Type", "application/json");
	headers.set("x-api-key", apiKey);

	// Add OpenRouter API key if configured
	if (apiConfig?.openRouterApiKey) {
		headers.set("x-openrouter-key", apiConfig.openRouterApiKey);
	}

	const requestOptions: RequestInit = {
		...options,
		headers,
	};

	try {
		const response = await fetch(url, requestOptions);

		// Handle non-JSON responses (like audio files)
		const contentType = response.headers.get("content-type");

		if (!response.ok) {
			// Try to parse error as JSON
			let errorData: unknown;
			try {
				errorData = await response.json();
			} catch {
				throw new NarratorApiError(
					`Request failed: ${response.statusText}`,
					response.status
				);
			}
			throw parseErrorResponse(errorData, response.status);
		}

		// Handle binary responses
		if (contentType?.includes("audio/") || contentType?.includes("application/octet-stream")) {
			return (await response.arrayBuffer()) as T;
		}

		// Handle JSON responses
		if (contentType?.includes("application/json")) {
			return await response.json();
		}

		// Handle text responses
		return (await response.text()) as T;

	} catch (error) {
		// Re-throw our custom errors
		if (error instanceof NarratorApiError) {
			throw error;
		}

		// Network or other errors
		if (error instanceof Error) {
			throw new NarratorApiError(
				`Network error: ${error.message}`,
				undefined,
				"network_error"
			);
		}

		throw new NarratorApiError("An unknown error occurred");
	}
}

/**
 * API request with validation (placeholder for future use)
 * Can be extended to use Zod or similar validation library
 */
export async function apiRequestWithValidation<T = unknown>(
	endpoint: string,
	options: RequestInit = {},
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	validator?: (data: unknown) => T
): Promise<T> {
	const response = await apiRequest<T>(endpoint, options);

	// Future: Add validation here
	// if (validator) {
	//   return validator(response);
	// }

	return response;
}
