/**
 * Recording indicator in the status bar (red dot + Stop).
 */
export class RecordingStatusBar {
	private container: HTMLElement;
	private stopButton: HTMLElement;
	private onStop: (() => void) | null = null;

	constructor(container: HTMLElement) {
		this.container = container;
		this.container.addClass("narrator-recording-container");

		const dot = this.container.createSpan({
			cls: "narrator-recording-dot",
			attr: { "aria-hidden": "true" },
		});
		void dot;

		this.container.createSpan({
			cls: "narrator-recording-label",
			text: "Recording",
		});

		this.stopButton = this.container.createEl("button", {
			cls: "narrator-player-button narrator-recording-stop",
			attr: { "aria-label": "Stop recording", type: "button" },
			text: "Stop",
		});
		this.stopButton.addEventListener("click", () => {
			this.onStop?.();
		});

		this.hide();
	}

	public show(onStop: () => void): void {
		this.onStop = onStop;
		this.container.removeClass("narrator-hidden");
	}

	public hide(): void {
		this.onStop = null;
		this.container.addClass("narrator-hidden");
	}

	public destroy(): void {
		this.container.empty();
	}
}
