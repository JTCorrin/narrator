import { App, PluginSettingTab, Setting } from "obsidian";
import type NarratorPlugin from "./main";
import { AudioPlayerSettingsControl } from "./components/AudioPlayerSettingsControl";

export class NarratorSettingTab extends PluginSettingTab {
	plugin: NarratorPlugin;
	voicePreviewPlayer: AudioPlayerSettingsControl | null = null;

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
			.setDesc("Enter your API key for the narration service (if required)")
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

		// Get voices from plugin (pre-loaded in background)
		const voices = this.plugin.cachedVoices;
		const voicesAvailable = voices.length > 0;

		new Setting(containerEl)
			.setName("Voice")
			.setDesc(
				voicesAvailable
					? `Select the default voice for narration (${voices.length} available)`
					: "Loading voices..."
			)
			.addDropdown((dropdown) => {
				if (voicesAvailable) {
					// Build options from loaded voices
					const options: Record<string, string> = {};
					voices.forEach((voice) => {
						// Capitalize first letter for display
						const displayName =
							voice.charAt(0).toUpperCase() + voice.slice(1);
						options[voice] = displayName;
					});

					dropdown
						.addOptions(options)
						.setValue(this.plugin.settings.voice)
						.onChange(async (value) => {
							this.plugin.settings.voice = value;
							await this.plugin.saveSettings();
						});
				} else {
					// Show loading state
					dropdown.addOption("loading", "Loading...").setDisabled(true);
				}
			});

		// Voice Preview Player
		if (voicesAvailable) {
			const playerContainer = containerEl.createEl("div");
			this.voicePreviewPlayer = new AudioPlayerSettingsControl(
				playerContainer,
				this.plugin
			);
		}

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

		// AI Configuration Section
		containerEl.createEl("h2", { text: "AI Configuration" });

		new Setting(containerEl)
			.setName("OpenRouter API Key")
			.setDesc("Enter your OpenRouter API key for AI model access")
			.addText((text) =>
				text
					.setPlaceholder("Enter your OpenRouter API key")
					.setValue(this.plugin.settings.openRouterApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openRouterApiKey = value;
						await this.plugin.saveSettings();
					})
					.inputEl.setAttribute("type", "password")
			);

		// Get models from plugin (pre-loaded in background)
		const models = this.plugin.cachedModels;
		const modelsAvailable = models.length > 0;

		new Setting(containerEl)
			.setName("AI Model")
			.setDesc(
				modelsAvailable
					? `Select the AI model for script generation (${models.length} available)`
					: "Loading models..."
			)
			.addDropdown((dropdown) => {
				if (modelsAvailable) {
					// Build options from loaded models
					const options: Record<string, string> = {};
					models.forEach((model) => {
						options[model.id] = model.name;
					});

					dropdown
						.addOptions(options)
						.setValue(this.plugin.settings.aiModel)
						.onChange(async (value) => {
							this.plugin.settings.aiModel = value;
							await this.plugin.saveSettings();
						});
				} else {
					// Show loading state
					dropdown.addOption("loading", "Loading...").setDisabled(true);
				}
			});
	}
}
