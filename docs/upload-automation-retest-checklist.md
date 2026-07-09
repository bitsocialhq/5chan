# Upload Automation Retest Checklist

Retest checklist for Android and desktop after changes to media upload automation (`MediaUploadAutomationRunner`, `MediaUploadRecipes`, `upload-orchestrator`, etc.).

## Quality Gate (blocking)

Run before merge/rollout. All must pass.

| Command | Purpose | Interpretation |
|---------|---------|----------------|
| `yarn test` | Unit tests (Vitest) | Exit 0 = pass. Fix failing tests before merge. |
| `yarn build` | Production build | Exit 0 = pass. No build errors. |
| `yarn lint` | Lint (oxlint) | Exit 0 = pass. Fix lint errors. |
| `yarn type-check` | TypeScript (tsc) | Exit 0 = pass. Fix type errors. |
| `yarn doctor` | React Doctor | Advisory. Prioritize `error` > `warning`. |

**Quick run (all quality gates):**

```bash
yarn retest:quality
```

---

## Imgur chooser contract (required local gate)

Runs imgur-specific emulator contract tests against deterministic fixtures. **Emulator required.** Must pass before merge.

```bash
yarn contract:imgur
```

- **Prereq:** Android emulator running or USB device connected.
- **Interpretation:** Exit 0 = contract tests pass. Runs `MediaUploadAutomationRunnerTest` (imgur chooser contract + generic fixtures). Uses deterministic fixtures in `android/app/src/main/assets/fixtures/`.

---

## Android Emulator Verification (report-only)

Instrumentation tests run on an **emulator or physical device**. Requires an emulator/device to be running and connected.

### Standard run

```bash
yarn android:connectedTest
```

Or directly (uses UTP workaround for protobuf compatibility):

```bash
cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.experimental.androidTest.useUnifiedTestPlatform=false
```

- **Prereq:** Emulator running (`emulator -avd <avd_name>` or Android Studio) or USB device.
- **Interpretation:** Exit 0 = all instrumented tests pass. `MediaUploadAutomationRunnerTest` exercises fixtures in `android/app/src/main/assets/fixtures/`.

### UTP / Protobuf issue (known)

On some setups, `connectedDebugAndroidTest` fails with protobuf classloader conflicts (e.g. `IllegalAccessError` involving `com.google.protobuf.CodedInputStream`). This is a known UTP/Espresso + protobuf incompatibility.

**Workaround (disable UTP, use legacy test runner):**

Use this exact command, which passes `-Pandroid.experimental.androidTest.useUnifiedTestPlatform=false` to disable the unified test platform:

```bash
cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.experimental.androidTest.useUnifiedTestPlatform=false
```

> **Caveat:** The `useUnifiedTestPlatform=false` flag may be deprecated in future Android Gradle Plugin versions; if it stops working, use the fallback below.

If the above does not resolve it, exclude conflicting protobuf from Espresso in `android/app/build.gradle`:

```gradle
androidTestImplementation("androidx.test.espresso:espresso-core:3.3.0") {
    exclude group: "com.google.protobuf", module: "protobuf-java"
    exclude group: "com.google.protobuf", module: "protobuf-lite"
}
```

---

## Upload Selector Smoke Run (report-only, non-blocking)

Probes live upload sites (Imgur) to verify selectors in `media-upload-recipes` still match. **Always exits 0**; intended for CI report-only and local triage. **Not a merge gate**—check report for selector drift but do not block.

```bash
yarn smoke:upload-selectors
```

- **Output (report):** `scripts/upload-selectors-smoke-report.json`
- **Output (snapshots):** `scripts/upload-selectors-smoke-snapshots/` (provider PNGs)
- **Interpretation:** Check `summary.ok` vs `summary.warn` in the report. Warnings indicate selectors may need updates; do not block merge without further triage.

---

## Desktop (Electron)

Build and run the Electron app to manually verify upload flows:

```bash
yarn electron:start
```

Unit tests for Electron automation (non-blocking, report-only):

```bash
node electron/media-upload-automation.test.js
node electron/media-upload-recipes.test.js
```

---

## Summary

| Check | Blocking? | Command |
|-------|-----------|---------|
| Quality gate | Yes | `yarn retest:quality` |
| Imgur chooser contract | Yes | `yarn contract:imgur` |
| Android instrumentation | No (report-only) | `yarn android:connectedTest` |
| Upload selector smoke | No (report-only) | `yarn smoke:upload-selectors` |
| Electron unit tests | No (report-only) | `node electron/media-upload-*.test.js` |
