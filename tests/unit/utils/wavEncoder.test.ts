import { describe, expect, it } from "vitest";
import { encodeWAV } from "../../../src/utils/wavEncoder";

function headerString(buffer: ArrayBuffer, offset: number, length: number): string {
	const view = new DataView(buffer);
	let s = "";
	for (let i = 0; i < length; i++) {
		s += String.fromCharCode(view.getUint8(offset + i));
	}
	return s;
}

describe("encodeWAV", () => {
	it("writes RIFF/WAVE header for empty samples", () => {
		const buf = encodeWAV(new Float32Array(0), 22050);
		expect(buf.byteLength).toBe(44);
		expect(headerString(buf, 0, 4)).toBe("RIFF");
		expect(headerString(buf, 8, 4)).toBe("WAVE");
		expect(headerString(buf, 12, 4)).toBe("fmt ");
		expect(headerString(buf, 36, 4)).toBe("data");
	});

	it("encodes mono 16-bit PCM at given sample rate", () => {
		const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
		const buf = encodeWAV(samples, 44100);
		const view = new DataView(buf);
		expect(buf.byteLength).toBe(44 + samples.length * 2);
		expect(view.getUint32(24, true)).toBe(44100);
		expect(view.getUint16(22, true)).toBe(1);
		expect(view.getUint16(34, true)).toBe(16);
	});

	it("clamps values outside [-1, 1]", () => {
		const samples = new Float32Array([2, -2]);
		const buf = encodeWAV(samples, 22050);
		const view = new DataView(buf);
		expect(view.getInt16(44, true)).toBe(0x7fff);
		expect(view.getInt16(46, true)).toBe(-0x8000);
	});
});
