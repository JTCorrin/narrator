import { describe, expect, it } from "vitest";
import {
	encodePcmBase64,
	resampleLinear,
	STT_FRAME_SAMPLES,
	STT_SAMPLE_RATE,
} from "../../../src/utils/micCapture";
import { joinTranscriptWords } from "../../../src/utils/sttInsert";

describe("micCapture helpers", () => {
	it("exports 24 kHz / 80 ms frame constants", () => {
		expect(STT_SAMPLE_RATE).toBe(24000);
		expect(STT_FRAME_SAMPLES).toBe(1920);
	});

	it("encodes float32 PCM as base64 little-endian", () => {
		const pcm = new Float32Array([0.5, -0.5]);
		const b64 = encodePcmBase64(pcm);
		const binary = atob(b64);
		expect(binary.length).toBe(8);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		const decoded = new Float32Array(bytes.buffer);
		expect(decoded[0]).toBeCloseTo(0.5);
		expect(decoded[1]).toBeCloseTo(-0.5);
	});

	it("resamples 48 kHz to 24 kHz by half length", () => {
		const input = new Float32Array(8);
		for (let i = 0; i < 8; i++) input[i] = i;
		const out = resampleLinear(input, 48000, 24000);
		expect(out.length).toBe(4);
	});

	it("returns same buffer when rates match", () => {
		const input = new Float32Array([1, 2, 3]);
		expect(resampleLinear(input, 24000, 24000)).toBe(input);
	});
});

describe("joinTranscriptWords", () => {
	it("joins with spaces like the runpod client", () => {
		expect(joinTranscriptWords("", "hello")).toBe("hello");
		expect(joinTranscriptWords("hello", "world")).toBe("hello world");
		expect(joinTranscriptWords("hello", "  ")).toBe("hello");
	});
});
