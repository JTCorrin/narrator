import { requestUrl } from "obsidian";
import { getApiBaseUrl, getApiKey } from "./client";

export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
	return new Promise((resolve, reject) => {
		const abort = () => reject(new Error("Cancelled"));
		if (signal.aborted) { abort(); return; }
		signal.addEventListener("abort", abort, { once: true });
		promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
	});
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const abort = () => { window.clearTimeout(timer); reject(new Error("Cancelled")); };
		const timer = window.setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
		if (signal.aborted) abort();
		else signal.addEventListener("abort", abort, { once: true });
	});
}

async function check(signal: AbortSignal): Promise<"ready" | "warming"> {
	const apiKey = getApiKey();
	let timer: number | undefined;
	try {
		const response = await abortable(Promise.race([
			requestUrl({ url: `${getApiBaseUrl()}/speech/ready?model=tts`, method: "POST",
				headers: { "x-api-key": apiKey }, throw: false }),
			new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error("Readiness check timed out. Click retry.")), 15000); }),
		]), signal);
		if (getApiKey() !== apiKey) throw new Error("API key changed. Retry the readiness check.");
		const data = response.json as { status?: string; detail?: string; error?: { message?: string } };
		if (response.status !== 200) throw new Error(data?.error?.message || data?.detail || `Speech service returned ${response.status}. Check your API key and retry.`);
		if (data.status !== "ready" && data.status !== "warming") throw new Error("Invalid speech readiness response. Click retry.");
		return data.status;
	} finally { if (timer) window.clearTimeout(timer); }
}

/** One shared check for the settings status and queued preview. No polling after disposal. */
export class SpeechReadiness {
	private controller = new AbortController();
	private pending: Promise<void> | null = null;
	private timer: number | undefined;

	constructor(private notify: (text: string) => void) {}

	start(): void { void this.ensureReady().catch(() => { /* status displays errors */ }); }

	ensureReady(): Promise<void> {
		if (this.controller.signal.aborted) return Promise.reject(new Error("Readiness checks are paused. Click retry in Speech startup."));
		if (this.pending) return this.pending;
		if (this.timer) window.clearTimeout(this.timer);
		const signal = this.controller.signal;
		this.pending = (async () => {
			this.notify("Checking speech service…");
			const deadline = Date.now() + 300000;
			while (!signal.aborted) {
				if (await check(signal) === "ready") {
					this.notify("Speech service ready. You can preview a voice.");
					return;
				}
				if (Date.now() >= deadline) throw new Error("The speech service is still warming up after five minutes. Click retry.");
				this.notify("Warming up the speech service… This may take a minute or more. Preview will wait until ready.");
				await delay(3000, signal);
			}
		})().then(() => {
			if (!signal.aborted) this.timer = window.setTimeout(() => this.start(), 30000);
		}).catch((error: unknown) => {
			if (!signal.aborted) this.notify(error instanceof Error ? error.message : "Unable to check speech readiness. Click retry.");
			throw error;
		}).finally(() => { this.pending = null; });
		return this.pending;
	}

	stop(): void {
		this.controller.abort();
		if (this.timer) window.clearTimeout(this.timer);
	}
}
