# Adaptive AI Battleship — Figma Master Prompt (Frontend-Only Prototype)

> **Purpose:** Copy the prompt below into Figma AI to generate a coherent, high-fidelity, interactive frontend prototype for the Adaptive AI Battleship project.
>
> **Key project constraint:** This is a **frontend-only prototype**. Do not design or imply a backend, API, account system, remote database, cloud training pipeline, or server-based machine learning. Game state and demo logic run in the browser. If persistence is shown, it is local-only (for example, browser local storage). Clearly label mock, simulated, or illustrative AI/model data.

---

## Copy-ready Figma prompt

Design a polished, responsive web application called **Adaptive AI Battleship**: a playable, explainable Battleship strategy prototype with four difficulty levels, a rule-based opponent, transparent AI-analysis visuals, and a small learning/demo area.

### 1. Product goal and honesty requirements

Create a frontend prototype that demonstrates:

- A complete, playable 10×10 Battleship match.
- Legal fleet placement and shot handling.
- A computer opponent that selects legal shots using visibly distinct difficulty behaviors.
- An explainable AI panel that distinguishes **where the AI may fire** from **where the player may fire next**.
- Match results, simple progression, and local match history.
- A compact Learning Lab that explains synthetic data and model evaluation without presenting invented results as real.

This is a **browser-only experience**. Do not show backend infrastructure, API status, cloud services, user accounts, remote synchronization, or actual online model training. The prototype may use local deterministic/demo behavior and mock scores. Use labels such as **Prototype**, **Demo data**, **Simulated**, **Rule-based**, and **Insufficient data** when appropriate. Do not claim that a model learned from the current player unless a real local history mechanism is represented and the UI explains what was recorded.

### 2. Target user and visual direction

Design for a student/research-demo audience who should quickly understand the game, the AI’s behavior, and the difference between prediction tasks.

Visual direction: **premium dark-navy tactical command center**. The board and game state must remain readable and primary. Use a restrained, professional interface—not a noisy sci-fi dashboard.

Use this design system:

- Main background: `#080D18`
- Secondary background: `#0D1525`
- Card surface: `#111C2E`
- Elevated surface: `#17243A`
- Primary cyan: `#45D7E8`
- Secondary blue: `#568BFF`
- AI insight accent: `#A78BFA`
- Hit/danger: `#FF647C`
- Miss: `#7F93AC`
- Success: `#4ADE9B`
- Warning: `#FBBF65`
- Primary text: `#F2F6FC`
- Secondary text: `#A6B4C8`
- Muted text: `#72829A`
- Borders: `#24334A`
- Typography: Inter or Manrope
- Spacing: 8 px base spacing system
- Card radii: 10–16 px; button radii: 8–12 px

Use subtle elevation and restrained glow only for active targeting or status. Avoid excessive neon, glassmorphism, tiny labels, decorative sci-fi text, and low-contrast components.

### 3. Application structure and navigation

Create a consistent navigation shell with:

- Product mark/name: **Adaptive AI Battleship**.
- Primary destinations: **Command Center**, **Play**, **Learning Lab**, **Match History**.
- Profile/settings may be represented as a local demo menu only; do not create authentication screens.
- A clear active navigation state and responsive mobile navigation.

Create these main screens and connect them in a realistic prototype flow:

1. Command Center.
2. New Game / Difficulty Selection.
3. Fleet Deployment.
4. Gameplay Arena.
5. AI Analysis view (can be a tab, drawer, or dedicated connected view).
6. Game Results.
7. Level Progression.
8. Learning Lab.
9. Match History and Match Details.
10. Settings / How to Play modal or page.

Prioritize fidelity and completeness in this order: **Gameplay Arena → Fleet Deployment → Results → Command Center → AI Analysis → Learning Lab and History**. Keep secondary screens simple but consistent.

### 4. Command Center

Design a compact dashboard with the headline:

**“Your strategy. Its next challenge.”**

Include:

- Primary CTA: **Deploy Fleet** or **Start New Match**.
- Secondary CTA: **Explore AI Intelligence**.
- Current level card showing name, actual behavior at that level, and progress to next level.
- Recent matches summary and a short local-demo status.
- An honest empty/first-time state with no fake personal history.
- If sample metrics are used, label them **Demo data** and use obviously illustrative sample values.

### 5. New Game and Fleet Deployment

Provide four difficulty cards with locked, available, selected, and completed visual states:

1. **Recruit** — random legal shots with basic hit follow-up.
2. **Strategist** — rule-based probability-density hunt-and-target behavior.
3. **Adaptive** — rule-based targeting plus a clearly labeled demo/player-history adjustment when enough local history exists; otherwise show the rule-based fallback.
4. **Commander** — stronger targeting and less randomness, only described as tested/validated if the prototype actually supports it; otherwise label as a configured demo policy.

Do not imply that higher difficulty means a trained model is automatically more accurate. Show a brief **What changes at this level?** explanation on every card. Locked-level explanations must be available without hover.

Fleet deployment rules:

- 10×10 grid with columns A–J and rows 1–10.
- Fleet: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2).
- Manual placement and **Randomize Fleet** option.
- Horizontal/vertical orientation control, reset, and clear placement feedback.
- Prevent overlap and out-of-bounds placement; visually distinguish valid preview and invalid placement.
- **Launch Match** is disabled until the fleet is legal.
- Include an opponent-intelligence briefing based on the selected difficulty.

### 6. Gameplay Arena — highest-priority screen

Design the gameplay screen at desktop size with a clear tactical hierarchy:

- Top bar: match ID, level, turn number, current status, pause, and exit.
- Main board area: **Your Fleet** and **Enemy Waters**, side by side and visually distinct.
- Side panel: player fleet health and compact **AI Intelligence** panel.
- Keep the board as the primary focus. Use equal-size cells and readable coordinate labels.

Board semantics:

- **Your Fleet** shows the player’s own ships, plus incoming AI hits and misses.
- **Enemy Waters** shows only the player’s shots and their observed outcomes. Never reveal the opponent’s hidden ships during play.
- Distinguish cell states using both color and shape/icon, never color alone: untested, hover, selected, miss, hit, sunk, predicted/high-score, disabled, valid placement preview, invalid placement.
- Use clear focus/keyboard states and descriptive cell labels.
- Prevent repeated shots and prevent the user from taking another action while the AI turn is processing.

Game interaction sequence:

1. Player selects an untested cell on Enemy Waters.
2. Selected target is visibly highlighted.
3. Player confirms with **Fire Shot**.
4. Show an unambiguous hit/miss/sunk result.
5. Update turn and board status.
6. Show the AI responding, then reveal its shot result on Your Fleet.
7. Return control to the player.
8. End the game when one fleet is sunk and transition to Results.

Controls: **Fire Shot**, **Pause Match**, **Show/Hide AI Analysis**, **Exit Match**. Pause must freeze interaction. Exit should open a confirmation dialog warning that the local match may be lost.

Example feedback copy: “Direct hit at D5.” “Miss at G8.” “Enemy destroyer sunk.” “AI is evaluating legal targets.” Use clear, brief feedback rather than theatrical copy.

### 7. AI Intelligence — make meanings unambiguous

The gameplay analysis panel must use separate labels and visualizations for these concepts:

**A. AI Ship-Targeting Scores**
- Meaning: cells on the player’s board that the AI may target, based on observed hit/miss evidence and its targeting policy.
- This is the AI’s shot-selection view.
- Show only if the prototype intentionally exposes this analysis; never reveal hidden ships.

**B. Predicted Player Shots**
- Meaning: cells the player may choose to fire at next, estimated from the player’s observed shot patterns.
- This is not a ship-location heatmap and does not reveal where the opponent’s ships are.
- Treat this as optional and show **Insufficient data** until there is enough local history. Label simulated examples clearly.

Use separate tabs or cards and explanatory helper text. Never call both views “AI prediction” without explaining what is being predicted.

For any scores:

- Label uncalibrated outputs as **relative score** or **rank**, not a percentage/probability.
- If displaying percentages in a demo, mark them **illustrative demo values** unless they are genuinely calibrated model probabilities.
- Include a concise explanation such as “Several legal remaining-ship placements cover this area.”
- Provide a legend and avoid overloading the board with simultaneous layers.

### 8. Results and progression

Results screen should support victory and defeat states without shaming the player. Include:

- Match result, level, number of turns/shots, duration if available, ships remaining, and hit rates.
- Distinguish actual game statistics from demo or illustrative metrics.
- A short AI summary. Use honest wording: “Match observations recorded locally” only if they are stored; otherwise say “Demo analysis.”
- Level progress and a clear explanation of any unlock.
- Actions: **Play Again**, **View AI Analysis**, **View Match History**, **Return to Command Center**, and **Play Next Level** when unlocked.

Progression:

- Four connected levels: Recruit, Strategist, Adaptive, Commander.
- Show locked, available, in-progress, and completed states.
- Use a simple transparent unlock rule (for example, two wins to unlock the next level) and display the rule in the UI.
- Store progress locally only if represented; include a clear **Reset local demo data** option in settings with confirmation.
- The active level must correspond to a real behavior difference in the prototype, not merely a changed label.

### 9. Learning Lab — truthful, lightweight prototype view

Create a compact page titled **AI Learning Lab** with subtitle: **“How synthetic game data and targeting strategies are evaluated.”**

Explain the pipeline visually:

**Synthetic legal layouts → Observable game snapshots → Feature extraction → Model/baseline comparison**

Clarify in plain language:

- Synthetic data tests the patterns built into the simulator; it does not prove generalization to real human players.
- The rule-based probability solver is a strong baseline, not a trained neural network.
- Any ML component is optional in this frontend-only prototype and may be represented by a labeled demo score or local heuristic.
- No model is trained on a server; no remote service is called.

Possible UI modules:

- Dataset summary with labels such as **Demo dataset**, **Generated locally / sample only**, and **Not evaluated** where applicable.
- Strategy types: Random, Systematic, Checkerboard, Hunt-and-target, Edge-biased placement.
- Comparison cards for Random baseline, Rule-based AI, and Hybrid/demo policy.
- Separate metrics for **prediction task** and **game-playing task**. Never combine them into one score.
- Status pipeline with states such as Not started, Demo only, Completed, or Unavailable.
- **View sample records** may open a small clearly illustrative local sample table.

Do not invent evaluation dates, sample sizes, accuracy, win rates, or research findings. If no actual evaluation data exists, use placeholders such as “Run evaluation to populate” or mark all numbers **Demo data**.

### 10. Match History

Create a local-demo history screen with:

- Summary cards for matches, wins, losses, and win rate; show a clear empty state for first-time users.
- Filters by level and result if practical.
- Rows/cards with match ID, date/time if available, difficulty, result, turns, and hit rates.
- A match-detail view with the available turn history and summary.
- Label the history **Stored in this browser** if local persistence is implemented. If persistence is only a design concept, label it **Prototype example**.

### 11. Settings and How to Play

Settings should be limited to browser-side preferences, such as sound, reduced motion, heatmap visibility, and exit confirmation. Do not include account, cloud-sync, or server settings.

How to Play should explain:

- Place a valid fleet.
- Select an untested enemy cell and fire.
- Hits and misses are recorded; sink all enemy ships to win.
- AI levels change targeting behavior.
- Player-shot prediction and AI ship-targeting are different concepts.

### 12. Responsive design and accessibility

Create layouts for:

- Desktop: 1440×900.
- Laptop: 1280×800.
- Tablet: 768 px wide.
- Mobile: 390 px wide.

Responsive behavior:

- Desktop: both boards and AI panel can be visible together.
- Tablet: reduce/collapse side panels or move AI analysis below the boards.
- Mobile: switch between **Your Fleet** and **Enemy Waters** using a clear segmented control; collapse AI Intelligence into a drawer/accordion; keep **Fire Shot** accessible.
- Do not shrink cells so far that coordinates become unreadable. Prefer board tabs on mobile over two tiny boards.

Accessibility:

- Maintain strong text/background contrast.
- Never use color alone to communicate cell state.
- Include visible keyboard focus, labels for icon-only controls, accessible dialog behavior, and keyboard-operable cell selection.
- Support reduced motion.
- Ensure locked-level explanations do not depend on hover.
- Use clear actionable errors and confirmations.

### 13. Reusable components and Figma organization

Organize the Figma file into pages:

1. **Design System** — colors, typography, spacing, buttons, cards, badges, dialogs, board cell variants, heatmap legend, chart styles.
2. **Core Application** — Command Center, New Game, Fleet Deployment, Gameplay Arena, Results, Level Progression.
3. **AI Intelligence** — Analysis view, Learning Lab, Match History, Match Details.
4. **Responsive Layouts** — laptop, tablet, mobile.
5. **Prototype Flow** — connected navigation and key game states.

Use Auto Layout, reusable components/variants, consistent constraints, variables for colors and typography, and sensible layer names. Create cell variants as components rather than manually styling every cell. Keep components realistic to implement in a React frontend.

Reusable components should include:

- Navigation and active states.
- Board grid, coordinate labels, and cell variants.
- Ship card and fleet health/status.
- Difficulty/level card and progress indicator.
- Shot notification and turn status.
- Heatmap legend, prediction ranking, score badge, and explanation card.
- Metric card, history row, empty/loading/error state.
- Primary/secondary button, toggle, tooltip, modal, toast.

### 14. Required prototype states

Include connected examples or component variants for:

- First-time user with no match history.
- Valid and invalid ship placement.
- Selected enemy cell.
- Hit, miss, and sunk ship.
- AI turn processing and AI response.
- Paused match and exit confirmation.
- Victory and defeat.
- Locked and unlocked levels.
- Model/AI unavailable with rule-based fallback.
- Insufficient local player-history data.
- Empty history.
- Learning Lab with demo-only or not-evaluated values.
- Reset-local-data confirmation.

### 15. Figma prototype interactions

Wire the primary flow:

**Command Center → Select Difficulty → Fleet Deployment → Gameplay Arena → Results → Analysis/History/Next Match**

Also connect:

- Navigation among main sections.
- Cell selection and Fire Shot states.
- Pause/resume and exit confirmation.
- Analysis tabs for AI Ship-Targeting Scores and Predicted Player Shots.
- Locked-level explanation and level unlock flow.
- Learning Lab sample-record modal.

Interactions in Figma may simulate gameplay transitions; label any simulated result appropriately. The prototype must communicate intended behavior without implying server functionality.

### 16. Final quality bar

The finished design should feel like a credible, implementable strategy product with an explainable AI concept. Prioritize readable boards, coherent game flow, honest data labels, and strong distinction between the two prediction tasks. The design should make it easy for a developer to build the frontend without guessing what each button, state, or heatmap means.

Do not add features outside the defined frontend-only scope. Do not show actual hidden opponent ships during a match. Do not fabricate scientific results. Create a polished, connected, high-fidelity Figma prototype with reusable components and realistic responsive behavior.

---

## Notes for implementation after Figma

These notes are not part of the Figma prompt itself; they clarify the intended frontend-only implementation boundary:

- The browser can own the visible game loop and a local demo opponent. For a prototype, keep hidden fleet state separate from rendered UI state, even though both exist in the same client application.
- Use a deterministic or seeded random option when repeatable demos/testing are useful.
- A rule-based hunt-and-target opponent is a stronger first implementation than pretending a trained ML model exists.
- If localStorage is used, describe persistence as browser-local and provide a reset action.
- A future real model/backend can be added behind a stable interface later, but it is explicitly out of scope for this prompt.


---

# Detailed Design Addendum — Use with the Copy-Ready Prompt

> Paste this addendum after the master prompt when Figma AI supports longer instructions. It resolves implementation-level ambiguities and adds concrete design acceptance criteria. The frontend-only constraint remains absolute.

## A. Product boundary and source of truth

The design represents a single-player, browser-run prototype. There is no backend. The game engine, opponent policy, current match state, and any optional history are local to the browser. Do not design login, account setup, cloud save, multiplayer matchmaking, REST/GraphQL endpoints, remote training, or server dashboards.

Keep three concepts separate in the design and labels:

| Concept | What it does | What it must not imply |
|---|---|---|
| Game engine | Owns legal game rules, board state, shots, turns, and victory/defeat. | It is not a trained model. |
| Rule-based opponent | Picks legal unshot cells from current-game evidence; probability-density and hit-follow-up can be shown as explainable logic. | It does not know hidden ship locations. |
| Optional demo/player-pattern analysis | Shows a local heuristic or illustrative prediction from recorded prior actions, when available. | Synthetic/demo behavior is not proof of real-human generalization. |

When the AI or optional model is unavailable, show a calm status such as **Rule-based fallback active** and keep the game playable. Never make a disabled, unavailable, or mock capability look like a live service.

## B. Game rules and state representation to visualize

Use standard 10×10 Battleship coordinates: columns A–J and rows 1–10. Each fleet contains five straight, non-overlapping ships, horizontal or vertical, fully inside the board:

| Ship | Length |
|---|---:|
| Carrier | 5 |
| Battleship | 4 |
| Cruiser | 3 |
| Submarine | 3 |
| Destroyer | 2 |

A shot targets one cell exactly once. The UI distinguishes a miss, a hit, and the shot that completes a ship (sunk). A match ends when all ships in one fleet are sunk. Do not imply a ship is sunk from one hit; show remaining damage/segments until all cells in that ship are hit.

During the player’s turn, the player may select only an unshot cell in Enemy Waters. During the AI’s turn, disable all player targeting controls and communicate that the opponent is choosing a legal target. Resolve each side’s action sequentially; never show simultaneous or overlapping turns.

Make current state legible at a glance: whose turn it is, which board is interactive, how many ships remain, and the latest event. Keep status messages persistent enough to read but not so dominant that they obscure the boards.

## C. Detailed screen layouts and content hierarchy

### C1. Command Center layout

Use a desktop frame with a narrow left navigation rail or compact top navigation, a main content column, and optional right-side status area. Recommended hierarchy:

1. Page title, one-line product promise, and primary **Start Match** action.
2. Current level / progress card with level name, next unlock requirement, and a precise description of the behavior currently configured.
3. Recent match cards or a designed first-time empty state.
4. A compact **Prototype status** card: browser-only, local demo, rule-based opponent; show only truthful statuses.
5. Learning Lab teaser linking to the methodology explanation.

For the first-time state, do not fabricate previous matches, personal skill, or a learned profile. Use a helpful message such as **Your match history will appear here after your first game.**

### C2. Difficulty selection layout

Show four cards with consistent structure: level number/name, one-sentence behavior, feature chips, unlock condition, and selected/locked indicator. A selected card has an obvious border/background and a selected label, not just a color change. A locked card remains readable and includes an always-visible explanation of how to unlock it. Add a concise statement that difficulty adjusts the opponent’s policy and does not alter rules or secretly change ship positions.

### C3. Fleet Deployment layout

Present fleet inventory and controls beside the placement grid on desktop. Include an orientation toggle with text labels **Horizontal** and **Vertical**, a selected-ship indicator, **Randomize Fleet**, **Clear Fleet**, and **Launch Match**. For each ship, display name, length, placement state, and a clear selected/placed visual.

Interaction states to show:

- No ship selected.
- Ship selected and ready to place.
- Valid placement preview.
- Invalid preview due to overlap or board edge.
- Ship placed successfully.
- All ships placed; launch enabled.

The placement preview should reveal the exact cells that would be occupied. Invalid cells need an icon or pattern in addition to an error color. Provide concise inline feedback, e.g. **This placement extends beyond the board** or **Ships cannot overlap**. Randomize Fleet should result in a visibly valid completed layout and be repeatable as an action in the prototype.

### C4. Gameplay Arena desktop layout

Use a practical 12-column mental grid: a slim navigation/header area, a central two-board game area taking most of the width, and a right-side intelligence/fleet panel. Keep sufficient width for readable 10×10 cells. Avoid squeezing both boards and the panel into a narrow viewport; responsive rules below take precedence.

Recommended hierarchy:

- Header: back/brand, match ID, difficulty chip, turn number, status, pause, exit.
- Main: Your Fleet board and Enemy Waters board, each with title, short semantic description, and coordinates.
- Under or between boards: latest shot/event banner and turn indicator.
- Side panel: fleet condition, AI policy status, analysis toggle/tabs.
- Bottom action region: selected coordinate and **Fire Shot** action, with a disabled reason when unavailable.

The Enemy Waters board should be the primary interactive board during the player turn. Its instructions change with state: **Select a target cell**, **Target selected: D5**, **AI turn — targeting controls paused**, or **Match complete**.

### C5. Gameplay Arena mobile layout

Use a single-board viewport, not two miniature boards. Provide a segmented control **Enemy Waters / Your Fleet**. Default to Enemy Waters on the player’s turn. Keep the selected coordinate and Fire Shot action fixed in a reachable bottom action area, while respecting safe area spacing. Put the intelligence panel and fleet details in collapsible sections below or in a drawer. Ensure coordinate labels remain readable and do not hide row/column indicators to make the board fit.

### C6. Results layout

Use a prominent but restrained victory/defeat header, followed by a compact match summary. Clearly separate match facts from interpretation. Example match facts: shots fired, hits, hit rate, ships remaining, level. The learning/AI insight section must distinguish **observed during this match** from **historical local pattern** and **illustrative demo explanation**. If there is not enough evidence, say so instead of forcing an insight.

### C7. Learning Lab layout

Use a methodology-first layout, not a fake analytics dashboard. Start with a short explanation of the experiment, then show the four-step pipeline, then separate cards for:

- Rule-based solver: legal ship-placement enumeration / probability-density logic and hit-follow-up.
- Optional ML idea: estimate ship occupancy from observable snapshots, with hidden layout used only as training label in a controlled offline experiment—not as inference input.
- Synthetic strategy limits: the generator defines the patterns; results on synthetic data do not prove real-player performance.
- Evaluation status: show real computed values only if they are available; otherwise use **Not evaluated** or clearly marked **Illustrative demo**.

The Learning Lab must not claim an online model is learning from the current match. A diagram can explain the proposed research pipeline without suggesting that it is currently running in the browser.

## D. Board component specification

Create a reusable 10×10 grid component with row/column headers, cells that have consistent dimensions, and state variants. Add a short textual board title and accessible description. Grid coordinates should remain visible at all breakpoints.

Required cell variants:

| State | Visual treatment | Interaction |
|---|---|---|
| Untested / targetable | Neutral surface, subtle border; pointer/focus affordance on Enemy Waters during player turn. | Selectable only when it is the player’s turn and the cell is unshot. |
| Hover / keyboard focus | Clear outline/ring and coordinate hint; preserve underlying state. | Does not fire automatically. |
| Selected | Strong cyan outline plus target marker; selected coordinate echoed near action button. | Fire Shot confirms selection. |
| Miss | Miss glyph (e.g. small hollow dot/wave) plus muted blue-grey tone. | Disabled for future selection. |
| Hit | Hit glyph (e.g. cross/impact marker) plus coral tone. | Disabled for future selection. |
| Sunk ship cell | Distinct sunk marker/outline; visually grouped with all cells of the sunk ship. | Disabled. |
| Predicted / high relative score | Subtle overlay or border with a legend; never obscure actual hit/miss state. | Depends on view; scores are analysis only, not automatically selectable. |
| Disabled / opponent turn | Reduced emphasis and no pointer affordance; retain readable contents. | Not selectable. |
| Valid placement preview | Cyan/green translucent fill with clear ship outline. | Commits only on confirmation/click. |
| Invalid placement preview | Coral outline and warning glyph/pattern. | Cannot commit. |

Use icon + label/tooltip or shape + color to convey hits and misses. Avoid red/green-only signals. Prevent heatmap coloring from overriding the true shot outcome. Provide a small legend and allow analysis overlays to be toggled off.

## E. Interaction contract for the Figma prototype

Figma prototype links should represent state transitions, not just navigation. Wire at least these scenarios:

1. **New match:** Command Center → Difficulty → Fleet Deployment.
2. **Placement:** select a ship → select orientation → preview → place; show at least one invalid state and its correction; randomize fleet → launch.
3. **Player shot:** click an untested Enemy Waters cell → selected state → Fire Shot → hit/miss feedback → update board state.
4. **AI response:** show a brief thinking state, disable player controls, show an AI shot on Your Fleet, then return control to player.
5. **Sunk state:** show a final hit that sinks a ship and update remaining fleet count.
6. **Pause/resume:** pause overlay stops the game; resume returns to the same match state.
7. **Exit:** confirmation dialog; cancel returns unchanged, confirm exits to Command Center with a progress-loss warning.
8. **Game end:** victory and defeat variants with results and available progression.
9. **Analysis:** switch between AI Ship-Targeting Scores and Predicted Player Shots; show helper text and insufficient-data state.
10. **Fallback:** show Rule-based fallback active when optional analysis/model is unavailable.
11. **History:** first-time empty state and populated demo/local state, clearly labeled.
12. **Reset:** settings confirmation for clearing browser-local demo data.

For Figma-only interactions that cannot compute a real game, use a small curated set of sample states and label any simulated data. Do not use a changing label alone to imply actual algorithmic adaptation.

## F. Local-only persistence and demo labels

If the design includes browser persistence, limit it to simple local preferences and match history. The UI should state **Stored in this browser** and include a reset control. Do not imply that the data is uploaded, shared, or available on another device. If the design only illustrates persistence and the implementation is not yet defined, label the data **Prototype example**.

Recommended status vocabulary:

- **Rule-based** — describes implemented rules/targeting logic.
- **Local demo** — describes a browser-only prototype state.
- **Illustrative demo values** — describes invented UI examples, never experimental findings.
- **Insufficient data** — not enough prior actions to support a player-pattern estimate.
- **Not evaluated** — a model/strategy comparison has not been run.
- **Fallback active** — the game remains playable without optional analysis.

Avoid labels such as **trained**, **learned your strategy**, **78% probability**, **AI confidence**, or **model accuracy** unless the prototype genuinely computes and validates the claimed value. If showing a score, use a relative ranking and explain it.

## G. Visual hierarchy and density requirements

The 10×10 boards are the central visual object. Give cells adequate size and separation; prioritize readable coordinates and interaction over decorative headers, charts, or long explanatory text. At 1440×900, show both boards at useful scale and keep the primary action visible. At 390 px mobile width, show one board at a time and use a segmented switch. Use progressive disclosure for advanced analysis.

Use a consistent spacing scale (multiples of 8 px), typography hierarchy (page title, section title, body, helper text, metadata), and card padding. Avoid paragraph-length help copy inside the game arena; use concise helper labels with a linked **How it works** explanation. Use skeletons only for actual loading states; for the local game’s opponent turn use a short purposeful status, not a fake network spinner.

## H. Final Figma AI instructions

Generate a cohesive UI system, then compose the screens from reusable components. Favor Auto Layout and constraints that can translate cleanly to React. Use consistent names for component properties and variants. Produce desktop, tablet, and mobile variants for the key game screens. Connect the primary Figma prototype flow. Use realistic but clearly labeled example content, especially for metrics. Where implementation behavior is uncertain, use an explicit fallback or empty state instead of inventing a backend feature.

The final outcome should be detailed enough that a frontend developer can implement the screen structure and interaction states without guessing, while preserving the project truth: **a browser-only Battleship prototype whose rule-based game behavior is real, and whose optional ML/personalization claims remain clearly marked as demo or future work unless genuinely implemented.**
