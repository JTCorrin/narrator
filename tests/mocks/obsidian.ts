/**
 * Stand-in for the Obsidian API in Vitest (node).
 */
import { vi } from "vitest";

export const requestUrl = vi.fn();

export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Notice {
	constructor(_message?: string) {}
}
export class TFile {}
export class App {}

export default {
	requestUrl,
	Plugin,
	PluginSettingTab,
	Setting,
	Notice,
	TFile,
	App,
};
