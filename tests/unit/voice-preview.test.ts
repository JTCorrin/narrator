import { afterEach, expect, it, vi } from "vitest";
import { AudioPlayerSettingsControl } from "../../src/components/AudioPlayerSettingsControl";
import { apiClient } from "../../src/api";
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
	const pending = player.previewVoice("Wonderstruck");
	expect(apiClient.narration.narrateText).toHaveBeenCalledOnce();
	player.destroy();
	resolve({ audioData: new ArrayBuffer(8), format: "wav" });
	await pending;
	expect(Audio).not.toHaveBeenCalled();
});
