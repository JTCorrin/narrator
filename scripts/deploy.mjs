import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const PLUGIN_NAME = "narrator";
const OBSIDIAN_PLUGINS_PATH = "/home/joe/TrueNasMedia/Obsidian/Narrator Plugin/.obsidian/plugins";
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
