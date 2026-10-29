# Sonar Scan action-policy evaluation

## Approach and protocol

The policy is a small tabular contextual action-value model (`sonar-tabular-q-v1`), trained from full simulated episodes. For each decision, the two choices are (1) fire the highest-ranked legal PDM cell, or (2) scan the legal 3×3 region with the largest normalized share of PDM candidate-score mass. This is a relative-target-value criterion for choosing a region. It is not an information-gain probability calculation; PDM scores and their entropy are relative ranking signals, not calibrated probabilities. The learned action value estimates whether the aggregate scan is worth its action cost. The tabular context bins shots taken, whether an unsunk hit is active, remaining-ship bucket, normalized relative-score entropy, and best-region score-share bucket. The model stores mean remaining AI actions and visit counts for each action/context pair; it never predicts coordinates from hidden fleet data.

Reward is `-1` for each AI action until the target fleet is sunk. A shot and a scan each cost one action; there is no extra resource-preservation penalty. Production hit/miss/scan transitions are represented: hits keep the AI in its sequence, misses and scans pass through a no-op player turn before the AI resumes. Player turns are no-op in this one-sided action-efficiency simulator because they do not change the target fleet. Consequently this is not a two-sided match or win-rate evaluation.

Training command: `python model/src/sonar_action_experiment.py --train-games 1000 --eval-games 60 --seeds 20261029,20261030,20261031`.

This trained 3,000 complete training games across random, edge-biased, and center-biased fleets. Evaluation used separate complete games: 60 each per placement style and seed across random, edge-biased, center-biased, and corner-biased fleets. The corner-biased style was absent from training. Each baseline used the same hidden layouts within a style/seed. The random baseline selects uniform legal cells and never scans. PDM-only never scans. The fixed rule scans after at least three shots, with no unsunk hit, if the best legal 3×3 region contains at least 20% of total normalized PDM score mass.

The occupancy MLP's prior evaluation selected runtime weight zero, so no MLP scores entered training or runtime action selection. PDM scores were the only rankings used. The scan count is computed in the simulator only after the scan action is selected, and its observation is an aggregate count of unshot ship cells.

## Held-out results

Values below are averages across the three seeds and four placement styles (60 games/style/seed). `AI actions` counts both shots and scans. Hit rate counts shots only. The learned model is compared with the fixed scan rule using paired same-layout action-count differences. Across all held-out games, the learned model used **0.42 more AI actions** on average than the fixed rule.

| Policy | Mean AI actions to sink | Mean shots | Mean hit rate | Mean scans/game | Invalid/repeated actions |
|---|---:|---:|---:|---:|---:|
| Random legal shot | 95.37 | 95.37 | 17.87% | 0.00 | 0 |
| PDM-only | 45.34 | 45.34 | 39.16% | 0.00 | 0 |
| Fixed scan rule | 44.21 | 43.40 | 40.71% | 0.81 | 0 |
| Learned tabular policy | 44.63 | 44.16 | 40.35% | 0.47 | 0 |

| Placement style | Fixed-rule actions | Learned actions | Paired learned − fixed actions |
|---|---:|---:|---:|
| Random | 42.94 | 44.03 | +1.08 |
| Edge-biased | 46.59 | 47.43 | +0.83 |
| Center-biased | 40.79 | 40.48 | -0.31 |
| Corner-biased (held out) | 46.51 | 46.56 | +0.05 |

Paired bootstrap intervals by seed and style are in `model/artifacts/sonar_action_results.json`. The learned model improved only on center-biased layouts on average, with a small mean regression on the corner-style holdout and larger regressions on random/edge-biased layouts. These results do not show a consistent improvement over the fixed rule.

## Runtime decision and limitations

The generated table is **not enabled** (`runtimeEnabled: false`). Runtime uses the explicitly labeled fixed scan fallback (`sonar-fixed-scan-v1`) when a charge is available. It uses only observable PDM candidate scores, the fixed 20% region-mass threshold, shot history, and remaining ship lengths. The tabular model is not presented as active or as having learned a superior policy. If the artifact is missing, disabled, malformed, or lacks sufficient visits, the same fixed rule is used. When the charge is gone, existing difficulty shot policies resume.

Limitations: synthetic fleets only; one-sided action efficiency rather than two-sided win rate; no modeled player strategy; tabular bins discard state detail; one shared action policy uses PDM rather than the unvalidated occupancy MLP; and the held-out means/intervals do not establish human-layout generalization.
