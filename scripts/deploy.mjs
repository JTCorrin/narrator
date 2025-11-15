import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const PLUGIN_NAME = "narrator";

// Get vault path from command line argument or environment variable
const vaultPath = process.argv[2] || process.env.OBSIDIAN_VAULT_PATH;

if (!vaultPath) {
	console.error("Error: No vault path provided!");
	console.error("\nUsage:");
	console.error("  pnpm run deploy <path-to-vault>");
	console.error("\nOr set environment variable:");
	console.error("  export OBSIDIAN_VAULT_PATH='/path/to/vault'");
	console.error("\nExample:");
	console.error("  pnpm run deploy '/Users/joe/Obsidian/MyVault'");
	process.exit(1);
}

const OBSIDIAN_PLUGINS_PATH = join(vaultPath, ".obsidian", "plugins");
const TARGET_DIR = join(OBSIDIAN_PLUGINS_PATH, PLUGIN_NAME);

// Files to copy
const FILES_TO_COPY = ["main.js", "manifest.json", "styles.css"];

console.log("Deploying Narrator plugin to Obsidian...");
console.log(`Target directory: ${TARGET_DIR}`);

// Create target directory if it doesn't exist
if (!existsSync(TARGET_DIR)) {
	console.log("Creating plugin directory...");
	mkdirSync(TARGET_DIR, { recursive: true });
}

// Copy files
FILES_TO_COPY.forEach((file) => {
	if (existsSync(file)) {
		const targetPath = join(TARGET_DIR, file);
		copyFileSync(file, targetPath);
		console.log(`✓ Copied ${file}`);
	} else {
		console.warn(`⚠ Warning: ${file} not found, skipping...`);
	}
});

console.log("\n✓ Deployment complete!");
console.log("Reload Obsidian to see the changes (Ctrl+R or Cmd+R)");
