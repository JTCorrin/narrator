import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AudioPlayerSettingsControl } from "../../src/components/AudioPlayerSettingsControl";
import { apiClient } from "../../src/api";
import { initApiClient } from "../../src/api/client";
import type NarratorPlugin from "../../src/main";
import type { NarrationResponse } from "../../src/api/types";

class ElementStub {
	addClass() {}
	createEl() { return new ElementStub(); }
	createDiv() { return new ElementStub(); }
	createSpan() { return new ElementStub(); }
	querySelector() { return new ElementStub(); }
	appendChild() {}
	setText() {}
	setAttribute() {}
	addEventListener() {}
	setCssProps() {}
	empty() {}
}

beforeEach(() => { vi.stubGlobal("window", globalThis); });

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("does not start a delayed voice preview after settings close", async () => {
	let resolve!: (value: NarrationResponse) => void;
	vi.spyOn(apiClient.narration, "narrateText").mockReturnValue(new Promise(done => { resolve = done; }));
	const Audio = vi.fn();
	vi.stubGlobal("Audio", Audio);
	const plugin = { loadingIndicator: { show: vi.fn(), hide: vi.fn() } };
	const player = new AudioPlayerSettingsControl(
		new ElementStub() as unknown as HTMLElement, plugin as unknown as NarratorPlugin,
	);
	initApiClient({ apiKey: "test-key" });
	const pending = player.previewVoice("Wonderstruck");
	await Promise.resolve();
	await Promise.resolve();
	expect(apiClient.narration.narrateText).toHaveBeenCalledOnce();
	player.destroy();
	resolve({ audioData: new ArrayBuffer(8), format: "wav" });
	await pending;
	expect(Audio).not.toHaveBeenCalled();
});

it("waits before synthesis and cancels a queued preview without spending words", async () => {
	initApiClient({ apiKey: "free-key" });
	let ready!: () => void;
	const ensureReady = () => new Promise<void>(resolve => { ready = resolve; });
	const narrate = vi.spyOn(apiClient.narration, "narrateText");
	const plugin = { loadingIndicator: { show: vi.fn(), hide: vi.fn() } };
	const player = new AudioPlayerSettingsControl(new ElementStub() as unknown as HTMLElement,
		plugin as unknown as NarratorPlugin, ensureReady);
	const waiting = player.previewVoice("Guffaw");
	expect(narrate).not.toHaveBeenCalled();
	player.cancelPending(); ready(); await waiting;
	expect(narrate).not.toHaveBeenCalled();
	player.destroy();
});
