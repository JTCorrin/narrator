import { App, PluginSettingTab, Setting } from "obsidian";
import type NarratorPlugin from "./main";
import type { AIModel } from "./api";
import { AudioPlayerSettingsControl } from "./components/AudioPlayerSettingsControl";
import { NARRATOR_API_ORIGIN } from "./config";
import { SpeechReadiness } from "./api/speechReadiness";

// Structurally compatible with Obsidian 1.13's render definitions. The same
// callbacks also render the fallback tab without invoking newer host APIs.
interface NarratorSettingDefinition {
	name: string;
	desc: string;
	render: (setting: Setting) => void | (() => void);
}

export class NarratorSettingTab extends PluginSettingTab {
	plugin: NarratorPlugin;
	voicePreviewPlayer: AudioPlayerSettingsControl | null = null;
	private readiness: SpeechReadiness | null = null;
	private restartReadiness: (() => void) | null = null;
	private cleanups: (() => void)[] = [];
	private refreshVoiceControls: (() => void) | null = null;

	constructor(app: App, plugin: NarratorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): NarratorSettingDefinition[] {
		const voices = this.plugin.cachedVoices;
		const models = this.plugin.cachedModels;
		return [
			{
				name: "Narrator API key",
				desc: "Paste your free or paid Narrator API key.",
				render: setting => {
					setting.addText(text => {
						text.setPlaceholder("Enter your API key").setValue(this.plugin.settings.apiKey)
							.onChange(async value => {
							this.readiness?.stop();
							this.voicePreviewPlayer?.cancelPending();
							this.plugin.settings.apiKey = value;
							await this.plugin.saveSettings();
							this.refreshVoiceControls?.();
							this.restartReadiness?.();
						});
						text.inputEl.type = "password";
					}).addButton(button => button.setIcon("external-link").setTooltip("Get API key")
						.onClick(() => { window.open(`${NARRATOR_API_ORIGIN}/#pricing`, "_blank"); }));
				},
			},
			{
				name: "Subscription and usage",
				desc: "Check your word allowance, manage payments, or cancel your subscription using your Narrator API key.",
				render: setting => {
					setting.addButton(button => button.setButtonText("Manage billing").onClick(() => {
						window.open(`${NARRATOR_API_ORIGIN}/billing`, "_blank");
					}));
				},
			},
			{
				name: "Speech startup",
				desc: "After inactivity, narration and transcription may take a minute or more to respond while the speech service warms up. If a request times out, wait briefly and try again.",
				render: setting => {
					const restart = () => {
						this.readiness?.stop();
						if (!this.plugin.settings.apiKey.trim()) {
							this.readiness = null;
							setting.setDesc("Enter an API key to check speech readiness.");
							return;
						}
						this.readiness = new SpeechReadiness(text => { setting.setDesc(text); });
						this.readiness.start();
					};
					this.restartReadiness = restart;
					setting.addButton(button => button.setButtonText("Retry").onClick(restart));
					setting.addButton(button => button.setButtonText("Pause checks").onClick(() => {
						this.readiness?.stop();
						this.voicePreviewPlayer?.cancelPending();
						setting.setDesc("Readiness checks paused. Click retry to resume.");
					}));
					restart();
					return () => {
						if (this.restartReadiness === restart) {
							this.readiness?.stop();
							this.readiness = null;
							this.restartReadiness = null;
						}
					};
				},
			},
			{
				name: "Voice",
				desc: voices.length ? (this.plugin.cachedVoiceAccess === "free" ? "Your free account includes 10 voices. Upgrade to unlock all voices." : `Select the default voice for narration (${voices.length} available to your account)`) : "No voices loaded. Check your connection and reload the plugin.",
				render: setting => {
					setting.addDropdown(dropdown => {
						this.refreshVoiceControls = () => {
							const available = this.plugin.cachedVoices;
							dropdown.selectEl.replaceChildren();
							dropdown.addOptions(available.length ? Object.fromEntries(available.map(v => [v, v])) : { "": "No voices available" });
							dropdown.setDisabled(!available.length).setValue(this.plugin.settings.voice);
							setting.setDesc(this.plugin.cachedVoiceAccess === "free"
								? "Your free account includes 10 voices. Upgrade to unlock all voices."
								: `${available.length} voices available to your account.`);
						};
						this.refreshVoiceControls();
						dropdown.onChange(async value => {
							this.plugin.settings.voice = value;
							await this.plugin.saveSettings();
						});
					});
					setting.addButton(button => button.setButtonText("Refresh voices").onClick(async () => {
						await this.plugin.loadVoicesAsync();
						this.refreshVoiceControls?.();
					}));
					if (this.plugin.cachedVoiceAccess === "free") {
						setting.addButton(button => button.setButtonText("Upgrade").onClick(() => {
							window.open(`${NARRATOR_API_ORIGIN}/#pricing`, "_blank");
						}));
					}
					const container = setting.descEl.createDiv({ cls: "narrator-voice-preview" });
					let fallback: SpeechReadiness | null = null;
					const player = new AudioPlayerSettingsControl(container, this.plugin, () => {
						// Settings search can render the Voice row without the startup row.
						if (this.readiness) return this.readiness.ensureReady();
						fallback ??= new SpeechReadiness(() => undefined);
						return fallback.ensureReady();
					});
					this.voicePreviewPlayer = player;
					setting.addButton(button => button.setButtonText("Preview voice").onClick(() => {
						void player.previewVoice(this.plugin.settings.voice);
					}));
					return () => {
						player.destroy();
						fallback?.stop();
						if (this.voicePreviewPlayer === player) this.voicePreviewPlayer = null;
					};
				},
			},
			{
				name: "Audio output folder",
				desc: "Folder path where audio files will be saved",
				render: setting => {
					setting.addText(text => text.setPlaceholder("Narration-audio").setValue(this.plugin.settings.audioOutputFolder)
						.onChange(async value => { this.plugin.settings.audioOutputFolder = value; await this.plugin.saveSettings(); }));
				},
			},
			{
				name: "OpenRouter API key",
				desc: "Enter your OpenRouter API key for AI model access",
				render: setting => {
					setting.addText(text => {
						text.setPlaceholder("Enter your API key").setValue(this.plugin.settings.openRouterApiKey)
							.onChange(async value => {
							this.plugin.settings.openRouterApiKey = value;
							await this.plugin.saveSettings();
						});
						text.inputEl.type = "password";
					});
				},
			},
			{
				name: "AI model",
				desc: models.length ? `Select the AI model for script generation (${models.length} available)` : "No models loaded. Check your connection and reload the plugin.",
				render: setting => {
					const details = setting.descEl.createDiv({ cls: "narrator-model-details" });
					setting.addDropdown(dropdown => {
						if (!models.length) { dropdown.addOption("", "No models available").setDisabled(true); return; }
						for (const model of models) dropdown.addOption(model.id, model.name);
						dropdown.setValue(this.plugin.settings.aiModel).onChange(async value => {
							this.plugin.settings.aiModel = value;
							await this.plugin.saveSettings();
							this.updateModelDetailsDisplay(details, models, value);
						});
					});
					this.updateModelDetailsDisplay(details, models, this.plugin.settings.aiModel);
				},
			},
		];
	}

	/** Older Obsidian versions call display; 1.13+ uses the definitions above. */
	display(): void {
		this.hide();
		this.containerEl.empty();
		for (const definition of this.getSettingDefinitions()) {
			const setting = new Setting(this.containerEl).setName(definition.name).setDesc(definition.desc);
			const cleanup = definition.render(setting);
			if (cleanup) this.cleanups.push(cleanup);
		}
	}

	hide(): void {
		this.readiness?.stop();
		this.readiness = null;
		this.restartReadiness = null;
		this.refreshVoiceControls = null;
		for (const cleanup of this.cleanups.splice(0)) cleanup();
		this.voicePreviewPlayer?.destroy();
		this.voicePreviewPlayer = null;
	}

	/**
	 * Update the model details display
	 */
	private updateModelDetailsDisplay(
		container: HTMLElement,
		models: AIModel[],
		modelId: string
	): void {
		container.empty();

		if (!modelId || models.length === 0) return;

		const selectedModel = models.find((m) => m.id === modelId);
		if (!selectedModel) return;

		// Create details container
		const detailsEl = container.createDiv({
			cls: "setting-item-description narrator-model-details-info",
		});

		// Add context length
		if (selectedModel.context_length) {
			detailsEl.createDiv({
				text: `Context Length: ${selectedModel.context_length.toLocaleString()} tokens`,
			});
		}

		// Add pricing information
		if (selectedModel.pricing) {
			const pricingEl = detailsEl.createDiv();
			const promptCost = parseFloat(selectedModel.pricing.prompt);
			const completionCost = parseFloat(selectedModel.pricing.completion);

			pricingEl.createSpan({
				text: `Pricing: $${promptCost.toFixed(6)}/1K prompt tokens, $${completionCost.toFixed(6)}/1K completion tokens`,
			});
		}

		// Add description if available
		if (selectedModel.description) {
			detailsEl.createDiv({
				text: selectedModel.description,
				cls: "mod-muted",
			});
		}
	}
}
