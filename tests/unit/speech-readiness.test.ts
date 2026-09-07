import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { requestUrl } from "obsidian";
import { initApiClient } from "../../src/api/client";
import { SpeechReadiness } from "../../src/api/speechReadiness";

const monitors: SpeechReadiness[] = [];
const reply = (status: string) => ({ status: 200, json: { status } });
function monitor() {
	const notify = vi.fn(); const instance = new SpeechReadiness(notify);
	monitors.push(instance); return { instance, notify };
}
beforeEach(() => { vi.stubGlobal("window", globalThis); vi.useFakeTimers(); vi.mocked(requestUrl).mockReset(); initApiClient({ apiKey: "free-key" }); });
afterEach(async () => { monitors.splice(0).forEach(m => m.stop()); await vi.runAllTimersAsync(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("shares warming checks with preview and keeps checking only while settings are open", async () => {
	vi.mocked(requestUrl).mockResolvedValueOnce(reply("warming") as never).mockResolvedValue(reply("ready") as never);
	const { instance, notify } = monitor();
	const waiting = instance.ensureReady();
	expect(instance.ensureReady()).toBe(waiting);
	await vi.advanceTimersByTimeAsync(3000); await waiting;
	expect(requestUrl).toHaveBeenCalledTimes(2);
	expect(notify.mock.calls.some(([text]) => text.includes("Warming up"))).toBe(true);
	await vi.advanceTimersByTimeAsync(30000);
	expect(requestUrl).toHaveBeenCalledTimes(3);
	instance.stop(); await vi.advanceTimersByTimeAsync(60000);
	expect(requestUrl).toHaveBeenCalledTimes(3);
});

it("cancels a queued check and ignores a late response after settings close", async () => {
	let resolve!: (value: never) => void;
	vi.mocked(requestUrl).mockReturnValue(new Promise(done => { resolve = done; }));
	const { instance, notify } = monitor();
	const waiting = instance.ensureReady();
	const failed = expect(waiting).rejects.toThrow("Cancelled");
	instance.stop(); resolve(reply("ready") as never); await failed;
	expect(notify).toHaveBeenCalledTimes(1);
});

it("shows authentication errors and stops automatic retries", async () => {
	vi.mocked(requestUrl).mockResolvedValue({ status: 401, json: { error: { message: "Invalid API key." } } } as never);
	const { instance, notify } = monitor();
	await expect(instance.ensureReady()).rejects.toThrow("Invalid API key");
	expect(notify).toHaveBeenLastCalledWith("Invalid API key.");
	await vi.advanceTimersByTimeAsync(60000); expect(requestUrl).toHaveBeenCalledTimes(1);
});

it("bounds warmup to five minutes and permits an explicit retry", async () => {
	vi.mocked(requestUrl).mockResolvedValue(reply("warming") as never);
	const { instance } = monitor();
	const failed = expect(instance.ensureReady()).rejects.toThrow("five minutes");
	await vi.advanceTimersByTimeAsync(300000); await failed;
	vi.mocked(requestUrl).mockResolvedValue(reply("ready") as never);
	await instance.ensureReady();
});

it("bounds an unresponsive readiness request", async () => {
	vi.mocked(requestUrl).mockReturnValue(new Promise(() => undefined));
	const { instance } = monitor();
	const failed = expect(instance.ensureReady()).rejects.toThrow("timed out");
	await vi.advanceTimersByTimeAsync(15000); await failed;
});
