import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const buildFilePath = join(process.cwd(), "build.json");

// Read current build number
const buildData = JSON.parse(readFileSync(buildFilePath, "utf8"));
buildData.buildNumber += 1;

// Write updated build number
writeFileSync(buildFilePath, JSON.stringify(buildData, null, 2));
console.log(`Build number incremented to ${buildData.buildNumber}`);
