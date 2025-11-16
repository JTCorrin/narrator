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

		// Create the spinner element
		this.spinner = this.container.createEl("span", {
			cls: "narrator-loading-spinner",
			attr: { "aria-label": "Loading" },
		});

		this.spinner.setText("⏳");
		this.hide(); // Hidden by default
	}

	/**
	 * Show loading spinner
	 * Tracks concurrent requests to only hide when all are complete
	 */
	public show(): void {
		this.activeRequests++;
		this.spinner.style.display = "inline-block";
	}

	/**
	 * Hide loading spinner
	 * Only hides when all active requests are complete
	 */
	public hide(): void {
		this.activeRequests = Math.max(0, this.activeRequests - 1);

		if (this.activeRequests === 0) {
			this.spinner.style.display = "none";
		}
	}

	/**
	 * Clean up when plugin unloads
	 */
	public destroy(): void {
		this.container.empty();
	}
}
