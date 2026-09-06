import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "../../src/types";

describe("persisted settings", () => {
	it.each([null, [], "invalid", 42])("uses defaults for corrupt data: %j", value => {
		expect(parseSettings(value)).toEqual(DEFAULT_SETTINGS);
	});

	it("preserves valid saved values and rejects invalid fields", () => {
		expect(parseSettings({ apiKey: "saved-key", voice: "Wonderstruck", audioOutputFolder: 7, speed: NaN }))
			.toEqual({ ...DEFAULT_SETTINGS, apiKey: "saved-key", voice: "Wonderstruck" });
		expect(parseSettings({ speed: 1.5 }).speed).toBe(1.5);
	});
});
