# Low-Spec Device Verification

Use this playbook when you need to know whether loading, navigation, or interaction speed is a real user problem or just an artifact of a fast development machine. It adds CPU + network throttling on top of the normal `playwright-cli` verification flow.

## When to run

- A change touches navigation, data loading, list/feed rendering, images/media, or anything where "is this slow?" matters.
- You cannot tell whether jank or lag is real because the dev machine is high-spec.
- Before claiming a perf-sensitive change "feels fast".

This is an extra pass, not a replacement for the standard Chrome/Firefox/WebKit verification.

## How it works

`playwright-cli` (`@playwright/cli`) has no throttle command, so throttling is applied through CDP via `run-code`. `scripts/pw-throttle.sh` wraps that call. The throttle is set on the page target and persists for the life of the `-s=<session>`, so apply it once, then run the usual `goto` / `snapshot` / `screenshot` commands on the same session.

Throttling is **Chromium-only** (CDP). It does not work on `firefox` or `webkit` sessions — run those engines unthrottled.

## Profiles

| Profile | CPU | Network (down / up / latency) | Models |
|---|---|---|---|
| `mid` | 4x | ~1.6 Mbps / 750 Kbps / 150 ms | mid-tier phone (Lighthouse mobile default) |
| `low` | 6x | ~400 Kbps / 400 Kbps / 400 ms | low-end phone / poor connection |
| `cpu4` | 4x | full speed | isolate JS cost from network |
| `cpu6` | 6x | full speed | isolate JS cost from network |
| `off` | 1x | full speed | reset to normal |

## Usage

```bash
# open a Chromium session, throttle it to a mid-tier phone, then verify as usual
./scripts/pw-session.sh open lowspec https://5chan.localhost --browser=chrome
./scripts/pw-throttle.sh lowspec mid
playwright-cli -s=lowspec snapshot
playwright-cli -s=lowspec screenshot --filename=lowspec-mid.png

# tighten to a low-end device
./scripts/pw-throttle.sh lowspec low

# isolate JS cost (CPU throttle, full-speed network)
./scripts/pw-throttle.sh lowspec cpu4

# reset and finish
./scripts/pw-throttle.sh lowspec off
./scripts/pw-session.sh close lowspec
```

## Measuring, not guessing

Throttled numbers are approximations (CDP throttling, not a real device), but the relative difference is the signal. For the initial page load:

```bash
playwright-cli -s=lowspec eval "() => Math.round(performance.getEntriesByType('navigation')[0].duration)"
```

5chan is a React Router SPA, so in-app navigation does not create a new navigation entry. Time those manually: read `performance.now()` before triggering the route change, then again once the target content appears in the snapshot.

## Caveats

- Chromium-only. Skip on Firefox/WebKit sessions; keep those checks unthrottled.
- Low-spec emulation is a measurement pass, not a machine-resource control. Hold the machine-wide browser slot for the whole pass and close it immediately afterward.
- The `low` latency is intentionally aggressive; if requests time out, fall back to `mid`.
- For render/rerender hotspots after a slow result, use the `profile-browsing` skill (it drives `playwright-cli` + react-scan) on the already-throttled session.
