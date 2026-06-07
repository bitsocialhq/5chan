import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync } from 'fs';
import fetch from 'node-fetch';

const dirname = path.join(path.dirname(fileURLToPath(import.meta.url)));
const conventionalChangelog = path.join(dirname, '..', 'node_modules', '.bin', 'conventional-changelog');
const version = JSON.parse(readFileSync(path.join(dirname, '..', 'package.json'), 'utf8')).version;

// changelog (use last non-empty)
let releaseChangelog =
  execSync(`${conventionalChangelog} --preset angular --release-count 1`).toString() ||
  execSync(`${conventionalChangelog} --preset angular --release-count 2`).toString();
releaseChangelog = releaseChangelog.trim().replace(/\n\n+/g, '\n\n');

// discover artifacts
const distDir = path.join(dirname, '..', 'dist');
let files = [];
try {
  files = readdirSync(distDir);
} catch {}

// In CI finalization, dist is populated from downloaded workflow artifacts.
// Falls back to GitHub release assets for local/manual runs.
const getReleaseAssetNames = async () => {
  try {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPOSITORY; // owner/repo
    const tag = process.env.GITHUB_REF_NAME || `v${version}`;
    if (!token || !repo || !tag) return [];
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': '5chan-release-notes',
        'X-GitHub-Api-Version': '2022-11-28',
        Accept: 'application/vnd.github+json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.assets || []).map((a) => a.name).filter(Boolean);
  } catch (e) {
    return [];
  }
};

const remoteFiles = await getReleaseAssetNames();
if (remoteFiles.length) {
  files = remoteFiles;
}

const linkTo = (file) => `https://github.com/bitsocialnet/5chan/releases/download/v${version}/${encodeURIComponent(file)}`;
const has = (s, sub) => s.toLowerCase().includes(sub);
const isArm = (s) => has(s, 'arm64') || has(s, 'aarch64');
const isX64 = (s) => has(s, 'x64') || has(s, 'x86_64') || !isArm(s);
const isHtmlArchive = (file) => file.toLowerCase().endsWith('.zip') && (has(file, '5chan-html') || has(file, '-html'));

// buckets
const androidApk = files.find((f) => f.endsWith('.apk'));
const htmlZip = files.find(isHtmlArchive);

const linux = files.filter((f) => f.endsWith('.AppImage'));
const mac = files.filter((f) => f.endsWith('.dmg'));
const win = files.filter((f) => f.toLowerCase().endsWith('.exe'));

const linuxArm = linux.find(isArm);
const linuxX64 = linux.find(isX64);
const macArm = mac.find(isArm);
const macX64 = mac.find(isX64);

const winSetupX64 = win.find((f) => has(f, 'setup') && isX64(f));
const winPortableX64 = win.find((f) => has(f, 'portable') && isX64(f));

// small section builder without push()
const section = (title, lines) => {
  const body = lines.filter(Boolean).join('\n');
  return body ? `### ${title}\n${body}` : '';
};

const macSection = section('macOS', [
  macArm && `- Apple Silicon (arm64): [Download DMG](${linkTo(macArm)})`,
  macX64 && `- Intel (x64): [Download DMG](${linkTo(macX64)})`,
  mac.length > 0 &&
    `- If macOS shows "5chan.app is damaged and can't be opened. You should move it to the Trash.", run this in Terminal to fix it: \`xattr -dr com.apple.quarantine "/Applications/5chan.app"\` then open the app again.`,
]);

const winSection = section('Windows', [
  winSetupX64 && `- Installer (x64): [Download EXE](${linkTo(winSetupX64)})`,
  winPortableX64 && `- Portable (x64): [Download EXE](${linkTo(winPortableX64)})`,
  win.length > 0 &&
    `- If Windows shows "Windows protected your PC" (SmartScreen), click "More info" then "Run anyway". To permanently allow, right-click the .exe → Properties → check "Unblock", or run in PowerShell: \`Unblock-File -Path .\\path\\to\\file.exe\`.`,
]);

const linuxSection = section('Linux', [
  linuxArm && `- AppImage (arm64): [Download](${linkTo(linuxArm)})`,
  linuxX64 && `- AppImage (x64): [Download](${linkTo(linuxX64)})`,
]);

const androidSection = section('Android', [androidApk && `- APK: [Download](${linkTo(androidApk)})`]);

const htmlSection = section('Static HTML build', [htmlZip && `- Static HTML archive (zip): [Download](${linkTo(htmlZip)})`]);

const downloads = [macSection, winSection, linuxSection, androidSection, htmlSection].filter(Boolean).join('\n\n');

// One-liner summary of what changed in this release. Update before each release.
const oneLinerDescription =
  'This version adds share links, /g/ code formatting, directory board submissions, progressive homepage stats, and fixes quote previews, expanded images, moderation approval details, and comment moderation edits.';

const releaseBody = `${oneLinerDescription}

- Web app: https://5chan.app
- Decentralized web app via IPFS/IPNS gateways (works on any browser): [5chan.eth.limo](https://5chan.eth.limo), [5chan.eth.link](https://5chan.eth.link), [5chan-eth.ipns.dweb.link](https://5chan-eth.ipns.dweb.link)
- Decentralized web app via IPFS node you run: https://5chan.eth (works on [Brave Browser](https://brave.com/) or use [IPFS Companion](https://docs.ipfs.tech/install/ipfs-companion/#prerequisites))

## Downloads

${downloads}

## Changes

${releaseChangelog}`;

console.log(releaseBody);
