import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamingAudioPlayer } from "../../../src/utils/audioPlayer";

class FakeAudioContext {
	currentTime = 1;
	state = "running";
	destination = {};
	resume = vi.fn(async () => { this.state = "running"; });
	suspend = vi.fn(async () => { this.state = "suspended"; });
	close = vi.fn(async () => { this.state = "closed"; });
	sources: ReturnType<FakeAudioContext["createBufferSource"]>[] = [];
	createBuffer(channels: number, length: number, sampleRate: number) {
		return { duration: length / sampleRate, getChannelData: () => new Float32Array(length) };
	}
	createBufferSource() {
		const source = { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), onended: null };
		this.sources.push(source);
		return source;
	}
}

describe("StreamingAudioPlayer", () => {
	let context: FakeAudioContext;
	beforeEach(() => {
		context = new FakeAudioContext();
		vi.stubGlobal("AudioContext", vi.fn(() => context));
	});
	afterEach(() => vi.unstubAllGlobals());

	it("schedules late chunks after the current time instead of overlapping", async () => {
		const player = new StreamingAudioPlayer();
		await player.addPCMChunk(new Float32Array(24000), 24000);
		context.currentTime = 5;
		await player.addPCMChunk(new Float32Array(24000), 24000);
		await player.addPCMChunk(new Float32Array(24000), 24000);
		expect(context.sources[1].start).toHaveBeenCalledWith(5);
		expect(context.sources[2].start).toHaveBeenCalledWith(6);
		expect(player.getRemainingPlaybackTime()).toBe(2);
	});

	it("does not resume paused playback when more audio arrives", async () => {
		const player = new StreamingAudioPlayer();
		await player.addPCMChunk(new Float32Array(24000), 24000);
		await player.pause();
		await player.addPCMChunk(new Float32Array(24000), 24000);
		expect(context.resume).not.toHaveBeenCalled();
		expect(player.getIsPaused()).toBe(true);
	});

	it("destroys once and ignores chunks arriving after cancellation", async () => {
		const player = new StreamingAudioPlayer();
		await player.addPCMChunk(new Float32Array(24000), 24000);
		await player.destroy();
		await player.destroy();
		await player.addPCMChunk(new Float32Array(24000), 24000);
		expect(context.close).toHaveBeenCalledOnce();
		expect(context.sources).toHaveLength(1);
		expect(context.sources[0].stop).toHaveBeenCalledOnce();
		expect(player.getCollectedAudio()).toHaveLength(0);
	});
});
