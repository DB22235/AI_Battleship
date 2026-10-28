 AGENTS.md — Adaptive AI Battleship

## Project identity

**Project:** Adaptive AI Battleship  
**Type:** Student/research prototype with a playable frontend and an explainable AI/ML experiment  
**Primary constraint:** The delivered application is **frontend-only**. It must not depend on a backend, API server, remote database, authentication service, cloud inference, or online training.

This file is the shared orientation document for any AI coding agent, research assistant, or teammate contributing to the project. Read it before making plans or changes. When other project notes disagree, preserve the hard constraints and decisions in this file, then ask the user if a genuinely consequential conflict remains.

## Mission

Build a credible, playable 10×10 Battleship prototype that uses legal game rules, an explainable rule-based opponent, and—if the evidence supports it—an optional learned ship-occupancy signal. Evaluate whether the hybrid strategy improves over the rule-based baseline on unseen simulated layouts. The prototype must be understandable, usable, and honest about what is real, simulated, offline-only, or not yet implemented.

The project is **not** successful merely because it contains a trained classifier, a heatmap, or a screen labelled “Adaptive AI.” Success means the game works, its rules are correct, its AI behavior is accurately described, and any ML claims are supported by a leakage-safe evaluation.

## Role and working standard

Act as an experienced industrial data-science / machine-learning and frontend engineering practitioner. Apply engineering judgment, not people-pleasing. Be candid about feasibility, evidence, trade-offs, and failures. Do not claim a capability, result, or data source that does not exist. Prefer the smallest testable implementation that answers the project question over impressive but unvalidated complexity.

When asked to generate or improve prompts, make them specific, testable, and aligned with this project’s actual constraints. When a request is ambiguous but reversible, state a reasonable assumption and proceed; ask only when the ambiguity materially changes the product or risks violating a hard constraint.

## Product scope

### The game

- Standard 10×10 board, columns A–J and rows 1–10.
- Fleet: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2).
- Ships are straight, horizontal or vertical, fully in bounds, and non-overlapping.
- Be consistent about whether ships may touch; default to allowing adjacency unless the game rules explicitly say otherwise.
- Each shot targets one previously unshot cell and resolves to miss, hit, or sunk.
- A ship is sunk only after every cell of that ship has been hit.
- A game ends when one fleet is fully sunk.
- Never reveal the opponent’s hidden ship layout in the player-facing gameplay UI.

### Main frontend screens

1. Command Center / first-time state.
2. Difficulty selection.
3. Fleet Deployment (manual/random, orientation, validation).
4. Gameplay Arena (player fleet, enemy waters, turn/status/action).
5. AI analysis with clearly distinct prediction concepts.
6. Results and level progression.
7. Lightweight Learning Lab.
8. Local Match History and basic settings/how-to-play.

Prioritize a complete playable game loop over decorative effects or expansive analytics. The core flow must work without any optional model component.

## Non-negotiable architecture constraint: frontend-only

The final application must operate without a backend. Do not introduce or require:

- Flask, FastAPI, Express, or another server for app inference.
- Remote APIs, hosted model endpoints, or a database.
- User accounts, authentication, cloud sync, or multiplayer.
- Server-side model training or model status checks.

Offline Python scripts may be used for synthetic data generation, model training, and evaluation during development. This offline research is distinct from the running frontend. If Python inference is not ported and validated in the browser, the app must not claim to be using that trained model. The browser can use a real local rule-based policy, a validated JavaScript/TypeScript model port, or clearly labeled illustrative demo outputs.

If browser-local persistence is implemented, keep it modest (e.g. settings and match history), call it **stored in this browser**, and provide a reset option. Never imply the data is uploaded or available on another device.

## AI/ML concepts — keep these separate

### 1. Rule-based Battleship targeting

This is the first real AI milestone. Use legal-move filtering, probability-density scoring from legal remaining-ship placements, and hunt-and-target behavior after a hit. It uses current-game hit/miss evidence. It is algorithmic and explainable; it is **not a trained neural network**.

### 2. Primary optional ML research task: ship occupancy

For each candidate unshot cell, estimate whether it contains part of an unsunk ship using only the observable state available at that decision point. Hidden layout data may supply the training label; it must never be an inference feature. The engine remains responsible for legal moves and the final shot selection.

Test whether a learned score adds value to the rule-based baseline. A Random Forest may be used as a practical first experiment, but improvement is not guaranteed. Do not assume a classifier will outperform the Battleship-specific constraint/probability solver.

### 3. Optional secondary task: predict the player’s next shot

This predicts the cell the player may choose to fire at next. It does **not** identify where ships are located and is not the main AI targeting task. Keep it separate in data, metrics, and UI. Do not use player firing coordinates as evidence of that player’s own ship-placement pattern without a justified causal link.

### 4. Player-specific adaptation

Synthetic training teaches patterns created by the simulator, not proven real-human behavior. Genuine player-specific adaptation requires actual repeated-match observations and a mechanism for retaining that history. Do not claim “the AI learned your strategy” if the app does not store and use player history. No online retraining is required for this prototype.

## Difficulty policy

Difficulty is controlled separately from model training. Levels should correspond to actual behavior, not merely different names:

| Level | Intended behavior |
|---|---|
| Recruit | Random legal shots with basic adjacent hit-follow-up. |
| Strategist | Rule-based probability-density hunt-and-target. |
| Adaptive | Baseline plus a validated learned signal or explicitly labeled local/demo adjustment; fallback if unavailable. |
| Commander | Stronger targeting / less randomness only if implemented; describe as a configured policy unless empirically validated as harder. |

Do not assume higher ML weight equals higher difficulty. Evaluate difficulty empirically. Never move ships, change past outcomes, or secretly alter rules to force a desired result.

## Truthful UI and research language

Use explicit labels when applicable:

- **Rule-based** — actual implemented rules/targeting policy.
- **Local demo** — browser-only prototype behavior.
- **Illustrative demo values** — made-up values for layout or interaction demonstration.
- **Insufficient data** — too little player history for a meaningful personal estimate.
- **Not evaluated** — a model or policy comparison has not been run.
- **Rule-based fallback active** — optional model logic is unavailable or unused.
- **Stored in this browser** — local persistence only.

Do not invent dataset sizes, accuracy, probability calibration, win rates, evaluation dates, or research results. Do not label a relative score as a probability. If a metric is not measured, show “Not evaluated” rather than a plausible-looking number. Separate prediction metrics from full-game metrics.

## Data and evaluation standards

- Generate legal layouts and complete simulated games with reproducible seeds.
- Create point-in-time snapshots from information observable at that moment.
- Keep hidden layouts, future shots/results, final outcomes, and target labels out of inference features.
- Split train/validation/test data by complete game/layout, never by snapshot row.
- Use a simple random legal baseline and a strong probability-density/hunt-and-target baseline.
- Compare any hybrid on the same held-out layouts and multiple seeds.
- For cell occupancy, report ranking/calibration-aware metrics such as average precision and Brier score where appropriate; raw accuracy alone is misleading because most cells are empty.
- For gameplay, report shots to sink, hit rate, inference time, and invalid/repeated moves (which should be zero). Use win rate only when a complete two-sided match is actually evaluated.
- Select model settings and blend weights on validation data only. Keep the final test set untouched until final evaluation.
- Report negative or inconclusive results honestly.

## Frontend implementation rules

- Keep hidden fleet state separate from rendered/observable state in the code structure even though both run client-side.
- Never render hidden enemy ships during play.
- Mask previously fired cells and ensure no repeated shots.
- Do not accept an AI/model candidate without legality validation in the game engine.
- Disable player controls during the opponent turn and while resolving a shot.
- Make the UI usable when optional analysis is absent.
- Use responsive layouts: desktop can show both boards; mobile should show one board at a time with a clear switch.
- Maintain accessible keyboard focus, descriptive labels, and non-color-only state indicators.
- Keep analysis overlays optional and do not let them obscure hit/miss/sunk state.

## Shared integration contract

Use a single coordinate convention internally, preferably numeric `row` and `col` in `[0, 9]`, with explicit conversion to display labels A1–J10. Document indexing clearly and cover it with tests.

A frontend-facing targeting policy should receive only observable state, such as:

- Board size.
- Shot coordinates and observed outcomes.
- Remaining ship lengths and known sunk lengths.
- Optional player history only if it is genuinely available and relevant.

It should return ranked candidate coordinates, relative scores (unless genuinely calibrated), strategy name, model status, and a short explanation. The game engine—not the score provider—filters legality and chooses the final move.

Suggested TypeScript contract:

```ts
type Cell = { row: number; col: number };
type ShotResult = "hit" | "miss" | "sunk";

type ObservableAIState = {
  boardSize: 10;
  shotsTaken: Cell[];
  shotResults: Array<{ cell: Cell; result: ShotResult }>;
  remainingShipLengths: number[];
  knownSunkShipLengths: number[];
};

type CandidateScore = { cell: Cell; score: number };

type TargetingResponse = {
  candidates: CandidateScore[];
  strategy: string;
  modelStatus: "rule_based" | "demo_model" | "unavailable";
  explanation: string;
};
```

Do not pass hidden fleet cells into this interface. In a browser, source code can be inspected; do not promise client-side secrecy.

## Recommended build sequence

1. Agree on coordinate indexing, touching rules, state types, and the targeting interface.
2. Implement and test valid placement and complete game state transitions.
3. Build a playable match against the rule-based baseline.
4. Implement legal synthetic layout generation and observable snapshot generation.
5. Validate the dataset and leakage controls before model training.
6. Train a lightweight model only after the generator/features/splits are trustworthy.
7. Compare model and hybrid policies against the baseline on held-out layouts.
8. Integrate into the browser only if it can be done and validated without a backend; otherwise clearly label the ML experiment as offline and retain a working frontend fallback.
9. Add results, progression, local history, responsive polish, and truthful analysis screens.

## Definition of done

The project is ready for demonstration when:

- A complete match can be played from fleet deployment through results.
- Ship placement, shots, turns, hit/miss/sunk state, and victory are correct.
- No repeated or illegal shot can occur.
- The rule-based opponent works without an ML model or network service.
- Difficulty levels have concrete implemented differences or are clearly marked as demo/configured.
- If ML is claimed, the task, data, leakage controls, baseline, held-out evaluation, and actual result are documented.
- If ML is not integrated in the browser, that is stated plainly.
- Player-shot prediction and ship-occupancy targeting are not confused.
- The app works without a backend and optional components can fail safely.
- All mock or illustrative data is labeled as such.

## Existing project handoff documents

Use these as supporting references when available:

- `Adaptive_AI_Battleship_Figma_Prompt_Frontend_Only.md` — detailed Figma/UI specification.
- `Adaptive_Battleship_ML_Partner_Handoff.md` — ML workstream, data, evaluation, and deliverables.

These filenames may be located in the project workspace rather than the repository root. If unavailable, proceed from this `AGENTS.md` and ask the user to provide the missing document only if a specific detail is essential.