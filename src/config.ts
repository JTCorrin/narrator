/** Build-time API base URL (injected by esbuild from NARRATOR_API_BASE_URL). */
declare const __NARRATOR_API_BASE_URL__: string | undefined;

export const NARRATOR_API_BASE_URL: string =
	(typeof __NARRATOR_API_BASE_URL__ === "string" && __NARRATOR_API_BASE_URL__) ||
	"https://api.obsidian-narrator.com/api/v1";

/** Public site / docs root derived from the API base (strip trailing /api/v1). */
export const NARRATOR_API_ORIGIN: string = NARRATOR_API_BASE_URL.replace(
	/\/api\/v1\/?$/,
	""
);
