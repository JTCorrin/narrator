import { App, PluginSettingTab, Setting } from "obsidian";
import type NarratorPlugin from "./main";
import { AudioPlayerSettingsControl } from "./components/AudioPlayerSettingsControl";

export class NarratorSettingTab extends PluginSettingTab {
	plugin: NarratorPlugin;
	voicePreviewPlayer: AudioPlayerSettingsControl | null = null;
	currentSelectedVoice: string;

	constructor(app: App, plugin: NarratorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.currentSelectedVoice = plugin.settings.voice;
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
							this.currentSelectedVoice = value;
							await this.plugin.saveSettings();
						});
				} else {
					// Show loading state
					dropdown.addOption("loading", "Loading...").setDisabled(true);
				}
			})
			.addButton((button) => {
				if (voicesAvailable) {
					button
						.setButtonText("Preview Voice")
						.onClick(async () => {
							if (this.voicePreviewPlayer) {
								await this.voicePreviewPlayer.previewVoice(
									this.currentSelectedVoice
								);
							}
						});
				} else {
					button.setButtonText("Preview Voice").setDisabled(true);
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

		// Create the AI Model dropdown setting
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
							// Update model details display
							this.updateModelDetailsDisplay(modelDetailsContainer, models, value);
						});
				} else {
					// Show loading state
					dropdown.addOption("loading", "Loading...").setDisabled(true);
				}
			});

		// Create model details container for dynamic updates (after the dropdown)
		const modelDetailsContainer = containerEl.createEl("div", {
			cls: "narrator-model-details",
		});

		// Initialize details display for currently selected model if available
		if (modelsAvailable && this.plugin.settings.aiModel) {
			this.updateModelDetailsDisplay(modelDetailsContainer, models, this.plugin.settings.aiModel);
		}
	}

	/**
	 * Update the model details display
	 */
	private updateModelDetailsDisplay(
		container: HTMLElement,
		models: any[],
		modelId: string
	): void {
		container.empty();

		if (!modelId || models.length === 0) return;

		const selectedModel = models.find((m) => m.id === modelId);
		if (!selectedModel) return;

		// Create details container
		const detailsEl = container.createEl("div", {
			cls: "setting-item-description",
		});
		detailsEl.style.marginTop = "8px";
		detailsEl.style.paddingLeft = "0";

		// Add context length
		if (selectedModel.context_length) {
			detailsEl.createEl("div", {
				text: `Context Length: ${selectedModel.context_length.toLocaleString()} tokens`,
			});
		}

		// Add pricing information
		if (selectedModel.pricing) {
			const pricingEl = detailsEl.createEl("div");
			const promptCost = parseFloat(selectedModel.pricing.prompt);
			const completionCost = parseFloat(selectedModel.pricing.completion);

			pricingEl.createEl("span", {
				text: `Pricing: $${promptCost.toFixed(6)}/1K prompt tokens, $${completionCost.toFixed(6)}/1K completion tokens`,
			});
		}

		// Add description if available
		if (selectedModel.description) {
			detailsEl.createEl("div", {
				text: selectedModel.description,
				cls: "mod-muted",
			});
		}
	}
}
