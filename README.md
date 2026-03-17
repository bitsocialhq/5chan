[![Build Status](https://img.shields.io/github/actions/workflow/status/bitsocialnet/5chan/ci.yml?branch=master)](https://github.com/bitsocialnet/5chan/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/bitsocialnet/5chan/badges/badges/coverage.json)](https://github.com/bitsocialnet/5chan/blob/master/scripts/write-coverage-badge.mjs)
[![Release](https://img.shields.io/github/v/release/bitsocialnet/5chan)](https://github.com/bitsocialnet/5chan/releases/latest)
[![License](https://img.shields.io/badge/license-GPL--2.0--only-red.svg)](https://github.com/bitsocialnet/5chan/blob/master/LICENSE)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/bitsocialnet/5chan)

<img src="https://github.com/plebeius-eth/assets/blob/main/5chan-logo.jpg" width="378" height="123">

_Telegram group for this repo https://t.me/fivechandev_

# 5chan

5chan is a serverless, adminless, decentralized and open-source imageboard built on the [Bitsocial protocol](https://bitsocial.net). It features the classic imageboard directory structure, but with a crucial difference: **anyone can create and own boards, and multiple boards can compete for each directory slot**.

## Key Features

### Decentralized Board Ownership
Unlike traditional imageboards, 5chan has no global admins or central authority. Anyone can create unlimited boards using their own [bitsocial node](https://github.com/bitsocialnet/bitsocial-cli). Each board owner runs their own P2P node that users connect to peer-to-peer, giving them complete control over their board's content, moderation, and rules.

### Competitive Directory System
5chan maintains the familiar imageboard directory structure (Japanese Culture, Video Games, Interests, Creative, etc.), but introduces competition: **multiple boards can compete for each directory slot**. For example, there can be unlimited "Business & Finance" boards, but only the highest-voted one appears in the directory on the homepage.

Currently, directory assignments are temporarily handpicked by developers through GitHub pull requests. In the future, this will be fully automated through **gasless pubsub voting** (see [Future Roadmap](#future-roadmap) below), making the process completely decentralized and community-driven.

### How It Works

- **Current System**: Developers manually curate directory assignments by reviewing pull requests to the [5chan-directories.json](https://github.com/bitsocialnet/lists/blob/master/5chan-directories.json) file.

- **Future System**: Directory board assignments will be determined through gasless voting using pubsub. Community members will vote on which board should be assigned to each directory, and the highest-voted board will automatically become the directory board. This creates a competitive marketplace where board quality and community engagement determine directory placement.

- **Accessing Boards**: Users can access any board at any time using its address, regardless of directory assignment. Boards can be accessed via the search bar, by subscribing to them (which adds them to the top bar), or by directly navigating to their address.

### Future Roadmap

#### In-App Board Creation

Creating boards directly from the 5chan web app (5chan.app) is planned. This requires connecting via RPC to a bitsocial node—technically already possible, but there's no default connection configured. A default connection would require a public RPC service (similar to what Infura provides for crypto wallets, but for bitsocial nodes). This would allow all users to be connected to a P2P node by default using a free tier subscription in the background, potentially monetized via ads injected in the RPC service-owned boards.

#### Pubsub Voting

The protocol design for pubsub voting is already drafted in [pkc-js issue #25](https://github.com/pkcprotocol/pkc-js/issues/25). This will enable:
- Gasless voting using pubsub topics
- Weighted voting based on token balances
- Automatic directory resolution based on vote tallies
- Full decentralization without any intermediaries

This feature is on the pkc-js roadmap but hasn't been implemented yet.

## Downloads

- **Web version**: https://5chan.app (also available using Brave/IPFS Companion on https://5chan.eth)
- **Desktop version** (full P2P bitsocial node, seeds automatically): Available for Mac/Windows/Linux, [download from the release page](https://github.com/bitsocialnet/5chan/releases/latest)
- **Mobile version**: Available for Android, [download from the release page](https://github.com/bitsocialnet/5chan/releases/latest)

## Creating a Board

In the bitsocial protocol, a 5chan board is called a _community_. To create and run a community:

1. Install bitsocial-cli, available for Windows, macOS, and Linux: [latest release](https://github.com/bitsocialnet/bitsocial-cli/releases/latest);
2. Follow the instructions in the repo's README;
3. When running the daemon for the first time, it will output WebUI links you can use to manage your bitsocial community with a GUI.

Once created, anyone can connect to your community using any bitsocial client (such as 5chan) by using the community address. The address is not stored in any central database—bitsocial is a pure peer-to-peer protocol.

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

- Node.js v22 (Download from https://nodejs.org)
- Yarn: `npm install -g yarn`
- Portless is installed with project dependencies via `yarn install`

### Setup

1. Clone the repository
2. Install dependencies: `yarn install --frozen-lockfile`
3. Start the web client: `yarn start`

The dev server runs at http://5chan.localhost:1355 via [Portless](https://port1355.dev/), which gives each Bitsocial project a stable, named URL instead of a random port. To bypass Portless and use a plain Vite dev server: `PORTLESS=0 yarn start`

### Scripts

- **Web client**: `yarn start` (http://5chan.localhost:1355)
- **Electron client** (must start web client first): `yarn electron`
- **Electron client** (don't delete data): `yarn electron:no-delete-data`
- **Web client and electron client**: `yarn electron:start`
- **Web client and electron client** (don't delete data): `yarn electron:start:no-delete-data`

### Challenge Types

Bitsocial communities can require users to solve one or more anti-spam challenges before a publication is accepted. 5chan already supports multiple challenge types, including `url/iframe` challenges so [Mintpass](https://github.com/bitsocialnet/mintpass) communities can run their iframe flow directly inside a modal. The modal first shows a hostname confirmation (showing only the host for mintpass.org, full URL otherwise), then opens the HTTPS iframe with the current theme, replaces `{userAddress}` tokens with the signed-in address, and submits automatically when the user finishes.

### Build

The Linux/Windows/macOS/Android build scripts are in [.github/workflows/release.yml](https://github.com/bitsocialnet/5chan/blob/master/.github/workflows/release.yml)

## License

5chan is open-source software (GPLv2 license) with no owner—anyone can host their own instance on any domain. The operator of any domain is merely hosting the web app and does not own, create, moderate, or control 5chan or any board content, which is stored peer-to-peer and generated by board owners and users.
