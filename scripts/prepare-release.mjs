#!/usr/bin/env node
/**
 * Sync package.json, manifest.json, and versions.json for a release.
 * Version comes from VERSION env (set by the release workflow from the git tag).
 */
import { readFileSync, writeFileSync } from "fs";

const version = process.env.VERSION;
if (!version) {
	console.error("VERSION env var is required");
	process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
packageJson.version = version;
writeFileSync("package.json", JSON.stringify(packageJson, null, "\t") + "\n");

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
manifest.version = version;
if (!manifest.minAppVersion) {
	manifest.minAppVersion = "1.0.0";
}
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[version] = manifest.minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");

console.log(
	`Prepared release ${version} (minAppVersion=${manifest.minAppVersion})`
);
