import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const BADGE_OUTPUT_PATH = path.join(CWD, "badges", "react-doctor.json");
const reactDoctorArgs = ["react-doctor", ".", "--json", "--json-compact", "--yes", "--fail-on", "none"];

console.log(`[react-doctor-badge] Running "yarn ${reactDoctorArgs.join(" ")}" in "${CWD}".`);

const reportText = execFileSync("yarn", reactDoctorArgs, {
  cwd: CWD,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});

let report;
try {
  report = JSON.parse(reportText);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[react-doctor-badge] Failed to parse React Doctor JSON report: ${message}`);
  console.error(`[react-doctor-badge] Output preview: ${reportText.slice(0, 500)}`);
  process.exit(1);
}
const score = report?.summary?.score;

if (typeof score !== "number") {
  console.error("[react-doctor-badge] Missing summary.score in React Doctor JSON report.");
  process.exit(1);
}

const color = score >= 90 ? "brightgreen" : score >= 75 ? "green" : score >= 50 ? "yellow" : "red";
const badge = {
  schemaVersion: 1,
  label: "react doctor",
  message: `${score}/100`,
  color,
};

fs.mkdirSync(path.dirname(BADGE_OUTPUT_PATH), { recursive: true });
fs.writeFileSync(BADGE_OUTPUT_PATH, `${JSON.stringify(badge, null, 2)}\n`);

console.log(`[react-doctor-badge] Wrote "${BADGE_OUTPUT_PATH}" with score ${score}/100.`);
