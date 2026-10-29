# Sonar Scan implementation specification

## Scope

Add one rule-based AI action: one Sonar Scan charge per match. The AI chooses a legal normal shot or a scan centered on an in-bounds 3×3 region. To keep every region exactly 3×3, legal centers are rows and columns 2–9 in display coordinates (zero-based row/col 1–8). A scan counts ship cells in that region that have not already been shot. It returns only the integer count; no coordinates within the region, ship IDs/names, or layout data are returned.

## State and information boundary

The game engine owns the hidden board and computes the aggregate count. The AI policy receives only its observed shots/outcomes, remaining/sunk ship lengths, prior `{center, count}` scans, and whether the charge remains. The API score request and browser-local AI history must not receive hidden fleet cells or per-cell scan results. A scan observation may influence later targeting, but no new trained policy is part of this milestone.

## Action and turn behavior

The AI policy returns a discriminated action: `{ action: 'shot', targetCell }` or `{ action: 'scan', center }`. A scan action must not include a shot target. A shot follows current rules: hits (including sinks) retain the AI turn; misses pass to the player. A scan spends the charge, resolves no shot, increments the round as an ended AI turn, and passes play to the player—even when the AI was on a hit streak. A used charge cannot be used again. With the charge absent or already used, existing targeting behavior is unchanged.

Each decision record includes action type, the shot target or scan center, charge before/after, a summary of observable input, policy/model version, and a concise reason. Scan records include the aggregate result only. No hidden fleet cell, identity, or per-cell sonar result is recorded as an AI feature.

Pause/resume must preserve the pending/current state without duplicating a scan. Game-over state rejects further actions. Existing legality checks remain authoritative for shots and scan centers.

## Test and release gate

Use Node's built-in `node:test` runner (no added package dependency). Cover scan geometry/count/privacy/charge/turn behavior, legacy shot behavior, pause/resume, game over, and repeated shots. Run `npm test` and `npm run build` from `frontend/`. Do not alter the saved occupancy MLP blend weight, train a scan policy, or claim learned power-up use.
