import { beforeEach, describe, expect, it, vi } from "vitest";
import type NarratorPlugin from "../../src/main";
import { DEFAULT_SETTINGS } from "../../src/types";

const controls = vi.hoisted(() => ({
	rows: [] as { name: string; change?: (value: string) => Promise<void> }[],
	destroy: vi.fn(),
	previewVoice: vi.fn(),
}));

vi.mock("obsidian", () => {
	const element = () => ({ empty: vi.fn(), createDiv: () => element(), createSpan: () => element() });
	return {
		App: class {},
		PluginSettingTab: class { containerEl = element(); },
		Setting: class {
			name = "";
			descEl = element();
			change?: (value: string) => Promise<void>;
			constructor() { controls.rows.push(this); }
			setName(name: string) { this.name = name; return this; }
			setDesc() { return this; }
			addText(callback: (control: unknown) => void) { callback(this.control()); return this; }
			addDropdown(callback: (control: unknown) => void) { callback(this.control()); return this; }
			addButton(callback: (control: unknown) => void) { callback(this.control()); return this; }
			control() {
				const row = this;
				return {
					inputEl: { type: "text" },
					setPlaceholder() { return this; }, setValue() { return this; },
					setDisabled() { return this; }, addOption() { return this; },
					setIcon() { return this; }, setTooltip() { return this; },
					setButtonText() { return this; }, onClick() { return this; },
					onChange(callback: (value: string) => Promise<void>) { row.change = callback; return this; },
				};
			}
		},
	};
});
vi.mock("../../src/components/AudioPlayerSettingsControl", () => ({
	AudioPlayerSettingsControl: class {
		destroy = controls.destroy;
		previewVoice = controls.previewVoice;
	},
}));

import { App, Setting } from "obsidian";
import { NarratorSettingTab } from "../../src/settings";

describe("settings search and older-host fallback", () => {
	beforeEach(() => { controls.rows.length = 0; vi.clearAllMocks(); });

	function setup() {
		const plugin = {
			settings: { ...DEFAULT_SETTINGS }, cachedVoices: ["Wonderstruck"], cachedModels: [], saveSettings: vi.fn(),
		};
		return { plugin, tab: new NarratorSettingTab(new App(), plugin as unknown as NarratorPlugin) };
	}

	it("indexes all editable fields without starting voice playback", () => {
		const { tab } = setup();
		expect(tab.getSettingDefinitions().map(def => def.name)).toEqual([
			"Narrator API key", "Voice", "Audio output folder", "OpenRouter API key", "AI model",
		]);
		expect(controls.rows).toHaveLength(0);
		expect(controls.previewVoice).not.toHaveBeenCalled();
	});

	it("persists edits and tears down preview controls on older hosts", async () => {
		const { plugin, tab } = setup();
		tab.display();
		await controls.rows.find(row => row.name === "Audio output folder")?.change?.("Audio");
		expect(plugin.settings.audioOutputFolder).toBe("Audio");
		expect(plugin.saveSettings).toHaveBeenCalledOnce();
		tab.hide();
		expect(controls.destroy).toHaveBeenCalledOnce();
	});

	it("returns a row cleanup for the declarative renderer", () => {
		const { tab } = setup();
		const voice = tab.getSettingDefinitions().find(def => def.name === "Voice")!;
		const cleanup = voice.render(new Setting(tab.containerEl));
		expect(cleanup).toBeTypeOf("function");
		cleanup?.();
		expect(controls.destroy).toHaveBeenCalledOnce();
		expect(tab.voicePreviewPlayer).toBeNull();
	});
});
