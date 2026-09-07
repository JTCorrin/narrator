import { Notice, Plugin, TFile, Editor, MarkdownView, Menu, Platform } from "obsidian";
import { NarratorSettingTab } from "./settings";
import { NarratorSettings, parseSettings } from "./types";
import { initApiClient, apiClient, NarratorApiError, AIModel } from "./api";
import type { TranscriptionStreamHandle } from "./api/endpoints/transcription";
import { AudioPlayerStatusBar } from "./components/AudioPlayerStatusBar";
import { LoadingIndicator } from "./components/LoadingIndicator";
import { RecordingStatusBar } from "./components/RecordingStatusBar";
import { isScriptFile, extractCharacterVoices, getCleanScriptContent } from "./utils/scriptParser";
import { isMicCaptureSupported, startMicCapture, type MicCaptureHandle } from "./utils/micCapture";
import { LiveTranscriptInsert } from "./utils/sttInsert";
import { NARRATOR_API_BASE_URL } from "./config";

export default class NarratorPlugin extends Plugin {
	declare settings: NarratorSettings;
	cachedVoices: string[] = [];
	cachedModels: AIModel[] = [];
	statusBarPlayer: AudioPlayerStatusBar | null = null;
	loadingIndicator: LoadingIndicator | null = null;
	recordingStatusBar: RecordingStatusBar | null = null;

	private micCapture: MicCaptureHandle | null = null;
	private sttStream: TranscriptionStreamHandle | null = null;
	private liveInsert: LiveTranscriptInsert | null = null;
	private recordingFilePath: string | null = null;
	private recordingActive = false;

	async onload() {
		console.debug("Loading Narrator plugin");

		// Load saved settings
		await this.loadSettings();

		// Initialize status bar components
		this.initializeStatusBar();
		this.initializeLoadingIndicator();
		this.initializeRecordingStatusBar();

		// Initialize API client with settings and loading callbacks
		initApiClient({
			baseUrl: NARRATOR_API_BASE_URL,
			apiKey: this.settings.apiKey,
			openRouterApiKey: this.settings.openRouterApiKey,
			onLoadingStart: () => this.loadingIndicator?.show(),
			onLoadingEnd: () => this.loadingIndicator?.hide(),
		});

		// Register settings tab
		this.addSettingTab(new NarratorSettingTab(this.app, this));

		// Load voices and models asynchronously after workspace is ready
		if (this.app.workspace.layoutReady) {
			void this.loadVoicesAsync();
			void this.loadModelsAsync();
		} else {
			this.app.workspace.onLayoutReady(() => {
				void this.loadVoicesAsync();
				void this.loadModelsAsync();
			});
		}

		// Register context menu events
		this.registerWorkspaceEvents();

		// Microphone ribbon first (toggle record)
		this.addRibbonIcon("mic", "Record transcription", () => {
			void this.toggleTranscriptionRecording();
		});

		// Add commands to command palette
		this.addCommands();
	}

	onunload() {
		console.debug("Unloading Narrator plugin");
		this.cancelTranscriptionRecording();

		// Clean up status bar components
		if (this.statusBarPlayer) {
			this.statusBarPlayer.destroy();
		}
		if (this.loadingIndicator) {
			this.loadingIndicator.destroy();
		}
		if (this.recordingStatusBar) {
			this.recordingStatusBar.destroy();
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
						// Script-specific menu: "Narrate script"
						menu.addItem((item) => {
							item
								.setTitle("Narrate script")
								.setIcon("users") // Multi-character icon
								.onClick(() => {
									void this.narrateScript(file);
								});
						});
					} else {
						// Regular file menus: "Narrate" and "Create script"
						menu.addItem((item) => {
							item
								.setTitle("Narrate")
								.setIcon("volume-2")
								.onClick(() => {
									void this.narrateFile(file);
								});
						});

						menu.addItem((item) => {
							item
								.setTitle("Create script")
								.setIcon("file-text")
								.onClick(() => {
									void this.createScript(file);
								});
						});
					}
				}
			})
		);

		// Editor menu context: narrate selection + record transcription
		this.registerEvent(
			// @ts-ignore - editor-menu is a valid event type
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
				const selectedText = editor.getSelection();

				// Only show if text is selected
				if (selectedText) {
					menu.addItem((item) => {
						item
							.setTitle("Narrate selection")
							.setIcon("volume-2")
							.onClick(() => {
								void this.narrateText(selectedText, view.file);
							});
					});
				}

				if (this.canUseTranscription()) {
					menu.addItem((item) => {
						item
							.setTitle(this.recordingActive ? "Stop recording" : "Start recording")
							.setIcon("mic")
							.onClick(() => {
								void this.toggleTranscriptionRecording();
							});
					});
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				if (!this.recordingActive || !this.recordingFilePath) return;
				const file = this.app.workspace.getActiveFile();
				if (!file || file.path !== this.recordingFilePath) {
					new Notice("Recording stopped: note changed");
					this.cancelTranscriptionRecording();
				}
			})
		);
	}

	private initializeStatusBar() {
		const statusBarContainer = this.addStatusBarItem();
		this.statusBarPlayer = new AudioPlayerStatusBar(statusBarContainer, this);
		console.debug("Audio player status bar initialized");
	}

	private initializeLoadingIndicator() {
		const loadingContainer = this.addStatusBarItem();
		this.loadingIndicator = new LoadingIndicator(loadingContainer);
		console.debug("Loading indicator initialized");
	}

	private initializeRecordingStatusBar() {
		const recordingContainer = this.addStatusBarItem();
		this.recordingStatusBar = new RecordingStatusBar(recordingContainer);
		console.debug("Recording status bar initialized");
	}

	private canUseTranscription(): boolean {
		return Platform.isDesktop && isMicCaptureSupported();
	}

	private addCommands() {
		this.addCommand({
			id: "record-transcription",
			name: "Record transcription",
			checkCallback: (checking: boolean) => {
				if (!this.canUseTranscription()) return false;
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view?.editor) return false;
				if (!checking) {
					void this.toggleTranscriptionRecording();
				}
				return true;
			},
		});

		// Command palette command for narrating active note (only for non-scripts)
		this.addCommand({
			id: "narrate-active-note",
			name: "Narrate active note",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file && file.extension === "md" && !isScriptFile(file, this.app)) {
					if (!checking) {
						void this.narrateFile(file);
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
						void this.createScript(file);
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
						void this.narrateScript(file);
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
			const response = apiClient.narration.narrateTextStreaming(content, {
				voice: this.settings.voice,
				onComplete: (audioData: ArrayBuffer) => {
					// Save audio file
					void this.saveAudioFile(
						audioData,
						file.basename,
						"wav"
					).then(() => {
						new Notice(`Narration complete! Audio saved to ${this.settings.audioOutputFolder}/`);
					}).catch(error => this.handleError(error, "Could not save narration audio"));

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
	private narrateText(text: string, file: TFile | null) {
		try {
			new Notice("Streaming narration...");

			// Use WebSocket streaming for real-time playback
			const response = apiClient.narration.narrateTextStreaming(text, {
				voice: this.settings.voice,
				onComplete: (audioData: ArrayBuffer) => {
					// Save audio file
					const filename = file ? `${file.basename}-selection` : "selection";
					void this.saveAudioFile(
						audioData,
						filename,
						"wav"
					).then(() => {
						new Notice(`Narration complete! Audio saved to ${this.settings.audioOutputFolder}/`);
					}).catch(error => this.handleError(error, "Could not save narration audio"));

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
			console.debug(
				`Script: ${file.basename}, ${Object.keys(characterVoices).length} character voices`
			);

			// Use WebSocket streaming for real-time playback
			const response = apiClient.narration.narrateScriptStreaming(
				cleanContent,
				file.basename,
				{
					defaultVoice: this.settings.voice,
					voices: characterVoices,
					onComplete: (audioData: ArrayBuffer) => {
						// Save audio file
						void this.saveAudioFile(audioData, `${file.basename}-scripted`, "wav").then(() => {
							new Notice(
								`Script narration complete! Audio saved to ${this.settings.audioOutputFolder}/`
							);
						}).catch(error => this.handleError(error, "Could not save narration audio"));

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

		console.debug(`Audio saved to: ${audioFilePath}`);
	}

	/**
	 * Load available voices asynchronously in background
	 */
	private voicesRequest = 0;
	private voicesApiKey: string | null = null;
	cachedVoiceAccess = "operational";

	async loadVoicesAsync(): Promise<void> {
		const request = ++this.voicesRequest;
		this.voicesApiKey = this.settings.apiKey;
		this.cachedVoices = [];
		this.cachedVoiceAccess = "operational";
		try {
			console.debug("Loading voices from API...");
			const catalogue = await apiClient.narration.getVoiceCatalogue();
			if (request !== this.voicesRequest) return;
			this.cachedVoices = catalogue.voices;
			this.cachedVoiceAccess = catalogue.voice_access || "operational";
			if (this.cachedVoices.length && !this.cachedVoices.includes(this.settings.voice)) {
				this.settings.voice = this.cachedVoices[0]!;
				await this.saveData(this.settings);
			}
		} catch (error) {
			console.error("Failed to load voices:", error);
			// Never retain a previous account's voices after an authentication failure.
			if (request !== this.voicesRequest) return;
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
			console.debug("Loading AI models from API...");
			this.cachedModels = await apiClient.ai.getModels({ orApiKey: this.settings.openRouterApiKey});
		} catch (error) {
			console.error("Failed to load AI models:", error);
			// Empty array on failure - user will see "Loading..." in settings
			this.cachedModels = [];
		}
	}

	/**
	 * Toggle live speech-to-text into the active markdown editor.
	 */
	private async toggleTranscriptionRecording(): Promise<void> {
		if (this.recordingActive) {
			this.stopTranscriptionRecording();
			return;
		}
		await this.startTranscriptionRecording();
	}

	private async startTranscriptionRecording(): Promise<void> {
		if (!this.canUseTranscription()) {
			new Notice("Microphone transcription requires the desktop app.");
			return;
		}

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.editor || !view.file) {
			new Notice("Open a Markdown note to record transcription.");
			return;
		}

		if (!this.settings.apiKey?.trim()) {
			new Notice("Set your narrator API key in settings before recording.");
			return;
		}

		try {
			this.liveInsert = new LiveTranscriptInsert(view.editor);
			this.recordingFilePath = view.file.path;
			this.recordingActive = true;
			this.recordingStatusBar?.show(() => this.stopTranscriptionRecording());

			this.sttStream = apiClient.transcription.startTranscriptionStream({
				onWord: (text) => {
					this.liveInsert?.appendWord(text);
				},
				onFinal: (text) => {
					new Notice(
						text.trim()
							? "Transcription complete"
							: "Transcription finished (no speech detected)"
					);
					this.finishTranscriptionCleanup();
				},
				onError: (error) => {
					this.handleError(error, "Transcription error");
					this.finishTranscriptionCleanup();
				},
			});

			this.micCapture = await startMicCapture((pcm) => {
				this.sttStream?.sendPcm(pcm);
			});

			new Notice("Recording… speak into your microphone");
		} catch (error) {
			const message =
				error instanceof Error && /Permission|NotAllowed|Denied/i.test(error.message)
					? "Microphone permission denied"
					: "Could not start recording";
			this.handleError(error, message);
			this.finishTranscriptionCleanup();
		}
	}

	private stopTranscriptionRecording(): void {
		if (!this.recordingActive) return;
		this.micCapture?.stop();
		this.micCapture = null;
		this.sttStream?.stop();
		new Notice("Finalizing transcription…");
	}

	private cancelTranscriptionRecording(): void {
		this.micCapture?.stop();
		this.micCapture = null;
		this.sttStream?.cancel();
		this.sttStream = null;
		this.finishTranscriptionCleanup();
	}

	private finishTranscriptionCleanup(): void {
		this.micCapture?.stop();
		this.micCapture = null;
		this.sttStream = null;
		this.liveInsert = null;
		this.recordingFilePath = null;
		this.recordingActive = false;
		this.recordingStatusBar?.hide();
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
		this.settings = parseSettings(await this.loadData());

		// Update API client when settings are loaded
		initApiClient({
			baseUrl: NARRATOR_API_BASE_URL,
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
			baseUrl: NARRATOR_API_BASE_URL,
			apiKey: this.settings.apiKey,
			openRouterApiKey: this.settings.openRouterApiKey,
			onLoadingStart: () => this.loadingIndicator?.show(),
			onLoadingEnd: () => this.loadingIndicator?.hide(),
		});
		if (this.voicesApiKey !== this.settings.apiKey) await this.loadVoicesAsync();
	}
}
