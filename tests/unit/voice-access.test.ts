import { afterEach, expect, it, vi } from "vitest";
import NarratorPlugin from "../../src/main";
import { DEFAULT_SETTINGS } from "../../src/types";
import { apiClient } from "../../src/api";
import type { VoiceCatalogue } from "../../src/api/endpoints/narration";

function plugin() {
    const p = new NarratorPlugin({} as never, {} as never);
    p.settings = { ...DEFAULT_SETTINGS, apiKey: "free-key", voice: "Wonderstruck" };
    p.saveData = vi.fn().mockResolvedValue(undefined);
    return p;
}
afterEach(() => vi.restoreAllMocks());

it("replaces a saved paid voice with an allowed default", async () => {
    vi.spyOn(apiClient.narration, "getVoiceCatalogue").mockResolvedValue({voices: ["Guffaw", "Constance"], voice_access: "free"});
    const p = plugin();
    await p.loadVoicesAsync();
    expect(p.cachedVoices).toEqual(["Guffaw", "Constance"]);
    expect(p.cachedVoiceAccess).toBe("free");
    expect(p.settings.voice).toBe("Guffaw");
    expect(p.saveData).toHaveBeenCalledOnce();
});

it("discards stale results when the account changes", async () => {
    let resolve!: (value: VoiceCatalogue) => void;
    vi.spyOn(apiClient.narration, "getVoiceCatalogue")
        .mockReturnValueOnce(new Promise(done => { resolve = done; }))
        .mockResolvedValueOnce({ voices: ["Constance"], voice_access: "free" });
    const p = plugin();
    const old = p.loadVoicesAsync();
    p.settings.apiKey = "another-free-key";
    await p.loadVoicesAsync();
    resolve({ voices: ["Wonderstruck"], voice_access: "paid" });
    await old;
    expect(p.cachedVoices).toEqual(["Constance"]);
    expect(p.settings.voice).toBe("Constance");
});

it("clears previous account voices if authentication fails", async () => {
    vi.spyOn(apiClient.narration, "getVoiceCatalogue").mockRejectedValue(new Error("Invalid key"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const p = plugin();
    p.cachedVoices = ["Wonderstruck"];
    await p.loadVoicesAsync();
    expect(p.cachedVoices).toEqual([]);
});
