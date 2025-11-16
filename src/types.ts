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
