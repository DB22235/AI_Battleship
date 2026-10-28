---
name: battleship-ai
description: Algorithmic reference and best practices for developing AI opponents, board state management, and tactical logic for Battleship game variants. Use when implementing, debugging, or enhancing Battleship game rules, probability density hunting algorithms, or ship placement heuristics.
---

# Battleship AI & Tactical Architecture Reference

This skill guides the design, implementation, and optimization of Battleship game systems, AI opponents of varying difficulty, and game state architectures for the **Adaptive AI Battleship** project.

---

## 1. Architectural Separation & Observable State Contract

The frontend game engine is the authority on game state, legality, and turns. The AI decision engine receives **only** observable state:

```
[UI Presentation Layer] <---> [Game Engine & Rules Validator]
                                        | (Passes Observable State ONLY)
                                        v
                               [AI Decision Engine]
                                - Probability Density Solver
                                - Difficulty Policy Router
                                - Optional Learned Occupancy Score
```

### TypeScript Data Contract

```typescript
export type Cell = { row: number; col: number }; // row in [0, 9], col in [0, 9]
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

> [!CAUTION]
> Hidden fleet locations must **never** be passed into `ObservableAIState` or to the AI decision engine. In a frontend-only app, all client code is inspectable; true secrecy relies on architectural separation.

---

## 2. Difficulty Policies

Difficulty is controlled as an explicit targeting policy, completely separate from model training:

| Level | Behavior Specification |
|---|---|
| **Recruit** | Uniform random selection across legal unshot cells. If an unsunk hit is present, randomly probes adjacent orthogonal unshot cells. |
| **Strategist** | Full rule-based Probability Density Matrix (PDM) solver. Uses parity hunt masks when hunting, and directional lock-on when multiple hits on the same ship are identified. |
| **Adaptive** | Rule-based PDM baseline blended with a validated learned occupancy score ($\lambda \in [0.1, 0.25]$) or local demo adjustment when enough local match history exists. Falls back to Strategist if unavailable. |
| **Commander** | High-precision solver with zero random tie-breaking jitter, maximizing probability density and enforcing tight parity pruning. |

---

## 3. Probability Density Matrix (PDM) Algorithm

The PDM is the primary benchmark. It is an exact algorithmic constraint solver:

1. **Initialize Heatmap**: Create a $10 \times 10$ matrix $M(r, c) = 0$.
2. **Identify Known Cells**:
   - $S_{\text{miss}}$: cells with result `"miss"`.
   - $S_{\text{sunk}}$: cells of already sunk ships.
   - $S_{\text{hit\_unsunk}}$: cells with result `"hit"` belonging to ships not yet fully sunk.
3. **Configuration Enumeration**:
   - For each unsunk ship length $L \in \text{remainingShipLengths}$:
     - For both orientations: horizontal $(\Delta r=0, \Delta c=1)$ and vertical $(\Delta r=1, \Delta c=0)$:
       - For every valid starting cell $(r, c)$ where the ship stays within $[0, 9] \times [0, 9]$:
         - Inspect the $L$ cells of the placement:
           - If *any* cell is in $S_{\text{miss}}$ or $S_{\text{sunk}}$, placement is **invalid**.
           - Let $k$ be the count of cells in this placement that overlap $S_{\text{hit\_unsunk}}$.
           - If $S_{\text{hit\_unsunk}}$ is non-empty and $k == 0$ in target mode, this placement does not explain the existing hit (optionally deprioritize or drop).
           - Calculate placement weight: $W = 1 + (k \times 20)$.
           - Add $W$ to $M(r', c')$ for every unshot cell $(r', c')$ in this valid placement.
4. **Parity Filtering in Pure Hunt Mode**:
   - When $S_{\text{hit\_unsunk}}$ is empty, multiply or mask cells where $(r + c) \pmod{L_{\min}} \ne 0$, where $L_{\min} = \min(\text{remainingShipLengths})$.
5. **Selection**:
   - Filter out all previously shot cells.
   - Return candidate cells ranked by score. The highest-scoring cell is selected for the shot.

---

## 4. Separation of Prediction Concepts

Never combine or confuse these concepts:
- **AI Ship-Targeting**: Estimating where the enemy's hidden ships reside on the player's board.
- **Predicted Player Shot**: Predicting which cell on the AI's board the player might target next based on player click habits.
- Clearly present each with its own UI tab, legend, and explanation.
