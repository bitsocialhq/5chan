[![Build Status](https://img.shields.io/github/actions/workflow/status/bitsocialnet/5chan/ci.yml?branch=master)](https://github.com/bitsocialnet/5chan/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://bitsocialnet.github.io/5chan/badges/coverage.json)](https://github.com/bitsocialnet/5chan/blob/master/scripts/write-coverage-badge.mjs)
[![React Doctor](https://img.shields.io/endpoint?url=https://bitsocialnet.github.io/5chan/badges/react-doctor.json)](https://github.com/bitsocialnet/5chan/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/bitsocialnet/5chan)](https://github.com/bitsocialnet/5chan/releases/latest)
[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-red.svg)](https://github.com/bitsocialnet/5chan/blob/master/LICENSE)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/bitsocialnet/5chan)

<img src="https://github.com/plebeius-eth/assets/blob/main/5chan-logo.jpg" width="378" height="123">

_Telegram group for this repo https://t.me/fivechandev_

# 5chan

5chan is a serverless, adminless, decentralized and open-source imageboard built on the [Bitsocial protocol](https://bitsocial.net). It features the classic imageboard directory structure, but with a crucial difference: **anyone can create and own boards, and multiple boards can compete for each directory slot**.

## Key Features

### Decentralized Board Ownership
Unlike traditional imageboards, 5chan has no global admins or central authority. Anyone can create unlimited boards using [5chan Board Manager](https://github.com/bitsocialnet/5chan-board-manager). Each board owner runs their own P2P node that users connect to peer-to-peer, giving them complete control over their board's content, moderation, and rules.

### Competitive Directory System
5chan maintains the familiar imageboard directory structure (Japanese Culture, Video Games, Interests, Creative, etc.), but introduces competition: **multiple boards can compete for each directory slot**. For example, there can be unlimited "Business & Finance" boards, but only the highest-voted one appears in the directory on the homepage.

Currently, directory assignments are temporarily handpicked by developers through GitHub pull requests. In the future, each directory will have its own voting page. 5chan Pass holders are expected to participate in directory voting, while final governance mechanics are still being designed to include BSO-holder alignment instead of pass-only final control.

### How It Works

- **Current System**: Developers manually curate directory assignments by reviewing pull requests to the [5chan-directories.json](https://github.com/bitsocialnet/lists/blob/master/5chan-directories.json) file.

- **Future System**: Each directory will have its own voting page listing the boards competing for that slot. 5chan Pass holders are expected to participate in directory voting, while final governance mechanics are still being designed to include BSO-holder alignment instead of pass-only final control.

- **Accessing Boards**: Users can access any board at any time using its address, regardless of directory assignment. Boards can be accessed via the search bar, by subscribing to them (which adds them to the top bar), or by directly navigating to their address.

### Future Roadmap

#### In-App Board Creation

Creating boards directly from the 5chan web app (5chan.app) is planned. This requires connecting via RPC to a bitsocial node—technically already possible, but there's no default connection configured. A default connection would require a public RPC service (similar to what Infura provides for crypto wallets, but for bitsocial nodes). This would allow all users to be connected to a P2P node by default using a free tier subscription in the background, potentially monetized via ads injected in the RPC service-owned boards.

#### Directory Voting

Directory voting pages are planned for each slot on 5chan. These pages will list the competing boards for that directory, and 5chan Pass holders are expected to participate in voting. Final governance mechanics are still being designed to include BSO-holder alignment instead of pass-only final control.

## Downloads

- **Web version**: https://5chan.app (also available using Brave/IPFS Companion on https://5chan.eth)
- **Desktop version** (full P2P bitsocial node, seeds automatically): Available for Mac/Windows/Linux, [download from the release page](https://github.com/bitsocialnet/5chan/releases/latest)
- **Mobile version**: Available for Android, [download from the release page](https://github.com/bitsocialnet/5chan/releases/latest)

## Creating a Board

In the bitsocial protocol, a 5chan board is called a _community_. To deliver the expected 5chan imageboard UX, a board should run on a bitsocial node together with [5chan Board Manager](https://github.com/bitsocialnet/5chan-board-manager). The board manager applies imageboard-style lifecycle rules that bitsocial communities do not enforce by themselves: thread limits, bump limits, archived-thread retention, and purging of author-deleted content.

To create and run a board:

1. Follow the Docker Compose flow in the [5chan-board-manager README](https://github.com/bitsocialnet/5chan-board-manager#docker-compose-recommended);
2. Create your community and add it to 5chan Board Manager using the commands shown there;
3. Keep the manager running so it can apply 5chan board behavior such as thread archiving, bump limits, and retention cleanup.

Once created, anyone can connect to your community using any bitsocial client (such as 5chan) by using the community address. The address is not stored in any central database—bitsocial is a pure peer-to-peer protocol.

Without 5chan Board Manager, a community can still be opened in 5chan, but it will not behave like a conventional imageboard board: old threads will not be archived when they fall past the last page, bump limits will not be enforced, archived threads will not be purged after the retention window, and author-deleted content will not be automatically purged.

**Note**: Creating boards directly from the 5chan web app is planned for the future (see [Future Roadmap](#future-roadmap)).

## Submitting Your Board to a Directory

To have your board appear in a directory on the 5chan homepage:

1. Ensure your board meets these requirements:
   - Active and well-moderated
   - Relevant to the directory category
   - **99% uptime** (since a board acts like its own server—it's a P2P node)

2. Open a pull request on GitHub by editing the [5chan-directories.json](https://github.com/bitsocialnet/lists/blob/master/5chan-directories.json) file

3. Add your board's entry with:
   - Title: in the format `/directoryCode/ - Title`, e.g. "/biz/ - Business & Finance";
   - Address: the bitsocial community address, whether IPNS key (`12KooW...`) or readable crypto address (`mydomain.eth`);
   - NSFW status: `true` or `false`, must match the standard classification for the directory code.

4. The developers will review your PR and merge it if approved

**Note**: Even if your board isn't assigned to a directory, users can still access it at any time using its bitsocial community address. Directory assignment only affects visibility on the homepage.

## Development

### Prerequisites

- Node.js 22.12.0, pinned in [`.nvmrc`](./.nvmrc)
- Corepack enabled once per machine: `corepack enable`

### Contributor Setup

1. Run `nvm install && nvm use`
2. Run `corepack enable` once
3. Use plain `yarn install`, `yarn build`, and `yarn test`

### Setup

1. Clone the repository
2. Install dependencies: `yarn install`
3. Start the web client: `yarn start`

The dev server normally runs at https://5chan.localhost via [Portless](https://github.com/vercel-labs/portless), which gives each Bitsocial project a stable, named URL instead of a random port. Portless 0.11 serves this URL through an HTTPS proxy on port 443, so the first `yarn start` after install or proxy reset may prompt for sudo; accept the prompt so the URL can stay portless. On non-`master` branches, or when another legacy process is already holding the canonical route, `yarn start` will automatically use a branch-scoped `*.5chan.localhost` URL instead of failing. To bypass Portless and use a plain Vite dev server, run `PORTLESS=0 yarn start`; it will start at `http://localhost:3000` and automatically fall forward to the next free port if `3000` is already in use.

For device testing on a USB-connected Android phone (without relying on `5chan.localhost` DNS from the device):

- `yarn start:android-usb` starts Vite bound to `127.0.0.1` and runs `adb reverse`, so the phone can load the dev site at `http://localhost:3000`. When the server is up, it opens that URL in each connected device’s default browser via `adb`. Set `ANDROID_USB_OPEN_BROWSER=0` to skip auto-open. Requires [Android platform-tools](https://developer.android.com/tools/releases/platform-tools) (`adb` on your `PATH`), USB debugging enabled, and the device showing as `device` in `adb devices`.

### Scripts

- **Web client**: `yarn start` (https://5chan.localhost)
- **Web client (Android phone over USB)**: `yarn start:android-usb` (see above)
- **Electron client** (must start web client first): `yarn electron`
- **Electron client** (don't delete data): `yarn electron:no-delete-data`
- **Web client and electron client**: `yarn electron:start`
- **Web client and electron client** (don't delete data): `yarn electron:start:no-delete-data`

### Challenge Types

Bitsocial communities can require users to solve one or more anti-spam challenges before a publication is accepted. 5chan already supports multiple challenge types, including `url/iframe` challenges so [Mintpass](https://github.com/bitsocialnet/mintpass) communities can run their iframe flow directly inside a modal. The modal first shows a hostname confirmation (showing only the host for mintpass.org, full URL otherwise), then opens the HTTPS iframe with the current theme, replaces `{userAddress}` tokens with the signed-in address, and submits automatically when the user finishes.

### Build

The Linux/Windows/macOS/Android build scripts are in [.github/workflows/release.yml](https://github.com/bitsocialnet/5chan/blob/master/.github/workflows/release.yml)

## License

5chan is open-source software (GPL-3.0-or-later) with no owner—anyone can host their own instance on any domain. The operator of any domain is merely hosting the web app and does not own, create, moderate, or control 5chan or any board content, which is stored peer-to-peer and generated by board owners and users.
