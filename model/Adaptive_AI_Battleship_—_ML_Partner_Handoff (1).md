# Adaptive AI Battleship — ML Partner Handoff

**Purpose:** This document defines the machine-learning and AI workstream for the Adaptive AI Battleship prototype. It is intended as a direct handoff to the teammate responsible for synthetic data, targeting logic, model experiments, and evaluation.

**Project constraint:** The final product is **frontend-only** and will not use a backend. Offline Python scripts may be used to generate data and evaluate a model during development, but the finished browser prototype must not depend on a Flask/FastAPI service, remote database, server-side model inference, or network API. If a trained Python model cannot be run in the browser, present the work as an offline experiment and use a clearly labeled rule-based or demo fallback in the frontend. Do not claim that the browser app is running the Python model unless that is actually implemented.

---

## 1. Project objective

Build a reproducible AI/ML experiment that tests whether learned placement-pattern information can improve Battleship targeting beyond a strong rule-based solver.

### Primary research question

> On unseen legal ship layouts generated independently of the training data, does a hybrid targeting policy—rule-based probability-density targeting plus a learned ship-occupancy estimate—reduce the number of shots needed to sink the fleet compared with the same rule-based solver alone?

This is the central experimental question. The existence of a trained classifier is not itself evidence of improvement. A result where the hybrid does not outperform the baseline is still a valid finding and should be reported honestly.

### Three separate system responsibilities

| Part | Responsibility | Nature |
|---|---|---|
| Game engine | Enforce valid fleets, legal shots, hit/miss/sunk outcomes, turns, and end conditions. | Deterministic game logic |
| Rule-based targeting | Estimate likely ship cells using legal remaining-ship placements and current evidence; choose a legal unshot cell. | Algorithmic baseline |
| ML model / learned profile | Estimate ship occupancy from observable state and/or learn placement tendencies from prior layouts. | Supervised model experiment; optional in final browser app |

Do **not** confuse these with the separate optional task of predicting where the player will shoot next. Predicting a player’s next shot is not the primary task and does not directly tell the AI where ships are located.

---

## 2. Scope and non-goals

### In scope

- Legal 10×10 Battleship layout generation.
- Simulated opponent/placement styles, with clear labels.
- Simulation of shot sequences and observable board snapshots.
- A strong rule-based probability-density / hunt-and-target baseline.
- A lightweight cell-level ship-occupancy classifier, if time allows.
- A hybrid policy that combines model and rule scores under controlled evaluation.
- Held-out evaluation by complete game/layout and multiple seeds.
- A concise report with actual measured results and limitations.
- Stable frontend-facing score schema, even if the first implementation uses mock scores.

### Out of scope for the first prototype

- Neural networks or deep learning.
- Online retraining during a game.
- Claiming that synthetic data proves real-human behavior.
- Player identity/account systems or cloud-stored profiles.
- Backend inference endpoints or databases.
- Predicting the player’s next click as the primary ML task.
- Screenshot recognition/computer vision.
- Moving ships or changing past outcomes to alter difficulty.

---

## 3. Core game definition

Use a standard 10×10 board. Columns are A–J; rows are 1–10. Each fleet contains the following ships:

| Ship | Length |
|---|---:|
| Carrier | 5 |
| Battleship | 4 |
| Cruiser | 3 |
| Submarine | 3 |
| Destroyer | 2 |

Ships are straight, horizontal or vertical, entirely within board bounds, and do not overlap. Unless the final game explicitly chooses otherwise, ships may touch orthogonally or diagonally; be consistent in the simulator, rule solver, and documentation. Do not silently enforce a no-touching rule if the actual gameplay permits touching.

A legal shot targets an unshot cell. The outcome is miss, hit, or sunk. The model input at a prediction point may contain only information the AI would have observed by that point: prior shot coordinates, outcomes, sunk-ship information if known, remaining ship lengths, and other explicitly available observable features.

The hidden fleet layout may be used to generate the training label for a candidate cell, but must never be supplied as an inference feature.

---

## 4. Primary ML task

### Task definition

For a given game snapshot and candidate unshot cell, estimate:

> **Does this candidate cell contain any part of an unsunk ship, given the observable game state and learned placement patterns?**

For training, the label is binary:

- `1`: the cell contains a ship cell in the hidden layout, and that ship is not already sunk at the snapshot.
- `0`: otherwise.

The engine must mask previously shot cells and enforce legal moves after inference. Model predictions are scores, not guaranteed truth.

### Why cell occupancy instead of predicting one of 100 coordinates

A 100-class next-cell classifier can propose an already-shot or contextually impossible cell. Cell-level occupancy scores let the game engine combine model estimates with remaining-ship constraints, remove illegal candidates, and select a final legal move. The trained model does not own turn logic or the final shot decision.

### Secondary optional task: player-shot prediction

This can be explored only after the primary task works. It predicts where the human player may fire next, based on that player’s prior shot sequence. It is a different target and must have separate data, labels, metrics, and UI explanation. It must never be presented as an estimate of hidden ship locations.

---

## 5. Synthetic data generation

### 5.1 Generate legal fleets first

Write and test a layout generator before generating model examples. Each generated layout should include:

- Unique `game_id` or `layout_id`.
- A documented placement style.
- Per-ship orientation and start coordinate for internal simulation.
- Full hidden occupancy grid for label generation only.
- Validation status: in bounds, no overlap, correct ship lengths.
- Seed or reproducibility metadata.

Suggested synthetic placement styles (choose three or four initially):

1. **Uniform random:** sample uniformly from legal placements, as a baseline.
2. **Edge-biased:** favor placements near board boundaries; define the weighting rule numerically.
3. **Center-biased:** favor central rows/columns; define weighting numerically.
4. **Systematic/conventional:** use a documented deterministic or semi-deterministic placement rule.

A placement style is a simulator label, not a claim about real players. Avoid ambiguous labels unless the implementation defines exactly how the style changes sampling.

### 5.2 Generate snapshots, not just layouts

For every layout, simulate a legal shooter making shots and record successive observable snapshots. Use one or more documented shooter policies, such as:

- Random unshot cells.
- Checkerboard hunt policy.
- Rule-based probability/hunt-and-target policy.

At each snapshot, include only the shot history visible up to that point. For each candidate unshot cell, create a feature row and attach its label from the hidden layout. Ensure the snapshot’s sunk status and remaining ship lengths are valid at that moment.

Do not make one training row per cell using final-game information that would not have existed at that snapshot. Do not accidentally include later shots, final outcome, future hit counts, or hidden board state as features.

### 5.3 Data volume

Start small and verify correctness. A practical target is 500–2,000 games if generation is fast and correct. This is a target, not a guarantee that the model will generalize. A smaller dataset is preferable to a larger dataset with invalid games, feature leakage, or unclear labels.

For every generated dataset, record:

- Generator version or code commit.
- Random seed(s).
- Number of games and snapshots.
- Strategy distribution.
- Date of generation.
- Train/validation/test assignment by game.
- Fleet and touching rules used.

---

## 6. Dataset schema and feature discipline

Use one canonical coordinate representation throughout. Recommended: numeric `row` and `col` in `[0, 9]` internally, with display coordinate derived for UI (e.g. `(row=5, col=3)` → `D6`, depending on indexing convention). Document zero/one-based conversion and test it. Do not mix formats without an explicit conversion function.

### Suggested snapshot-level tables

**`games.csv`** — one row per simulated game/layout:

| Field | Meaning |
|---|---|
| `game_id` | Unique game identifier. |
| `seed` | Seed or reproducibility identifier. |
| `placement_style` | Simulator style used to generate layout. |
| `shooter_policy` | Policy used to generate shots. |
| `winner` | Optional final outcome; post-game only. Do not use as a live feature. |
| `shots_to_sink_all` | Final game outcome metric; post-game only. |

**`snapshots.csv`** — one row per observable decision point:

| Field | Meaning |
|---|---|
| `game_id` | Parent game; used for grouped split. |
| `snapshot_id` | Unique snapshot within game. |
| `turn_index` | Number of observed shots at this snapshot. |
| `shots_taken` | Count observed so far. |
| `sunk_ship_lengths` | Ship lengths known sunk at this time. |
| `remaining_ship_lengths` | Ship lengths still afloat at this time. |
| `history_ref` | Serialized visible shot history or path to it. |
| `current_hit_groups` | Optional observed connected hit components. |

**`candidate_cells.csv`** — one row per candidate cell per snapshot:

| Field | Meaning |
|---|---|
| `game_id` | Parent game; use for grouped split. |
| `snapshot_id` | Snapshot reference. |
| `row`, `col` | Candidate coordinate, numeric and consistently indexed. |
| `is_unshot` | Candidate eligibility; all model rows should be unshot unless explicitly specified. |
| `is_edge`, `is_corner` | Coordinate-derived features. |
| `adjacent_observed_hit_count` | Nearby known hits at the prediction point. |
| `adjacent_observed_miss_count` | Nearby known misses, if useful and consistently defined. |
| `shots_taken` | Number of observed shots at this snapshot. |
| `remaining_ship_count` | Number of unsunk ships. |
| `remaining_length_2` … | Optional count/vector features for remaining ship sizes. |
| `observed_hit_count` | Hits observed so far. |
| `inferred_style` | Only if inferred from pre-decision observable information; never use true hidden style label at inference unless the game legitimately knows it. |
| `ship_present` | Binary target label, never a feature. |

Exact feature set may be smaller. Prefer a small, correct, documented feature table over a large table with ambiguous or leaked columns.

### Feature leakage checklist

Before training, inspect features and answer yes to all:

- Could the AI know this value at the exact decision point?
- Is the value computed only from the shot history up to that point?
- Does it avoid the hidden layout, future results, final winner, and future shots?
- Is any simulator strategy label excluded unless it is inferred from observable evidence or explicitly used in a controlled oracle upper-bound experiment?
- Are all rows from the same game kept in one split?

Keep a separate list of training-only target fields. Assert in code that `ship_present`, hidden grid, future outcomes, final game result, and true placement style are not in the model feature matrix unless a deliberately labeled experiment explicitly allows one of them.

---

## 7. Baselines and model

### 7.1 Random legal baseline

Choose uniformly from all legal unshot cells. This is a weak reference point, not the main benchmark.

### 7.2 Probability-density / hunt-and-target baseline

Implement a rule-based probability solver:

1. Enumerate legal placements for each remaining ship length.
2. Exclude placements that overlap known misses or violate known hit/sunk evidence.
3. Count how many remaining legal placements cover each unshot candidate cell.
4. Aggregate scores over all remaining ship lengths, using a documented weighting rule.
5. If there is a known unsunk hit group, prioritize candidate cells that can extend a legal ship placement consistent with that group.
6. Exclude all previously fired cells.
7. Choose a maximum-score legal cell; use a seeded tie-breaker or documented randomness for equal scores.

This is a rules-based algorithm, not a trained ML model. It is the primary benchmark. Unit-test that it never chooses a repeated or impossible move.

### 7.3 Optional ML model

Start with a scikit-learn Random Forest classifier if the data pipeline is sound. Use fixed seeds and a simple initial configuration. Do not spend project time on extensive hyperparameter tuning before verifying:

- Correct labels.
- No leakage.
- Grouped split.
- Better-than-trivial ranking/calibration results.
- Full-game evaluation against the rule-based baseline.

A Random Forest may fail to learn ship geometry from simple independent cell features. Treat it as an experiment, not a guaranteed improvement. Compare a simple Logistic Regression or gradient-boosted tree only if time and results justify it. Do not add a neural network for the prototype.

### 7.4 Hybrid policy

The design notes propose a weighted combination:

`combined_score(cell) = (1 - λ) * rule_score(cell) + λ * ml_score(cell)`

Use this only after checking score scales. Raw legal-placement counts and classifier probabilities are not inherently comparable. Normalize rule scores per snapshot (e.g. to sum to one across candidates) and assess whether ML probabilities are calibrated. Choose `λ` on validation games only; never tune it using the final test set. Start with a low weight such as 0.2 as an experiment, not as an established best value. Include a λ=0 condition identical to the baseline. Reduce ML influence or disable it if validation shows it hurts.

Keep hit-follow-up and legality constraints authoritative. The ML model must not override known misses, repeat shots, or place an impossible ship configuration.

---

## 8. Training and evaluation protocol

### 8.1 Split by complete game/layout

Do not randomly split candidate-cell rows or snapshots. All snapshots and candidate rows from one `game_id` must belong to exactly one set. A recommended initial split is:

- 70% train games.
- 15% validation games.
- 15% final test games.

Use a fixed, recorded split seed. If possible, preserve strategy proportions in the primary split. As an additional generalization check, hold out one placement style entirely and test on it; report that separately from the ordinary random split.

### 8.2 Cell-level model metrics

Because ship cells are a minority of board cells, raw accuracy can be misleading. Report, as applicable:

- Average precision / PR-AUC for ranking positive ship cells.
- Precision@k or recall@k for the top candidate cells.
- Brier score or log loss if probability estimates are interpreted probabilistically.
- Calibration plot or calibration error if probabilities are shown as probabilities.
- Results by snapshot stage (early/mid/late), if sample size permits.

### 8.3 Full-game policy metrics

Run random, rule-based, and hybrid policies against the same held-out layouts, using multiple shooter/policy seeds where relevant. Report:

- Mean and median shots to sink all ships.
- Hit rate.
- Win rate only when a complete two-sided game simulation is being evaluated; otherwise do not call a shots-to-sink test a win-rate test.
- Inference/decision time per move.
- Number of invalid/repeated shots (must be zero).
- Variation/uncertainty across seeds (standard deviation, confidence interval, or range).

The most important comparison is hybrid versus rule-based on identical unseen layouts. State whether lower shots-to-sink is better. Do not report training accuracy as evidence that the playing AI improved.

### 8.4 Fairness and difficulty checks

Difficulty is a separate policy controller and should not trigger retraining. The same model may be used at multiple levels with different targeting policy, model weight, and controlled randomness. Define the behavior of each level precisely and check it empirically.

| Level | Minimum behavior definition |
|---|---|
| Recruit | Random legal shots with basic adjacent hit-follow-up. |
| Strategist | Rule-based probability-density hunt-and-target. |
| Adaptive | Rule-based solver plus a low, validation-selected learned-score contribution if it helps; otherwise explicitly use a demo/fallback policy. |
| Commander | Stronger targeting and less random tie-breaking; describe as a configured policy unless empirically validated as harder. |

Do not assume larger ML weight or less randomness automatically means a harder or better experience. Validate difficulty with repeated simulated games and human playtests if available. Never move ships, change past shot results, or expose hidden information to force a desired outcome.

---

## 9. Player-specific learning: what can and cannot be claimed

There are two distinct sources of behavior information:

1. **Offline synthetic learning:** a model trained before play learns patterns produced by the simulator. It is not a model of the current user.
2. **Player-specific history:** observations from actual repeated matches can update a local summary/profile. This requires retaining match data in the browser and making future decisions change because of that data.

For the first prototype, do not retrain the Random Forest during play. If history is implemented, maintain simple local statistics (e.g. edge/center shot tendencies, opening cells, repeated directional choices) and use a clearly documented deterministic heuristic. If there is no local persistent history, say **Insufficient data** and do not claim personalized learning.

Player shot patterns and ship placement patterns are different data. A player’s firing coordinates do not reveal their own ship placement style unless the game captures their actual ship layouts across games. Do not infer ship-placement habits from attack shots without evidence.

---

## 10. Frontend-only integration contract

There is no backend/API. Separate model development from the React/browser UI.

### Recommended interface shape

The frontend game engine owns the state and legality checks. It can call a local policy function such as:

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

type CandidateScore = {
  cell: Cell;
  score: number; // Relative score unless calibrated and validated otherwise.
};

type TargetingResponse = {
  candidates: CandidateScore[];
  strategy: string;
  modelStatus: "rule_based" | "demo_model" | "unavailable";
  explanation: string;
};

function scoreCandidateCells(state: ObservableAIState): TargetingResponse;
```

The response should rank candidates; the game engine applies legality masks and selects the final legal shot. Do not send hidden fleet cells to this function. In a frontend-only app, any code running in the browser is inspectable, so do not treat client code as a secure place to conceal proprietary model logic. The gameplay UI must still avoid rendering the hidden enemy layout.

### Integration options

**Option A — Rule-based frontend only (recommended first):** Implement the baseline in TypeScript/JavaScript and let the Python workstream produce a reproducible offline experiment and report. The UI labels the model as not integrated.

**Option B — Small inference logic port:** If the model is simple enough and the team can validate parity, port a lightweight inference implementation or a distilled policy to TypeScript. Test it against Python outputs on fixed fixtures. Do not silently claim it is the exact trained Random Forest if the port differs.

**Option C — Precomputed demo response:** Use a small static, clearly labeled set of scores for Figma or a non-computational demo. Label it **Illustrative demo values** and do not present it as live model inference.

Do not use a Python server as a shortcut; that would violate the no-backend requirement.

### Fallback behavior

If optional model logic fails, returns invalid values, or is not integrated:

- Filter legal unshot cells.
- Use the rule-based baseline or random legal selection as configured.
- Show **Rule-based fallback active** or **Demo analysis only** in UI.
- Never block a match because the optional ML component is unavailable.

---

## 11. Suggested project structure and deliverables

A simple offline research structure:

```text
ml-work/
  README.md
  requirements.txt
  data/
    generated/                 # Generated CSV/JSON; do not commit huge files unless needed
  src/
    rules.py                   # Fleet constants, coordinates, legality helpers
    generator.py               # Legal layouts and synthetic styles
    simulator.py               # Shots and observable snapshots
    features.py                # Point-in-time feature extraction
    baseline.py                # Random and probability-density policies
    train.py                   # Optional classifier training
    evaluate.py                # Grouped split and metrics
    export_demo.py             # Optional compact frontend demo fixture
  tests/
    test_layouts.py
    test_snapshots.py
    test_no_leakage.py
    test_targeting.py
  reports/
    results.md
```

Required handoff artifacts:

1. **Working legal layout generator** with validation tests.
2. **Snapshot generator** whose features use only past/current observable information.
3. **Dataset schema documentation** and a small sample dataset/record.
4. **Rule-based baseline** with tests proving no repeated/illegal shots.
5. **Model training script**, if the dataset and time support it.
6. **Evaluation script** using grouped-by-game splits and fixed seeds.
7. **Results report** with actual metrics, caveats, and failed/negative findings included.
8. **Frontend integration note** stating whether model inference is integrated, ported, demo-only, or unavailable.
9. A few deterministic test fixtures so the frontend developer can verify coordinates and score response shape.

Do not commit generated data or trained model binaries unless the team needs them for reproducibility or a genuine local integration. Keep files reasonably small and explain how to regenerate artifacts.

---

## 12. Suggested implementation sequence

### Phase 1 — Rules and data correctness

1. Define coordinate indexing and fleet/touching rules.
2. Implement coordinate conversion and legal placement checks.
3. Generate and validate legal fleets.
4. Write tests for boundaries, overlap, ship lengths, and reproducibility.

**Exit criterion:** thousands of generated layouts (or a robust test sample) pass all legality assertions; no silent invalid layouts.

### Phase 2 — Observable simulator and baseline

1. Simulate shots and outcomes from one valid hidden layout.
2. Record snapshots from the perspective of the shooter at each point.
3. Implement random legal shots and probability-density hunt-and-target.
4. Test that no future information reaches feature extraction.

**Exit criterion:** complete games terminate; every shot is legal; snapshot history matches the sequence exactly.

### Phase 3 — Dataset and ML experiment

1. Generate candidate-cell rows and binary occupancy labels.
2. Split by game ID before fitting or model selection.
3. Train a simple classifier and compare with trivial/random ranking.
4. Measure precision-recall and calibration-related metrics.

**Exit criterion:** a reproducible script reports test metrics without training/test leakage.

### Phase 4 — Hybrid policy evaluation

1. Normalize/inspect rule and model score scales.
2. Tune any hybrid weight only on validation layouts.
3. Compare the hybrid and baseline on identical held-out layouts and multiple seeds.
4. Report mean/median shots, hit rate, invalid moves, and inference time.

**Exit criterion:** the result clearly states whether the model improved the baseline and under what conditions.

### Phase 5 — Frontend handoff

1. Freeze the score contract and coordinate convention.
2. Decide whether the final browser app uses rule-based logic only, a validated port, or labeled static demo scores.
3. Provide fixtures and expected responses.
4. Confirm model status and wording with the frontend owner.

**Exit criterion:** the UI remains playable without a backend and never presents mock output as real ML inference.

---

## 13. Tests that must pass

### Layout tests

- Exactly the expected five ships exist.
- Each ship has the required number of cells.
- All ship cells are in bounds.
- No cells overlap.
- Orientations are only horizontal or vertical.
- Any touching policy is implemented consistently.

### Simulator tests

- Every shot is in bounds and unique.
- Hit/miss/sunk outcomes are correct.
- Sunk is emitted only when all cells of that ship have been hit.
- Remaining-ship lists update correctly.
- A finished game stops accepting shots.

### Feature/label tests

- Candidate cells are unshot at the snapshot.
- Feature history contains no future shots/outcomes.
- Hidden occupancy appears only in the target-label generation path.
- Final winner and final shot count are excluded from point-in-time features.
- All rows from one game are assigned to one split.

### Targeting tests

- AI never repeats a shot.
- AI never chooses an out-of-bounds or masked cell.
- Known misses are not treated as occupied candidates.
- Known hits and sunk ships are handled consistently.
- Tie-breaking is reproducible with a fixed seed if deterministic mode is enabled.

---

## 14. Risks and honest limitations

1. **Synthetic-to-human gap:** synthetic strategies may be easy to identify because the generator makes them artificially consistent. Results support conclusions about the simulator, not real players.
2. **Baseline strength:** probability-density targeting is already strong. A simple classifier may not improve it.
3. **Class imbalance:** most cells are empty, so accuracy can look high even when ship-cell ranking is poor.
4. **Snapshot correlation:** snapshots from the same layout are highly related; random row-level splitting leaks layout information.
5. **Score-scale mismatch:** rule counts and classifier probabilities cannot be combined blindly.
6. **Small data:** 500–2,000 games is a prototype target, not a guarantee of reliable generalization.
7. **Difficulty is not a model metric:** higher difficulty must be validated in game play; it does not follow automatically from a higher model weight.
8. **Browser transparency:** code and assets shipped to a browser can be inspected. Frontend-only means no secure server-side model or secret state.
9. **Player personalization requires history:** no cross-game history means no credible claim of learning an individual’s habits.

Report these limitations plainly in `results.md` and in any demo presentation.

---

## 15. Final checklist for the ML owner

Before handing off, confirm:

- [ ] The primary task is ship occupancy per candidate cell, not next-player-shot prediction.
- [ ] The generator produces legal layouts and is reproducible.
- [ ] The simulator records point-in-time observable snapshots.
- [ ] No hidden/future information enters model features.
- [ ] Splits are grouped by complete game/layout.
- [ ] The rule-based baseline is implemented and tested.
- [ ] The model is compared against that baseline on held-out layouts.
- [ ] Metrics include ranking and full-game performance, not only accuracy.
- [ ] Hybrid weights are selected on validation data, not the final test set.
- [ ] Actual results and negative outcomes are reported honestly.
- [ ] The frontend contract uses a consistent coordinate convention.
- [ ] No backend/API is required for the final app.
- [ ] Model integration status is stated accurately: real browser inference, validated port, offline-only experiment, or illustrative demo.
- [ ] The UI can always fall back to a legal rule-based move.

**Definition of success:** a defensible, reproducible experiment and a reliable frontend handoff—not an unsupported claim that the AI has learned real human behavior. The key result is whether the hybrid improves on the rule-based baseline on unseen layouts.
