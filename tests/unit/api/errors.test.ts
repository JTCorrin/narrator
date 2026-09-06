import { describe, expect, it } from "vitest";
import {
	AuthenticationError,
	NarratorApiError,
	NotFoundError,
	RateLimitError,
	ValidationError,
} from "../../../src/api/errors";

describe("API errors", () => {
	it("NarratorApiError carries status and type", () => {
		const err = new NarratorApiError("boom", 500, "server_error", "E1");
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe("NarratorApiError");
		expect(err.statusCode).toBe(500);
		expect(err.type).toBe("server_error");
		expect(err.code).toBe("E1");
	});

	it("AuthenticationError defaults to 401", () => {
		const err = new AuthenticationError();
		expect(err).toBeInstanceOf(NarratorApiError);
		expect(err.statusCode).toBe(401);
		expect(err.name).toBe("AuthenticationError");
	});

	it("ValidationError is 400", () => {
		expect(new ValidationError("bad").statusCode).toBe(400);
	});

	it("RateLimitError is 429", () => {
		expect(new RateLimitError().statusCode).toBe(429);
	});

	it("NotFoundError is 404", () => {
		expect(new NotFoundError().statusCode).toBe(404);
	});
});
