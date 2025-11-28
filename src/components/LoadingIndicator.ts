/**
 * Simple loading indicator displayed in Obsidian's status bar
 * Shows a spinner when API requests are in progress
 */
export class LoadingIndicator {
	private container: HTMLElement;
	private spinner: HTMLElement;
	private activeRequests = 0;

	constructor(container: HTMLElement) {
		this.container = container;
		this.container.addClass("narrator-loading-container");

		// Create the spinner element with animated circle
		this.spinner = this.container.createEl("div", {
			cls: "narrator-loading-spinner",
			attr: { "aria-label": "Loading" },
		});

		// Add inner circle for animation
		this.spinner.createEl("div", {
			cls: "narrator-loading-spinner-circle",
		});

		this.hide(); // Hidden by default
	}

	/**
	 * Show loading spinner
	 * Tracks concurrent requests to only hide when all are complete
	 */
	public show(): void {
		this.activeRequests++;
		this.spinner.removeClass("narrator-hidden");
	}

	/**
	 * Hide loading spinner
	 * Only hides when all active requests are complete
	 */
	public hide(): void {
		this.activeRequests = Math.max(0, this.activeRequests - 1);

		if (this.activeRequests === 0) {
			this.spinner.addClass("narrator-hidden");
		}
	}

	/**
	 * Clean up when plugin unloads
	 */
	public destroy(): void {
		this.container.empty();
	}
}
