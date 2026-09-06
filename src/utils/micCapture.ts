/** Mic capture helpers: 24 kHz mono float32 frames (~80 ms / 1920 samples). */

export const STT_SAMPLE_RATE = 24000;
export const STT_FRAME_SAMPLES = 1920;

export function encodePcmBase64(pcm: Float32Array): string {
	const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]!);
	}
	return btoa(binary);
}

/** Linear resample from `fromRate` to `toRate`. */
export function resampleLinear(
	input: Float32Array,
	fromRate: number,
	toRate: number
): Float32Array {
	if (fromRate === toRate || input.length === 0) {
		return input;
	}
	const ratio = fromRate / toRate;
	const outLength = Math.max(1, Math.floor(input.length / ratio));
	const out = new Float32Array(outLength);
	for (let i = 0; i < outLength; i++) {
		const srcIndex = i * ratio;
		const i0 = Math.min(Math.floor(srcIndex), input.length - 1);
		const i1 = Math.min(i0 + 1, input.length - 1);
		const t = srcIndex - i0;
		out[i] = input[i0]! * (1 - t) + input[i1]! * t;
	}
	return out;
}

export function isMicCaptureSupported(): boolean {
	return (
		typeof navigator !== "undefined" &&
		!!navigator.mediaDevices &&
		typeof navigator.mediaDevices.getUserMedia === "function" &&
		typeof AudioContext !== "undefined"
	);
}

export interface MicCaptureHandle {
	stop: () => void;
}

/**
 * Capture microphone audio, resample to 24 kHz mono, emit ~80 ms frames.
 */
export async function startMicCapture(
	onFrame: (pcm: Float32Array) => void
): Promise<MicCaptureHandle> {
	if (!isMicCaptureSupported()) {
		throw new Error(
			"Microphone capture is not available. Use the desktop app with mic permission."
		);
	}

	const stream = await navigator.mediaDevices.getUserMedia({
		audio: {
			channelCount: 1,
			echoCancellation: true,
			noiseSuppression: true,
		},
		video: false,
	});

	const ctx = new AudioContext();
	const source = ctx.createMediaStreamSource(stream);
	const processor = ctx.createScriptProcessor(4096, 1, 1);
	const mute = ctx.createGain();
	mute.gain.value = 0;

	const pending: number[] = [];

	processor.onaudioprocess = (event) => {
		const input = event.inputBuffer.getChannelData(0);
		const resampled = resampleLinear(input, ctx.sampleRate, STT_SAMPLE_RATE);
		for (let i = 0; i < resampled.length; i++) {
			pending.push(resampled[i]!);
		}
		while (pending.length >= STT_FRAME_SAMPLES) {
			const frame = new Float32Array(STT_FRAME_SAMPLES);
			for (let i = 0; i < STT_FRAME_SAMPLES; i++) {
				frame[i] = pending.shift()!;
			}
			onFrame(frame);
		}
	};

	source.connect(processor);
	processor.connect(mute);
	mute.connect(ctx.destination);

	let stopped = false;
	return {
		stop: () => {
			if (stopped) return;
			stopped = true;
			try {
				processor.disconnect();
				source.disconnect();
				mute.disconnect();
			} catch {
				/* ignore */
			}
			for (const track of stream.getTracks()) {
				track.stop();
			}
			void ctx.close();
		},
	};
}
