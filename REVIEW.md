# Narrator plugin review — 2026-09-05

Reviewed API integration, streaming audio, plugin command/save paths, status-bar
controls, settings, tests and the newly added Forgejo workflow. Existing uncommitted
test/dependency changes were preserved; improvements were applied on top.

## Fixed

- **High: backend streaming errors were ignored.** The backend emits status:error/error,
  while the plugin only recognized type:error/message. Both forms now terminate the
  stream and report an error to the user.
- **High: cancellation could still save audio** when a delayed completion callback had
  already been scheduled. Streams now settle once and cancellation clears completion.
- **Medium: unexpected socket closure left the operation hanging.** It now reports a
  retryable failure. Normal closure after the final frame still permits playback/export.
- **Medium: asynchronous audio handlers could race the final frame.** Frames now run
  through a shared sequential queue, used by text and script narration.
- **Medium: pausing could truncate playback.** Completion now checks audio playback time
  rather than a fixed wall-clock delay, allowing pause/resume before export.
- **Medium: delayed chunks could overlap.** Scheduling now clamps to current AudioContext
  time before extending the queue. Destroy is idempotent, releases collected chunks,
  and prevents late arrivals from scheduling more audio after cancellation.
- **Medium: old streams survived replacement/unload.** Status-bar replacement and plugin
  cleanup now cancel the active stream before discarding its controls.
- Configured OpenRouter credentials now use the backend's x-openrouter-api-key header.
- Playback controls are native buttons, enabling keyboard focus and activation.
- Narration file-save failures now reach the existing error notice instead of becoming
  unhandled promise rejections in all three narration commands.

## Tests and CI

Baseline: 47 tests passed, as did build and lint. After changes: **57 tests pass**;
TypeScript/build and lint pass. Coverage is **86.94% statements** for the configured
API/utils scope. That is not whole-plugin coverage: main, settings and components are
outside this scope. The real audio player is now included, with direct unit tests.

New streaming regressions cover backend error frames in both entry points, premature
close, cancellation after finalComplete, server close after finalComplete, and paused
playback. Audio tests cover delayed chunks, pause behavior and destruction. The API
client test checks the exact header expected by the backend.

The tests under e2e are integration-style tests with Obsidian/network/audio mocks.
They do not load the plugin inside Obsidian or exercise a live backend. That missing
contract layer explains why both repositories' original suites passed despite the
incompatible error frames. Workflow labels now describe integration tests accurately.

The workflow already pins checkout and setup-node, freezes pnpm's lockfile, runs lint,
build and coverage, disables persisted checkout credentials and limits execution time.
Removed an unused PNPM_STORE_DIR declaration. Fork PRs are skipped; this job condition
is not a replacement for runner isolation and the instance's
[Forgejo PR execution policy](https://forgejo.org/docs/latest/user/actions/security-pull-request/).

**This workflow is CI only.** It does not publish a plugin release or deploy to a vault.
JUnit is generated but not uploaded, and coverage has no threshold. No actual Forgejo
run, Obsidian session or live audio generation was performed in this review.

## Remaining priorities

1. **Medium: test the real user flows.** Add Obsidian smoke coverage for start/pause/stop,
   switching narration, unload, failed output writes, and settings refresh. Mock-based
   transport tests should be supplemented by a shared backend contract test fixture.
2. **Medium: settings failure states.** Empty voice/model caches are shown as loading even
   after fetch failure. Track loading/error/empty states separately and expose Retry.
3. **Medium: durable long narration.** Audio is retained in memory until playback completes.
   For long manuscripts, separate generation/export from playback and add progress plus
   a resumable job API. This requires a coordinated backend/client design.
4. **Medium: script representation.** Parsing helpers assume character tags on separate
   lines in places while generated scripts use inline tags. Unify parsing around one
   documented grammar and safely quote AI-generated character names in YAML properties.
5. **Medium: release pipeline.** Produce and retain main.js, manifest.json and styles.css
   from the tested commit; validate manifest/package versions before publishing a tagged
   release. Add report retention and an agreed coverage gate.
6. Include test files in a separate TypeScript check; Vitest transpiles them but the
   current production tsconfig excludes them. Keep the existing production build focused.

Behavior change: starting another narration cancels the previous one; stopping cancels
its export, and audio-save failures are visible to the user. Keyboard accessibility was
improved in code but has not been manually checked against Obsidian themes.
