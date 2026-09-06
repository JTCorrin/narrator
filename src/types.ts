export interface NarratorSettings {
	apiKey: string;
	voice: string;
	speed: number;
	audioOutputFolder: string;
	openRouterApiKey: string;
	aiModel: string;
}

export const DEFAULT_SETTINGS: NarratorSettings = {
	apiKey: "",
	voice: "alloy",
	speed: 1.0,
	audioOutputFolder: "narration-audio",
	openRouterApiKey: "",
	aiModel: "",
};

/** Validate persisted data before merging it with defaults. */
export function parseSettings(value: unknown): NarratorSettings {
	const settings = { ...DEFAULT_SETTINGS };
	if (typeof value !== "object" || value === null || Array.isArray(value)) return settings;
	const saved = value as Record<string, unknown>;
	for (const key of ["apiKey", "voice", "audioOutputFolder", "openRouterApiKey", "aiModel"] as const) {
		if (typeof saved[key] === "string") settings[key] = saved[key];
	}
	if (typeof saved.speed === "number" && Number.isFinite(saved.speed) && saved.speed >= 0.25 && saved.speed <= 4) {
		settings.speed = saved.speed;
	}
	return settings;
}
