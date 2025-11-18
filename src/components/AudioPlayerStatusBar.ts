import { Notice } from "obsidian";
import type NarratorPlugin from "../main";
import { StreamingAudioPlayer } from "../utils/audioPlayer";

/**
 * Audio player controls displayed in Obsidian's status bar
 * Controls external streaming audio player for narration playback
 */
export class AudioPlayerStatusBar {
	private container: HTMLElement;
	private plugin: NarratorPlugin;
	private isPlaying = false;

	private playPauseButton: HTMLElement;
	private stopButton: HTMLElement;

	// External player control
	private currentPlayer: StreamingAudioPlayer | null = null;
	private cancelStreaming: (() => void) | null = null;

	constructor(container: HTMLElement, plugin: NarratorPlugin) {
		this.container = container;
		this.plugin = plugin;

		this.container.addClass("narrator-player-container");

		// Build the player UI - just buttons
		this.playPauseButton = this.createPlayPauseButton();
		this.stopButton = this.createStopButton();

		// Add buttons to container
		this.container.appendChild(this.playPauseButton);
		this.container.appendChild(this.stopButton);

		// Hide by default
		this.hide();
	}

	/**
	 * Create play/pause toggle button
	 */
	private createPlayPauseButton(): HTMLElement {
		const button = this.container.createEl("span", {
			cls: "narrator-player-button narrator-player-play-pause",
			attr: { "aria-label": "Play" },
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
		const button = this.container.createEl("span", {
			cls: "narrator-player-button narrator-player-stop",
			attr: { "aria-label": "Stop" },
		});

		button.setText("⏹️");

		button.addEventListener("click", () => {
			this.stop();
		});

		return button;
	}

	/**
	 * Toggle play/pause state
	 */
	private async togglePlayPause(): Promise<void> {
		if (!this.currentPlayer) {
			new Notice("No audio playing");
			return;
		}

		if (this.isPlaying) {
			// Pause
			await this.currentPlayer.pause();
			this.isPlaying = false;
			this.playPauseButton.setText("▶️");
			this.playPauseButton.setAttribute("aria-label", "Play");
		} else {
			// Resume
			await this.currentPlayer.resume();
			this.isPlaying = true;
			this.playPauseButton.setText("⏸️");
			this.playPauseButton.setAttribute("aria-label", "Pause");
		}
	}

	/**
	 * Stop playback and detach player
	 */
	private stop(): void {
		if (!this.currentPlayer) {
			return;
		}

		// Stop player
		this.currentPlayer.stop();

		// Cancel streaming if still in progress
		if (this.cancelStreaming) {
			this.cancelStreaming();
		}

		// Detach and cleanup
		this.detachPlayer();
	}

	/**
	 * Attach external streaming audio player
	 * @param player StreamingAudioPlayer instance to control
	 * @param cancel Function to cancel streaming
	 */
	public attachPlayer(player: StreamingAudioPlayer, cancel: () => void): void {
		// Detach any previous player first
		this.detachPlayer();

		// Store player and cancel function
		this.currentPlayer = player;
		this.cancelStreaming = cancel;

		// Show player UI
		this.show();

		// Update initial state
		this.isPlaying = true;
		this.playPauseButton.setText("⏸️");
		this.playPauseButton.setAttribute("aria-label", "Pause");
	}

	/**
	 * Detach current player and clean up
	 */
	public detachPlayer(): void {
		// Clear references
		this.currentPlayer = null;
		this.cancelStreaming = null;

		// Hide player UI
		this.hide();

		// Reset state
		this.isPlaying = false;
		this.playPauseButton.setText("▶️");
		this.playPauseButton.setAttribute("aria-label", "Play");
	}

	/**
	 * Show the player UI
	 */
	public show(): void {
		this.container.style.display = "flex";
	}

	/**
	 * Hide the player UI
	 */
	public hide(): void {
		this.container.style.display = "none";
	}

	/**
	 * Clean up when plugin unloads
	 */
	public destroy(): void {
		this.detachPlayer();
		this.container.empty();
	}
}
