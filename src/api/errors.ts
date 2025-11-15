/**
 * Base error class for Narrator API errors
 */
export class NarratorApiError extends Error {
	public readonly statusCode?: number;
	public readonly type: string;
	public readonly code?: string;

	constructor(message: string, statusCode?: number, type = "api_error", code?: string) {
		super(message);
		this.name = "NarratorApiError";
		this.statusCode = statusCode;
		this.type = type;
		this.code = code;

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, NarratorApiError);
		}
	}
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends NarratorApiError {
	constructor(message = "Authentication failed. Please check your API key.") {
		super(message, 401, "authentication_error");
		this.name = "AuthenticationError";
	}
}

/**
 * Error thrown when request validation fails
 */
export class ValidationError extends NarratorApiError {
	constructor(message: string) {
		super(message, 400, "validation_error");
		this.name = "ValidationError";
	}
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends NarratorApiError {
	constructor(message = "Rate limit exceeded. Please try again later.") {
		super(message, 429, "rate_limit_error");
		this.name = "RateLimitError";
	}
}

/**
 * Error thrown when requested resource is not found
 */
export class NotFoundError extends NarratorApiError {
	constructor(message = "Requested resource not found.") {
		super(message, 404, "not_found_error");
		this.name = "NotFoundError";
	}
}
