/**
 * WAV audio encoding utilities
 * Converts Float32Array PCM audio to WAV file format
 */

/**
 * Convert Float32Array PCM audio to WAV file format
 * @param samples Float32Array PCM audio data (-1.0 to 1.0 range)
 * @param sampleRate Sample rate in Hz (e.g., 22050, 44100, 48000)
 * @returns ArrayBuffer containing complete WAV file with headers
 */
export function encodeWAV(
	samples: Float32Array,
	sampleRate: number
): ArrayBuffer {
	const numChannels = 1; // Mono
	const bytesPerSample = 2; // 16-bit PCM
	const format = 1; // PCM format

	// Convert float32 (-1 to 1) to int16 (-32768 to 32767)
	const int16Samples = new Int16Array(samples.length);
	for (let i = 0; i < samples.length; i++) {
		// Clamp to prevent overflow
		const s = Math.max(-1, Math.min(1, samples[i]));
		// Convert to 16-bit integer range
		int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
	}

	const dataLength = int16Samples.length * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataLength);
	const view = new DataView(buffer);

	// Write WAV header
	writeString(view, 0, "RIFF");
	view.setUint32(4, 36 + dataLength, true); // File size - 8
	writeString(view, 8, "WAVE");

	// Write fmt chunk
	writeString(view, 12, "fmt ");
	view.setUint32(16, 16, true); // fmt chunk size
	view.setUint16(20, format, true); // PCM format
	view.setUint16(22, numChannels, true); // Number of channels
	view.setUint32(24, sampleRate, true); // Sample rate
	view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // Byte rate
	view.setUint16(32, numChannels * bytesPerSample, true); // Block align
	view.setUint16(34, bytesPerSample * 8, true); // Bits per sample

	// Write data chunk
	writeString(view, 36, "data");
	view.setUint32(40, dataLength, true);

	// Write PCM samples
	const offset = 44;
	for (let i = 0; i < int16Samples.length; i++) {
		view.setInt16(offset + i * 2, int16Samples[i], true);
	}

	return buffer;
}

/**
 * Write ASCII string to DataView at specified offset
 */
function writeString(view: DataView, offset: number, string: string): void {
	for (let i = 0; i < string.length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i));
	}
}
