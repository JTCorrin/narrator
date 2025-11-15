import { Notice, Plugin, TFile, Editor, MarkdownView, MarkdownFileInfo, Menu } from "obsidian";

interface NarratorSettings {
	voiceId: string;
	speed: number;
	audioOutputFolder: string;
}

const DEFAULT_SETTINGS: NarratorSettings = {
	voiceId: "default",
	speed: 1.0,
	audioOutputFolder: "narration-audio",
};

export default class NarratorPlugin extends Plugin {
	settings!: NarratorSettings;

	async onload() {
		console.log("Loading Narrator plugin");

		// Load saved settings
		await this.loadSettings();

		// Register context menu events
		this.registerWorkspaceEvents();

		// Add commands to command palette
		this.addCommands();
	}

	onunload() {
		console.log("Unloading Narrator plugin");
	}

	private registerWorkspaceEvents() {
		// File menu context: "Narrate" full note and "Create Script"
		this.registerEvent(
			// @ts-ignore - file-menu is a valid event type
			this.app.workspace.on("file-menu", (menu: Menu, file: TFile) => {
				// Only add menu items for markdown files
				if (file.extension === "md") {
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

	private addCommands() {
		// Command palette command for narrating active note
		this.addCommand({
			id: "narrate-active-note",
			name: "Narrate active note",
			editorCallback: async (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
				const file = ctx instanceof MarkdownView ? ctx.file : ctx.file;
				if (file) {
					await this.narrateFile(file);
				}
			},
		});

		// Command palette command for creating script from active note
		this.addCommand({
			id: "create-script-from-note",
			name: "Create script from active note",
			editorCallback: async (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
				const file = ctx instanceof MarkdownView ? ctx.file : ctx.file;
				if (file) {
					await this.createScript(file);
				}
			},
		});
	}

	/**
	 * Narrate the full contents of a file
	 */
	private async narrateFile(file: TFile) {
		try {
			const content = await this.app.vault.read(file);

			new Notice(`Narrating: ${file.basename}`);

			// TODO: Implement narration service integration
			// This is where you'll call your narration API/service
			// Example:
			// const audioUrl = await this.narrationService.narrate(content);
			// await this.saveAudioFile(audioUrl, file.basename);

			console.log("Narrating file:", file.path);
			console.log("Content length:", content.length);

			// Placeholder notification
			new Notice("Narration feature coming soon!");

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			new Notice(`Error narrating file: ${errorMessage}`);
			console.error("Narration error:", error);
		}
	}

	/**
	 * Narrate selected text
	 */
	private async narrateText(text: string, file: TFile | null) {
		try {
			new Notice("Narrating selected text...");

			// TODO: Implement narration service integration for text
			// Example:
			// const audioUrl = await this.narrationService.narrate(text);
			// const filename = file ? `${file.basename}-selection` : "selection";
			// await this.saveAudioFile(audioUrl, filename);

			console.log("Narrating text:", text.substring(0, 100) + "...");

			// Placeholder notification
			new Notice("Narration feature coming soon!");

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			new Notice(`Error narrating text: ${errorMessage}`);
			console.error("Narration error:", error);
		}
	}

	/**
	 * Create a script file with character breakdowns
	 */
	private async createScript(file: TFile) {
		try {
			const content = await this.app.vault.read(file);

			new Notice(`Creating script from: ${file.basename}`);

			// TODO: Implement script generation logic
			// This will parse the content and break it down by characters:
			// [NARRATOR], [CHARACTER 1], [CHARACTER 2], etc.
			//
			// Example output structure:
			// [NARRATOR]
			// Once upon a time...
			//
			// [CHARACTER 1]
			// "Hello, how are you?"
			//
			// [CHARACTER 2]
			// "I'm doing well, thank you!"

			const scriptContent = this.generateScriptContent(content);

			// Create sibling file with "-script" suffix
			const scriptPath = file.path.replace(/\.md$/, "-script.md");

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(scriptPath);
			if (existingFile) {
				new Notice(`Script file already exists: ${scriptPath}`);
				return;
			}

			await this.app.vault.create(scriptPath, scriptContent);
			new Notice(`Script created: ${scriptPath}`);

			// Open the newly created script file
			const newFile = this.app.vault.getAbstractFileByPath(scriptPath);
			if (newFile instanceof TFile) {
				await this.app.workspace.getLeaf().openFile(newFile);
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			new Notice(`Error creating script: ${errorMessage}`);
			console.error("Script creation error:", error);
		}
	}

	/**
	 * Generate script content with character breakdowns
	 * This is a placeholder implementation
	 */
	private generateScriptContent(content: string): string {
		// TODO: Implement proper script parsing logic
		// For now, just add a simple template

		return `# Script

*Generated from original note*

---

[NARRATOR]
${content}

---

*Instructions:*
- Edit this script to assign dialogue to different characters
- Use tags like [NARRATOR], [CHARACTER 1], [CHARACTER 2], etc.
- Each character can be assigned a different voice when narrating
`;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
