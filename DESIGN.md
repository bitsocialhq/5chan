---
version: alpha
name: 5chan
description: A decentralized imageboard with a classic imageboard user experience.
colors:
  yotsuba-body-bg: "#ffffee"
  yotsuba-reply-bg: "#f0e0d6"
  yotsuba-mobile-reply-bg: "#f5e9e1"
  yotsuba-border: "#d9bfb7"
  yotsuba-title: "#880000"
  yotsuba-link: "#0000ee"
  yotsuba-hover: "#ff0000"
  yotsuba-name: "#117743"
  yotsuba-subject: "#cc1105"
  yotsuba-greentext: "#789922"
  yotsuba-b-body-bg: "#eef2ff"
  yotsuba-b-reply-bg: "#d6daf0"
  yotsuba-b-border: "#b7c5d9"
  yotsuba-b-title: "#af0a0f"
  yotsuba-b-link: "#34345c"
  futaba-body-bg: "#ffffee"
  modal-preview-bg: "#181f24"
  neutral-white: "#ffffff"
  neutral-black: "#000000"
typography:
  board-title:
    fontFamily: "Tahoma, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
  form-label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "10pt"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  mobile-post:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "11pt"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
rounded:
  square: "0"
spacing:
  page-edge: "5px"
  field-padding: "2px"
  compact-padding: "0.5em"
  hairline: "1px"
components:
  desktop-text-button:
    textColor: "{colors.yotsuba-link}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0"
  mobile-button:
    backgroundColor: "{colors.yotsuba-reply-bg}"
    textColor: "{colors.yotsuba-title}"
    typography: "{typography.form-label}"
    rounded: "{rounded.square}"
    padding: "3px 5px"
  input:
    backgroundColor: "{colors.neutral-white}"
    textColor: "{colors.neutral-black}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "2px"
  reply-surface:
    backgroundColor: "{colors.yotsuba-reply-bg}"
    textColor: "{colors.yotsuba-title}"
    rounded: "{rounded.square}"
---

## Overview

**Creative North Star: "The Preserved Imageboard"**

5chan's visual system is intentionally conservative. The product should feel like a classic imageboard with a decentralized substrate, not like a redesigned forum or a modern community platform. The default answer for any board, thread, catalog, post, reply, or post-form UI is to preserve familiar imageboard density, typography, color, and interaction shape.

Most surfaces are flat, compact, text-first, and visibly old web. Controls may look plain by modern standards because that plainness is part of the product promise. New decentralized features should enter through the same visual language: small links, square fields, compact tables, simple modal bars, terse labels, and theme-aware colors.

**Key Characteristics:**

- Dense layouts with minimal padding.
- Square edges and 1px borders.
- Arial/Helvetica body text with Tahoma board titles.
- Yotsuba, Yotsuba B, and Futaba-style palettes as first-class themes.
- Text links and bracketed actions over large button components.
- Visual compatibility with classic imageboard user expectations.

## Colors

The palette is inherited from classic imageboard themes and should remain recognizable. Use the existing CSS variables in `src/themes.css` as the source of truth for implementation.

### Primary

- **Yotsuba Body** (`#ffffee`): default warm page background for NSFW-style boards.
- **Yotsuba Reply** (`#f0e0d6`): reply containers, modal surfaces, pagination, menu backgrounds, and compact UI panels.
- **Yotsuba Title Red** (`#880000`): board headers, bars, button text, and theme-defining chrome.
- **Yotsuba B Body** (`#eef2ff`): default cool page background for SFW-style boards.
- **Yotsuba B Reply** (`#d6daf0`): reply containers and panel surfaces in the blue theme.

### Secondary

- **Classic Link Blue** (`#0000ee` / `#34345c`): links, post actions, desktop text buttons, and navigational affordances.
- **Hover Red** (`#ff0000` / `#dd0000`): hover states for links and compact actions.
- **Name Green** (`#117743`): poster names and identity markers.
- **Subject Red** (`#cc1105`): post subjects and title emphasis.
- **Greentext** (`#789922`): quote text and imageboard-specific content convention.

### Neutral

- **Black** (`#000000`): body text in light themes and table borders where the original style calls for it.
- **White** (`#ffffff`): homepage boxes, input fields, and legacy modal surfaces where defined by the theme.
- **Hairline Borders** (`#d9bfb7` / `#b7c5d9`): dividers, reply borders, modal edges, pagination, and mobile post separators.
- **Preview Dark** (`#181f24`): catalog and quote preview overlays only.

### Named Rules

**The Theme Fidelity Rule.** Use existing theme variables before adding new colors. If a color is needed for a new feature, derive its role from the closest established imageboard component in the active theme.

**The No Modern Accent Rule.** Do not introduce a new brand accent, gradient palette, neon crypto palette, or marketing color system for core product UI.

**The Functional Color Exception.** Small, deterministic per-entity colors used as data — for example a hashed swatch that gives each connected peer a stable identity — are allowed. Render them as flat, square, small indicators (not gradients, glows, or large fills). This exception is for conveying data, not for decoration or branding.

## Typography

**Display Font:** Tahoma, sans-serif.
**Body Font:** Arial, Helvetica, sans-serif.
**Label/Mono Font:** Use inherited body fonts unless a compact error or technical address requires monospace.

**Character:** Typography should feel like a browser-native imageboard, not a designed publication. Small sizes, simple weights, default line wrapping, and dense text are expected.

### Hierarchy

- **Board Title** (bold, `28px`, Tahoma): board names and top-level board identity.
- **Box Heading** (bold, `131%`, Arial/Helvetica): homepage bars and compact panel headings.
- **Body** (regular, `13px`, Arial/Helvetica): global app text, board chrome, metadata, and link rows.
- **Post Content** (regular, `11pt` on mobile): comment bodies and mobile post content.
- **Form Label** (bold, `10pt`): post form field headers, modal bars, and compact control labels.
- **Small Metadata** (`9pt` to `10pt`): board bars, file info, timestamps, addresses, and post counts.

### Named Rules

**The Browser-Native Rule.** Do not add custom web fonts, variable-font display systems, negative letter spacing, oversized headings, or marketing typography to product surfaces.

## Layout

Layouts are dense, compact, and text-first, mirroring classic imageboard information density. Spacing is small and deliberate rather than generous, and structure comes from tables, inline rows, and slash-separated links instead of large spaced-out cards.

- **Page edge** (`5px`): outer gutters around boards, catalogs, and threads.
- **Field padding** (`2px`): inputs, table cells, and compact controls.
- **Compact padding** (`0.5em`): reply blocks, menus, and small panels.
- **Hairline** (`1px`): borders and separators between rows, posts, and panels.

Desktop and mobile intentionally differ: desktop stays maximally compact, while mobile raises tap-target and text sizes only as much as needed to stay usable and avoid browser zoom.

### Named Rules

**The Density Rule.** When in doubt, choose the more compact layout. Whitespace is not a feature on core imageboard surfaces.

## Elevation & Depth

5chan is flat by default. Depth is conveyed through background color, 1px borders, hard separators, and occasional legacy-style hard shadows on small menus. Avoid soft elevation, glass, blur, ambient shadows, floating cards, and layered dashboard surfaces.

### Shadow Vocabulary

- **Small Legacy Menu Shadow** (`box-shadow: 2px 2px 0 1px rgba(0, 0, 0, .1)`): small popover menus such as compact filters, when a flat border alone is not enough.

### Named Rules

**The Flat Surface Rule.** If a surface can be separated with a border or theme background, do that instead of adding shadow.

## Shapes

5chan is uniformly square. Corner radius is `0` everywhere on product surfaces, and structure comes from 1px theme borders rather than rounding or elevation.

- **Corners:** square (`0` radius) on buttons, inputs, cards, replies, modals, and menus.
- **Borders:** 1px theme border colors (for example Yotsuba `#d9bfb7`, Yotsuba B `#b7c5d9`).
- **Indicators:** functional per-entity swatches render as small flat squares, never rounded chips.

### Named Rules

**The No Rounding Rule.** Do not introduce `border-radius`, pill, capsule, chip, or rounded badge shapes on product UI. A label is square text, not a rounded token.

## Components

### Buttons

- **Shape:** square corners (`0` radius).
- **Desktop:** prefer text links, bracketed actions, or image-backed icon buttons over filled button components.
- **Mobile:** use theme-colored rectangular buttons with compact padding, bold `10pt` text, and existing button fade assets.
- **Hover / Focus:** hover changes color to the theme hover red; focus must stay visible and keyboard accessible.

### Cards / Containers

- **Corner Style:** square.
- **Background:** theme surfaces such as Yotsuba reply, Yotsuba B reply, homepage white, or the active post/mobile background token.
- **Shadow Strategy:** none except the small legacy menu shadow.
- **Border:** 1px theme borders.
- **Internal Padding:** compact, commonly `2px`, `5px`, or `0.5em`.
- **Hover:** do not change a row's or card's background on hover, and do not add CSS transitions or animations to them. Reserve hover feedback for text-link color changes.
- **Inline labels:** plain text, bold for emphasis. Do not wrap labels (tags, statuses, transports, counts) in pill, capsule, chip, or rounded badge shapes; a label is text, not a button.

### Inputs / Fields

- **Style:** square native fields, white or theme-defined background, `1px solid #aaa` by default.
- **Focus:** border shifts to the theme focus color, such as Yotsuba `#ea8`.
- **Sizing:** preserve compact desktop sizes; on mobile, raise text size where needed to prevent browser zoom.

### Navigation

- **Boards bar:** compact slash-separated board links, small text, theme separators, no pill navigation.
- **Pagination:** small flat cells using theme background and border colors.
- **Directory navigation:** preserve classic board code patterns such as `/a/`, `/b/`, and category groupings.

### Posts And Replies

- **Post metadata:** compact inline text, subject red, name green, timestamps, IDs, roles, and action links in the expected order.
- **Replies:** theme-colored blocks with square borders and minimal padding.
- **Greentext and quote links:** preserve classic color behavior and hover states.
- **Media:** thumbnails should fit the existing imageboard layout and should not create modern card previews unless the current surface already uses that pattern.
- **Emoji and text faces:** pass post text through as raw Unicode. Do not add an emoji picker, shortcode/emote system, or Twemoji-style emoji rendering. Kaomoji and ASCII / Shift-JIS art are the native text-face vocabulary; preserve them and their alignment where used. See `PRODUCT.md` → Text and Expression for the rationale.

### Modals And Popovers

- **Style:** compact movable bars, square borders, theme backgrounds, and legacy close icons where available.
- **Copy:** short labels and direct status messages.
- **Behavior:** custom features such as challenges, settings, and posting flows should feel like imageboard utilities, not app dialogs.

## Do's and Don'ts

### Do

- Start UI changes by checking the closest established imageboard behavior and the existing 5chan implementation.
- Preserve theme variables and add new variables only when a new role is genuinely needed.
- Keep layouts dense, square, and text-first.
- Make decentralized concepts understandable without redesigning the familiar browsing flow.
- Verify desktop and mobile because 5chan intentionally has different post and control treatments across viewports.

### Don't

- Do not modernize core imageboard UI for taste.
- Do not add rounded cards, gradient hero areas, glass panels, soft shadows, dark-mode defaults, or large marketing sections to product surfaces.
- Do not use pill, capsule, chip, or rounded badge shapes for labels, tags, statuses, transports, or counts.
- Do not add hover background fills, color fades, or CSS transitions/animations to rows, cards, or list items.
- Do not replace compact text links with large icon-button toolbars unless the existing surface already uses that pattern.
- Do not introduce a new design system that competes with Yotsuba, Yotsuba B, Futaba, or the existing theme variable model.
- Do not make Bitsocial, crypto, or decentralization visuals dominate routine browsing.
- Do not add an emoji picker, emoji shortcode/emote system, or Twemoji-style emoji rendering; emoji pass through as raw Unicode only.
