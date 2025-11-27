import { Notice, Plugin, TFile, Editor, MarkdownView, Menu } from "obsidian";
import { NarratorSettingTab } from "./settings";
import { NarratorSettings, DEFAULT_SETTINGS } from "./types";
import { initApiClient, apiClient, NarratorApiError, VoiceType, AIModel } from "./api";
import { AudioPlayerStatusBar } from "./components/AudioPlayerStatusBar";
import { LoadingIndicator } from "./components/LoadingIndicator";
import { isScriptFile, extractCharacterVoices, getCleanScriptContent } from "./utils/scriptParser";

export default class NarratorPlugin extends Plugin {
	settings!: NarratorSettings;
	cachedVoices: string[] = [];
	cachedModels: AIModel[] = [];
	statusBarPlayer: AudioPlayerStatusBar | null = null;
	loadingIndicator: LoadingIndicator | null = null;

	async onload() {
		console.log("Loading Narrator plugin");

		// Load saved settings
		await this.loadSettings();

		// Initialize status bar components
		this.initializeStatusBar();
		this.initializeLoadingIndicator();

		// Initialize API client with settings and loading callbacks
		initApiClient({
			baseUrl: "https://narrator-api-production-81e4.up.railway.app/api/v1",
			apiKey: this.settings.apiKey,
			openRouterApiKey: this.settings.openRouterApiKey,
			onLoadingStart: () => this.loadingIndicator?.show(),
			onLoadingEnd: () => this.loadingIndicator?.hide(),
		});

		// Register settings tab
		this.addSettingTab(new NarratorSettingTab(this.app, this));

		// Load voices and models asynchronously after workspace is ready
		if (this.app.workspace.layoutReady) {
			this.loadVoicesAsync();
			this.loadModelsAsync();
		} else {
			this.app.workspace.onLayoutReady(() => {
				this.loadVoicesAsync();
				this.loadModelsAsync();
			});
		}

		// Register context menu events
		this.registerWorkspaceEvents();

		// Add commands to command palette
		this.addCommands();
	}

	onunload() {
		console.log("Unloading Narrator plugin");

		// Clean up status bar components
		if (this.statusBarPlayer) {
			this.statusBarPlayer.destroy();
		}
		if (this.loadingIndicator) {
			this.loadingIndicator.destroy();
		}
	}

	private registerWorkspaceEvents() {
		// File menu context: Conditional menu items based on file type
		this.registerEvent(
			// @ts-ignore - file-menu is a valid event type
			this.app.workspace.on("file-menu", (menu: Menu, file: TFile) => {
				// Only add menu items for markdown files
				if (file.extension === "md") {
					// Check if this is a script file
					if (isScriptFile(file, this.app)) {
						// Script-specific menu: "Narrate Script"
						menu.addItem((item) => {
							item
								.setTitle("Narrate Script")
								.setIcon("users") // Multi-character icon
								.onClick(async () => {
									await this.narrateScript(file);
								});
						});
					} else {
						// Regular file menus: "Narrate" and "Create Script"
						menu.addItem((item) => {
							item
								.setTitle("Narrate")
								.setIcon("volume-2")
								.onClick(async () => {
									await this.narrateFile(file);
								});
						});

						menu.addItem((item) => {
							item
								.setTitle("Create Script")
								.setIcon("file-text")
								.onClick(async () => {
									await this.createScript(file);
								});
						});
					}
				}
			})
		);

		// Editor menu context: "Narrate" selected text
		this.registerEvent(
			// @ts-ignore - editor-menu is a valid event type
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
				const selectedText = editor.getSelection();

				// Only show if text is selected
				if (selectedText) {
					menu.addItem((item) => {
						item
							.setTitle("Narrate Selection")
							.setIcon("volume-2")
							.onClick(async () => {
								await this.narrateText(selectedText, view.file);
							});
					});
				}
			})
		);
	}

	private initializeStatusBar() {
		const statusBarContainer = this.addStatusBarItem();
		this.statusBarPlayer = new AudioPlayerStatusBar(statusBarContainer, this);
		console.log("Audio player status bar initialized");
	}

	private initializeLoadingIndicator() {
		const loadingContainer = this.addStatusBarItem();
		this.loadingIndicator = new LoadingIndicator(loadingContainer);
		console.log("Loading indicator initialized");
	}

	private addCommands() {
		// Command palette command for narrating active note (only for non-scripts)
		this.addCommand({
			id: "narrate-active-note",
			name: "Narrate active note",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file && file.extension === "md" && !isScriptFile(file, this.app)) {
					if (!checking) {
						this.narrateFile(file);
					}
					return true;
				}
				return false;
			},
		});

		// Command palette command for creating script from active note (only for non-scripts)
		this.addCommand({
			id: "create-script-from-note",
			name: "Create script from active note",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file && file.extension === "md" && !isScriptFile(file, this.app)) {
					if (!checking) {
						this.createScript(file);
					}
					return true;
				}
				return false;
			},
		});

		// Command palette command for narrating script (only for scripts)
		this.addCommand({
			id: "narrate-script",
			name: "Narrate script",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file && file.extension === "md" && isScriptFile(file, this.app)) {
					if (!checking) {
						this.narrateScript(file);
					}
					return true;
				}
				return false;
			},
		});
	}

	/**
	 * Narrate the full contents of a file
	 */
	private async narrateFile(file: TFile) {
		try {
			const content = await this.app.vault.read(file);

			new Notice(`Streaming narration: ${file.basename}`);

			// Use WebSocket streaming for real-time playback
			const response = await apiClient.narration.narrateTextStreaming(content, {
				voice: this.settings.voice as any,
				onComplete: async (audioData: ArrayBuffer) => {
					// Save audio file
					await this.saveAudioFile(
						audioData,
						file.basename,
						"wav"
					);
					new Notice(`Narration complete! Audio saved to ${this.settings.audioOutputFolder}/`);

					// Detach player from status bar
					this.statusBarPlayer?.detachPlayer();
				},
				onError: (error: Error) => {
					this.handleError(error, "Error narrating file");
					this.statusBarPlayer?.detachPlayer();
				}
			});

			// Connect player to status bar
			if (response.player && response.cancel && this.statusBarPlayer) {
				this.statusBarPlayer.attachPlayer(response.player, response.cancel);
			}

		} catch (error) {
			this.handleError(error, "Error narrating file");
		}
	}

	/**
	 * Narrate selected text
	 */
	private async narrateText(text: string, file: TFile | null) {
		try {
			new Notice("Streaming narration...");

			// Use WebSocket streaming for real-time playback
			const response = await apiClient.narration.narrateTextStreaming(text, {
				voice: this.settings.voice as any,
				onComplete: async (audioData: ArrayBuffer) => {
					// Save audio file
					const filename = file ? `${file.basename}-selection` : "selection";
					await this.saveAudioFile(
						audioData,
						filename,
						"wav"
					);
					new Notice(`Narration complete! Audio saved to ${this.settings.audioOutputFolder}/`);

					// Detach player from status bar
					this.statusBarPlayer?.detachPlayer();
				},
				onError: (error: Error) => {
					this.handleError(error, "Error narrating text");
					this.statusBarPlayer?.detachPlayer();
				}
			});

			// Connect player to status bar
			if (response.player && response.cancel && this.statusBarPlayer) {
				this.statusBarPlayer.attachPlayer(response.player, response.cancel);
			}

		} catch (error) {
			this.handleError(error, "Error narrating text");
		}
	}

	/**
	 * Create a script file with character breakdowns
	 */
	private async createScript(file: TFile) {
		try {
			const content = await this.app.vault.read(file);

			new Notice(`Creating script from: ${file.basename}`);

			// Generate script using API client with selected model
			const scriptResponse = await apiClient.scripting.generateScript(content, {
				modelName: this.settings.aiModel || "gpt-4o-mini",
				orApiKey: this.settings.openRouterApiKey,
			});

			// Create sibling file with "-script" suffix
			const scriptPath = file.path.replace(/\.md$/, "-script.md");

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(scriptPath);
			if (existingFile) {
				new Notice(`Script file already exists: ${scriptPath}`);
				return;
			}

			await this.app.vault.create(scriptPath, scriptResponse.content);
			new Notice(
				`Script created with ${scriptResponse.characters.length} characters: ${scriptPath}`
			);

			// Open the newly created script file
			const newFile = this.app.vault.getAbstractFileByPath(scriptPath);
			if (newFile instanceof TFile) {
				await this.app.workspace.getLeaf().openFile(newFile);
			}

		} catch (error) {
			this.handleError(error, "Error creating script");
		}
	}

	/**
	 * Narrate a script with multi-character voice support
	 * Extracts character voices from frontmatter and sends cleaned content to server
	 */
	private async narrateScript(file: TFile) {
		try {
			// Check if file is a script
			if (!isScriptFile(file, this.app)) {
				new Notice("This file is not a narrator script");
				return;
			}

			// Read raw file content (includes frontmatter)
			const rawContent = await this.app.vault.read(file);

			// Extract character voices from frontmatter
			const characterVoices = extractCharacterVoices(file, this.app);

			// Get clean content (remove frontmatter and instructions)
			const cleanContent = getCleanScriptContent(rawContent);

			new Notice(`Streaming script narration: ${file.basename}`);
			console.log(
				`Script: ${file.basename}, ${Object.keys(characterVoices).length} character voices`
			);

			// Use WebSocket streaming for real-time playback
			const response = await apiClient.narration.narrateScriptStreaming(
				cleanContent,
				file.basename,
				{
					defaultVoice: this.settings.voice,
					voices: characterVoices,
					onComplete: async (audioData: ArrayBuffer) => {
						// Save audio file
						await this.saveAudioFile(audioData, `${file.basename}-scripted`, "wav");
						new Notice(
							`Script narration complete! Audio saved to ${this.settings.audioOutputFolder}/`
						);

						// Detach player from status bar
						this.statusBarPlayer?.detachPlayer();
					},
					onError: (error: Error) => {
						this.handleError(error, "Error narrating script");
						this.statusBarPlayer?.detachPlayer();
					},
				}
			);

			// Connect player to status bar
			if (response.player && response.cancel && this.statusBarPlayer) {
				this.statusBarPlayer.attachPlayer(response.player, response.cancel);
			}
		} catch (error) {
			this.handleError(error, "Error narrating script");
		}
	}

	/**
	 * Save audio file to vault
	 */
	private async saveAudioFile(
		audioData: ArrayBuffer,
		filename: string,
		format: string
	): Promise<void> {
		const folderPath = this.settings.audioOutputFolder;

		// Ensure folder exists
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}

		// Create filename with timestamp to avoid conflicts
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const voiceName = this.settings.voice.split("/").pop() || this.settings.voice;
		const audioFilePath = `${folderPath}/${filename}-${voiceName}-${timestamp}.${format}`;

		// Convert ArrayBuffer to Uint8Array for Obsidian API
		const uint8Array = new Uint8Array(audioData);

		// Save the audio file
		await this.app.vault.createBinary(audioFilePath, uint8Array.buffer);

		console.log(`Audio saved to: ${audioFilePath}`);
	}

	/**
	 * Load available voices asynchronously in background
	 */
	private async loadVoicesAsync(): Promise<void> {
		try {
			console.log("Loading voices from API...");
			this.cachedVoices = await apiClient.narration.getVoices();
		} catch (error) {
			console.error("Failed to load voices:", error);
			// Keep existing cached voices if API call fails
			if (this.cachedVoices.length === 0) {
				// Set empty array on failure - user will see "Loading..." in settings
				this.cachedVoices = [];
			}
		}
	}

	/**
	 * Load available AI models asynchronously in background
	 */
	private async loadModelsAsync(): Promise<void> {
		try {
			console.log("Loading AI models from API...");
			this.cachedModels = await apiClient.ai.getModels({ orApiKey: this.settings.openRouterApiKey});
		} catch (error) {
			console.error("Failed to load AI models:", error);
			// Empty array on failure - user will see "Loading..." in settings
			this.cachedModels = [];
		}
	}

	/**
	 * Handle errors with user-friendly messages
	 */
	private handleError(error: unknown, defaultMessage: string): void {
		let errorMessage = defaultMessage;

		if (error instanceof NarratorApiError) {
			errorMessage = `${defaultMessage}: ${error.message}`;
		} else if (error instanceof Error) {
			errorMessage = `${defaultMessage}: ${error.message}`;
		}

		new Notice(errorMessage);
		console.error(defaultMessage, error);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Update API client when settings are loaded
		initApiClient({
			baseUrl: "https://narrator-api-production-81e4.up.railway.app/api/v1",
			apiKey: this.settings.apiKey,
			openRouterApiKey: this.settings.openRouterApiKey,
			onLoadingStart: () => this.loadingIndicator?.show(),
			onLoadingEnd: () => this.loadingIndicator?.hide(),
		});
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Update API client when settings are saved
		initApiClient({
			baseUrl: "https://narrator-api-production-81e4.up.railway.app/api/v1",
			apiKey: this.settings.apiKey,
			openRouterApiKey: this.settings.openRouterApiKey,
			onLoadingStart: () => this.loadingIndicator?.show(),
			onLoadingEnd: () => this.loadingIndicator?.hide(),
		});
	}
}
