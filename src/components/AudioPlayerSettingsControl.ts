import { Notice } from "obsidian";
import type NarratorPlugin from "../main";
import { apiClient } from "../api";

const VOICE_PREVIEW_TEXT =
	"Hello. I'm one of the voices available in Obsidian Narrator. Do you like how I sound?";

/**
 * Audio player controls for voice preview in settings
 * Allows users to test/preview selected voices
 */
export class AudioPlayerSettingsControl {
	private container: HTMLElement;
	private plugin: NarratorPlugin;
	private isPlaying = false;

	private playPauseButton: HTMLElement;
	private stopButton: HTMLElement;
	private timeDisplay: HTMLElement;
	private progressBar: HTMLElement;
	private progressFill: HTMLElement;

	// Audio state
	private currentAudio: HTMLAudioElement | null = null;
	private currentAudioUrl: string | null = null;

	constructor(container: HTMLElement, plugin: NarratorPlugin) {
		this.container = container;
		this.plugin = plugin;

		this.container.addClass("narrator-settings-player-wrapper");

		// Build the player UI
		this.playPauseButton = this.createPlayPauseButton();
		this.stopButton = this.createStopButton();
		const progressContainer = this.createProgressBar();
		this.progressBar = progressContainer;
		this.progressFill = progressContainer.querySelector(
			".narrator-player-progress-fill"
		) as HTMLElement;
		this.timeDisplay = this.createTimeDisplay();

		// Add all elements to container
		this.container.appendChild(this.playPauseButton);
		this.container.appendChild(this.stopButton);
		this.container.appendChild(this.progressBar);
		this.container.appendChild(this.timeDisplay);
	}

	/**
	 * Create play/pause toggle button
	 */
	private createPlayPauseButton(): HTMLElement {
		const button = this.container.createEl("button", {
			cls: "narrator-player-button narrator-player-play-pause",
			attr: { "aria-label": "Preview voice", type: "button" },
		});

		button.setText("▶️");

		button.addEventListener("click", () => {
			this.togglePlayPause();
		});

		return button;
	}

	/**
	 * Create stop button
	 */
	private createStopButton(): HTMLElement {
		const button = this.container.createEl("button", {
			cls: "narrator-player-button narrator-player-stop",
			attr: { "aria-label": "Stop preview", type: "button" },
		});

		button.setText("⏹️");

		button.addEventListener("click", () => {
			this.stop();
		});

		return button;
	}

	/**
	 * Create progress bar
	 */
	private createProgressBar(): HTMLElement {
		const progressContainer = this.container.createEl("div", {
			cls: "narrator-player-progress-container",
		});

		const progressBar = progressContainer.createEl("div", {
			cls: "narrator-player-progress-bar",
		});

		progressBar.createEl("div", {
			cls: "narrator-player-progress-fill",
		});

		// Add click handler for seeking (placeholder)
		progressBar.addEventListener("click", (e) => {
			this.seek(e);
		});

		return progressContainer;
	}

	/**
	 * Create time display (current time / duration)
	 */
	private createTimeDisplay(): HTMLElement {
		const timeDisplay = this.container.createEl("span", {
			cls: "narrator-player-time",
			text: "0:00 / 0:00",
		});

		return timeDisplay;
	}

	/**
	 * Toggle play/pause state
	 */
	private togglePlayPause(): void {
		if (!this.currentAudio) {
			new Notice("No audio loaded. Use the preview voice button first.");
			return;
		}

		if (this.isPlaying) {
			// Pause
			this.currentAudio.pause();
			this.isPlaying = false;
			this.playPauseButton.setText("▶️");
			this.playPauseButton.setAttribute("aria-label", "Play preview");
		} else {
			// Play
			void this.currentAudio.play();
			this.isPlaying = true;
			this.playPauseButton.setText("⏸️");
			this.playPauseButton.setAttribute("aria-label", "Pause preview");
		}
	}

	/**
	 * Stop playback
	 */
	private stop(): void {
		if (this.currentAudio) {
			this.currentAudio.pause();
			this.currentAudio.currentTime = 0;
		}

		this.isPlaying = false;
		this.playPauseButton.setText("▶️");
		this.playPauseButton.setAttribute("aria-label", "Play preview");
		this.updateProgressWidth(0);
		this.timeDisplay.setText("0:00 / 0:00");
	}

	/**
	 * Update progress bar width using CSS custom property
	 */
	private updateProgressWidth(percentage: number): void {
		this.progressFill.setCssProps({ "--progress-width": `${percentage}%` });
	}

	/**
	 * Seek to position in audio
	 */
	private seek(event: MouseEvent): void {
		if (!this.currentAudio || !this.currentAudio.duration) {
			return;
		}

		const progressBar = event.currentTarget as HTMLElement;
		const rect = progressBar.getBoundingClientRect();
		const clickX = event.clientX - rect.left;
		const percentage = clickX / rect.width;

		// Seek to position
		this.currentAudio.currentTime = percentage * this.currentAudio.duration;
	}

	/**
	 * Update progress bar (for future use)
	 */
	public updateProgress(currentTime: number, duration: number): void {
		const percentage = (currentTime / duration) * 100;
		this.updateProgressWidth(percentage);

		const currentStr = this.formatTime(currentTime);
		const durationStr = this.formatTime(duration);
		this.timeDisplay.setText(`${currentStr} / ${durationStr}`);
	}

	/**
	 * Format seconds to MM:SS
	 */
	private formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	/**
	 * Preview a voice by generating and playing sample audio
	 * @param voiceName Voice to preview
	 */
	public async previewVoice(voiceName: string): Promise<void> {
		try {
			// Stop any currently playing audio
			this.stop();

			// Clean up previous audio
			if (this.currentAudioUrl) {
				URL.revokeObjectURL(this.currentAudioUrl);
				this.currentAudioUrl = null;
			}
			this.currentAudio = null;

			// Show loading in status bar
			this.plugin.loadingIndicator?.show();

			// Generate preview audio
			const response = await apiClient.narration.narrateText(
				VOICE_PREVIEW_TEXT,
				{ voice: voiceName }
			);

			// Hide loading
			this.plugin.loadingIndicator?.hide();

			// Check if audioData exists
			if (!response.audioData) {
				throw new Error("No audio data received from server");
			}

			// Convert ArrayBuffer to Blob and create Object URL
			const blob = new Blob([response.audioData], { type: "audio/wav" });
			this.currentAudioUrl = URL.createObjectURL(blob);

			// Create and setup audio element
			this.currentAudio = new Audio(this.currentAudioUrl);

			// Setup event listeners
			this.currentAudio.addEventListener("timeupdate", () => {
				if (this.currentAudio) {
					this.updateProgress(
						this.currentAudio.currentTime,
						this.currentAudio.duration
					);
				}
			});

			this.currentAudio.addEventListener("ended", () => {
				this.isPlaying = false;
				this.playPauseButton.setText("▶️");
				this.playPauseButton.setAttribute("aria-label", "Play preview");
			});

			// Auto-play the preview
			await this.currentAudio.play();
			this.isPlaying = true;
			this.playPauseButton.setText("⏸️");
			this.playPauseButton.setAttribute("aria-label", "Pause preview");

		} catch (error) {
			// Hide loading on error
			this.plugin.loadingIndicator?.hide();

			console.error("Error previewing voice:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			new Notice(`Preview failed: ${errorMessage}`);

			// Reset UI state
			this.stop();
		}
	}

	/**
	 * Clean up when settings are closed
	 */
	public destroy(): void {
		// Stop and clean up audio
		if (this.currentAudio) {
			this.currentAudio.pause();
			this.currentAudio.src = "";
			this.currentAudio = null;
		}

		// Revoke Blob URL
		if (this.currentAudioUrl) {
			URL.revokeObjectURL(this.currentAudioUrl);
			this.currentAudioUrl = null;
		}

		this.container.empty();
	}
}
