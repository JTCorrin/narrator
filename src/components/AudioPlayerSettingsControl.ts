import { Notice } from "obsidian";
import type NarratorPlugin from "../main";

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
		this.isPlaying = !this.isPlaying;

		if (this.isPlaying) {
			this.playPauseButton.setText("⏸️");
			this.playPauseButton.setAttribute("aria-label", "Pause preview");
			new Notice(
				`Preview voice: ${this.plugin.settings.voice} (placeholder)`
			);
		} else {
			this.playPauseButton.setText("▶️");
			this.playPauseButton.setAttribute("aria-label", "Preview voice");
			new Notice("Pause preview (placeholder)");
		}
	}

	/**
	 * Stop playback
	 */
	private stop(): void {
		this.isPlaying = false;
		this.playPauseButton.setText("▶️");
		this.playPauseButton.setAttribute("aria-label", "Preview voice");
		this.progressFill.style.width = "0%";
		this.timeDisplay.setText("0:00 / 0:00");

		new Notice("Stop preview (placeholder)");
	}

	/**
	 * Seek to position in audio
	 */
	private seek(event: MouseEvent): void {
		const progressBar = event.currentTarget as HTMLElement;
		const rect = progressBar.getBoundingClientRect();
		const clickX = event.clientX - rect.left;
		const percentage = (clickX / rect.width) * 100;

		this.progressFill.style.width = `${percentage}%`;

		new Notice(`Seek preview to ${percentage.toFixed(0)}% (placeholder)`);
	}

	/**
	 * Update progress bar (for future use)
	 */
	public updateProgress(currentTime: number, duration: number): void {
		const percentage = (currentTime / duration) * 100;
		this.progressFill.style.width = `${percentage}%`;

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
	 * Clean up when settings are closed
	 */
	public destroy(): void {
		this.container.empty();
	}
}
