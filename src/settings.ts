import { App, PluginSettingTab, Setting } from "obsidian";
import type NarratorPlugin from "./main";

export class NarratorSettingTab extends PluginSettingTab {
	plugin: NarratorPlugin;

	constructor(app: App, plugin: NarratorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// API Configuration Section
		containerEl.createEl("h2", { text: "API Configuration" });

		new Setting(containerEl)
			.setName("Narrator API Key")
			.setDesc("Enter your API key for the narration service")
			.addText((text) =>
				text
					.setPlaceholder("Enter your API key")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);

		// Voice Settings Section
		containerEl.createEl("h2", { text: "Voice Settings" });

		new Setting(containerEl)
			.setName("Voice")
			.setDesc("Select the voice for narration")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						alloy: "Alloy (Default)",
						echo: "Echo",
						fable: "Fable",
						onyx: "Onyx",
						nova: "Nova",
						shimmer: "Shimmer",
					})
					.setValue(this.plugin.settings.voice)
					.onChange(async (value) => {
						this.plugin.settings.voice = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Speed")
			.setDesc("Narration speed (0.25 to 4.0)")
			.addSlider((slider) =>
				slider
					.setLimits(0.25, 4.0, 0.25)
					.setValue(this.plugin.settings.speed)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.speed = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Audio Output Folder")
			.setDesc("Folder path where audio files will be saved")
			.addText((text) =>
				text
					.setPlaceholder("narration-audio")
					.setValue(this.plugin.settings.audioOutputFolder)
					.onChange(async (value) => {
						this.plugin.settings.audioOutputFolder = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
