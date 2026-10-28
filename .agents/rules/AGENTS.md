# AGENTS.md — Adaptive AI Battleship (Antigravity Assistant Guidelines)

## Project Identity & Hard Constraints

- **Project:** Adaptive AI Battleship  
- **Role:** Antigravity (Google DeepMind) — Lead AI Coding Assistant & Pair Programmer.
- **Type:** Student / research prototype with a playable frontend and an explainable AI/ML experiment.
- **Non-Negotiable Constraint:** **Frontend-only**. No backend, no API server (Flask/FastAPI/Express), no remote database, no authentication service, no cloud inference, and no online retraining. Everything running during gameplay executes directly inside the browser.
- **Local Persistence:** If implemented, modest browser-local storage only, labeled **Stored in this browser** with an explicit reset option.

---

## Mission & Working Standard

Build a credible, playable 10×10 Battleship prototype using legal game rules, an explainable rule-based opponent, and—if evidence supports it—an optional learned ship-occupancy signal. Evaluate whether the hybrid strategy outperforms the rule-based baseline on unseen simulated layouts.
- **Honesty First**: Never claim a capability, result, or data source that does not exist. A negative result (hybrid does not beat probability-density baseline) is a valid, honest scientific finding.
- **Truthful UI Language**:
  - `Rule-based`: actual implemented algorithmic policy.
  - `Local demo`: browser-only prototype behavior.
  - `Illustrative demo values`: mock/sample values for demonstration.
  - `Insufficient data`: too little player history for personalization.
  - `Not evaluated`: unmeasured metrics or comparisons.
  - `Rule-based fallback active`: when optional model logic is unavailable or unported.
  - `Stored in this browser`: local browser persistence only.

---

## 4 Distinct AI / ML Concepts (Never Conflate)

1. **Rule-Based Battleship Targeting**:
   - Legal-move filtering, Probability Density Matrix (PDM) calculated from remaining legal ship placements, and parity hunt-and-target.
   - Algorithmic, mathematical, and explainable — **not a trained neural network**.
2. **Primary Optional ML Task: Ship Occupancy**:
   - For each candidate unshot cell, estimate binary likelihood of containing an unsunk ship using **only** observable state at that decision point.
   - Hidden layout supplies training label only; **never** an inference feature.
3. **Secondary Optional Task: Predict Player's Next Shot**:
   - Predicts where the player might click next based on past shot sequences.
   - **Does not** reveal where ships are located. Kept separate in data, metrics, and UI.
4. **Player-Specific Adaptation**:
   - Requires actual repeated match history stored in the browser. If insufficient history exists, display **Insufficient data**. No online retraining during a match.

---

## Difficulty Policy

| Level | Concrete Behavior |
|---|---|
| **Recruit** | Random legal shots with basic adjacent orthogonal hit follow-up. |
| **Strategist** | Algorithmic probability-density solver + checkerboard parity hunt + directional target lock. |
| **Adaptive** | Rule-based baseline plus validated learned ship-occupancy signal (or labeled local/demo adjustment); fallback to Strategist if unavailable. |
| **Commander** | Stronger targeting / minimized randomness with pure optimal tie-breaking. |

---

## Shared Integration Contract (TypeScript)

Numeric coordinate indexing `row` and `col` in `[0, 9]` internally; converted to A1–J10 for display.

```typescript
export type Cell = { row: number; col: number };
export type ShotResult = "hit" | "miss" | "sunk";

export type ObservableAIState = {
  boardSize: 10;
  shotsTaken: Cell[];
  shotResults: Array<{ cell: Cell; result: ShotResult }>;
  remainingShipLengths: number[];
  knownSunkShipLengths: number[];
};

export type CandidateScore = {
  cell: Cell;
  score: number; // Relative score unless calibrated
};

export type TargetingResponse = {
  candidates: CandidateScore[];
  strategy: string;
  modelStatus: "rule_based" | "demo_model" | "unavailable";
  explanation: string;
};
```

---

## Antigravity Operational Directives

- **Zero Terminal Interruption**: Execute updates, file changes, and project scaffolding directly through targeted file operations without triggering permission prompts.
- **Preserve Separation of Concerns**: Keep Game Engine, AI Targeting Solvers, UI Presentation, and State Management cleanly decoupled.
- **UI Integrity**: Adhere to the Tactical Command Center design tokens defined in `frontend-design` and Figma specs.
