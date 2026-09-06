/** Build-time API base URL (injected by esbuild from NARRATOR_API_BASE_URL). */
export const NARRATOR_API_BASE_URL: string =
	process.env.NARRATOR_API_BASE_URL || "http://192.168.5.140:8000/api/v1";

/** Public site / docs root derived from the API base (strip trailing /api/v1). */
export const NARRATOR_API_ORIGIN: string = NARRATOR_API_BASE_URL.replace(
	/\/api\/v1\/?$/,
	""
);
