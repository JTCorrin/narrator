/**
 * Streaming audio player for real-time TTS playback
 * Plays PCM Float32Array chunks as they arrive and collects them for final WAV export
 */
export class StreamingAudioPlayer {
	private audioContext: AudioContext;
	private audioChunks: Float32Array[] = [];
	private sources: AudioBufferSourceNode[] = [];
	private isPlaying = false;
	private scheduledTime = 0;
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

		// Resume AudioContext if suspended
		if (this.audioContext.state === "suspended") {
			await this.audioContext.resume();
		}

		// Initialize scheduled time on first chunk with small buffer
		if (!this.isPlaying) {
			this.isPlaying = true;
			this.scheduledTime = this.audioContext.currentTime + 0.1;
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
			} catch (e) {
				// Source might already be stopped
			}
		}

		this.sources = [];
		this.isPlaying = false;
		this.scheduledTime = 0;
	}

	/**
	 * Clean up audio context
	 */
	public async destroy(): Promise<void> {
		this.stop();
		await this.audioContext.close();
	}
}
