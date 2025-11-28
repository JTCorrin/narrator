/**
 * Streaming audio player for real-time TTS playback
 * Plays PCM Float32Array chunks as they arrive and collects them for final WAV export
 */
export class StreamingAudioPlayer {
	private audioContext: AudioContext;
	private audioChunks: Float32Array[] = [];
	private sources: AudioBufferSourceNode[] = [];
	private isPlaying = false;
	private isPaused = false;
	private scheduledTime = 0;
	private startTime = 0; // When playback actually started
	private sampleRate = 22050; // Default, updated from first chunk

	constructor() {
		this.audioContext = new AudioContext();
	}

	/**
	 * Add PCM Float32 audio chunk and play immediately
	 * @param audioData Float32Array PCM audio data (-1.0 to 1.0 range)
	 * @param sampleRate Sample rate in Hz (e.g., 22050, 44100)
	 */
	public async addPCMChunk(
		audioData: Float32Array,
		sampleRate: number
	): Promise<void> {
		// Store for final WAV assembly
		this.audioChunks.push(audioData);

		// Update sample rate if needed
		if (this.sampleRate !== sampleRate) {
			this.sampleRate = sampleRate;
		}

		// Resume AudioContext if suspended (but not if user paused)
		if (this.audioContext.state === "suspended" && !this.isPaused) {
			await this.audioContext.resume();
		}

		// Initialize scheduled time on first chunk with small buffer
		if (!this.isPlaying) {
			this.isPlaying = true;
			this.scheduledTime = this.audioContext.currentTime + 0.1;
			this.startTime = this.audioContext.currentTime;
		}

		try {
			// Create AudioBuffer from Float32Array
			const audioBuffer = this.audioContext.createBuffer(
				1, // mono
				audioData.length,
				sampleRate
			);

			// Copy data to buffer
			audioBuffer.getChannelData(0).set(audioData);

			// Create source and schedule playback
			const source = this.audioContext.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(this.audioContext.destination);

			// Track source for cleanup
			this.sources.push(source);

			// Schedule at next available time
			source.start(this.scheduledTime);

			// Update scheduled time for next chunk
			this.scheduledTime += audioBuffer.duration;

			// Auto-cleanup after playback
			source.onended = () => {
				const index = this.sources.indexOf(source);
				if (index > -1) {
					this.sources.splice(index, 1);
				}
			};
		} catch (error) {
			console.error("Error playing audio chunk:", error);
			throw error;
		}
	}

	/**
	 * Get all collected chunks as a single Float32Array
	 * Used for final WAV encoding
	 */
	public getCollectedAudio(): Float32Array {
		// Calculate total length
		const totalLength = this.audioChunks.reduce(
			(sum, chunk) => sum + chunk.length,
			0
		);

		// Concatenate all chunks
		const combined = new Float32Array(totalLength);
		let offset = 0;
		for (const chunk of this.audioChunks) {
			combined.set(chunk, offset);
			offset += chunk.length;
		}

		return combined;
	}

	/**
	 * Get the sample rate used for playback
	 */
	public getSampleRate(): number {
		return this.sampleRate;
	}

	/**
	 * Get remaining playback time in seconds
	 * Returns how much audio is still scheduled to play
	 */
	public getRemainingPlaybackTime(): number {
		if (!this.isPlaying) {
			return 0;
		}
		return Math.max(0, this.scheduledTime - this.audioContext.currentTime);
	}

	/**
	 * Get current playback time in seconds
	 * Returns elapsed time since playback started
	 */
	public getCurrentTime(): number {
		if (!this.isPlaying || this.startTime === 0) {
			return 0;
		}
		return Math.max(0, this.audioContext.currentTime - this.startTime);
	}

	/**
	 * Get total duration of collected audio in seconds
	 */
	public getTotalDuration(): number {
		const totalSamples = this.audioChunks.reduce(
			(sum, chunk) => sum + chunk.length,
			0
		);
		return totalSamples / this.sampleRate;
	}

	/**
	 * Check if audio is currently playing (not paused)
	 */
	public getIsPlaying(): boolean {
		return this.isPlaying && !this.isPaused;
	}

	/**
	 * Check if audio is paused
	 */
	public getIsPaused(): boolean {
		return this.isPaused;
	}

	/**
	 * Pause audio playback by suspending the AudioContext
	 */
	public async pause(): Promise<void> {
		if (!this.isPlaying || this.isPaused) {
			return;
		}

		await this.audioContext.suspend();
		this.isPaused = true;
	}

	/**
	 * Resume audio playback by resuming the AudioContext
	 */
	public async resume(): Promise<void> {
		if (!this.isPlaying || !this.isPaused) {
			return;
		}

		await this.audioContext.resume();
		this.isPaused = false;
	}

	/**
	 * Reset for new stream
	 */
	public reset(): void {
		this.stop();
		this.audioChunks = [];
		this.sampleRate = 22050;
	}

	/**
	 * Stop playback and clean up
	 */
	public stop(): void {
		// Stop all scheduled sources
		for (const source of this.sources) {
			try {
				source.stop();
				source.disconnect();
			} catch {
				// Source might already be stopped
			}
		}

		this.sources = [];
		this.isPlaying = false;
		this.isPaused = false;
		this.scheduledTime = 0;
		this.startTime = 0;
	}

	/**
	 * Clean up audio context
	 */
	public async destroy(): Promise<void> {
		this.stop();
		await this.audioContext.close();
	}
}
