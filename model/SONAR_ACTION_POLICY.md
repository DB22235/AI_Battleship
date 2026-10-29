# Sonar action policy specification

## Policy type and objective

The policy is a deterministic, offline-trained tabular contextual action-value model (`sonar-tabular-q-v1`). It predicts estimated remaining AI actions under simulated self-play for two decisions: fire the current best legal PDM-ranked cell, or scan the legal 3×3 region with the greatest normalized share of the current candidate-score mass. This is a documented relative-target-value criterion: choose the region whose ranked candidates have the greatest combined PDM score mass. It is not an information-gain probability calculation, and the candidate scores are not calibrated occupancy probabilities. The learned action value estimates whether the aggregate scan is worth its action cost. The table bins only observable features: fired-cell count, remaining segment/ship-count buckets, active unsunk hit status, normalized entropy of relative candidate scores, best-region relative-score share, and prior observable scan count.

Training reward is `-1` for each AI action until the fleet is sunk. A scan and a shot each cost one action; there is no additional charge penalty. This directly values scan information only when it reduces future AI actions enough to cover its own action cost. Normal production turn rules still apply: hits retain the AI turn, misses pass to the player, and a scan passes to the player. Player turns do not alter the target fleet or the number of AI actions, so they do not add reward. The single scan charge resets only at match start.

The offline simulator uses legal production fleet layouts, shot resolution, complete 3×3 centers, aggregate unshot-cell counts, one charge, and the same PDM sonar reweighting rule. Hits retain the AI action sequence; misses and scans explicitly pass through a no-op player turn before the AI resumes. The player turn is a no-op only because it cannot change the target fleet and the reward is target-fleet AI actions; this is a one-sided action-efficiency experiment, not a two-sided win-rate simulation. Hidden fleet truth is used only after a policy action to resolve shots/scans and compute return. Features and inference receive only the observable state, legal candidates, and scan aggregates. Training and test data are split by complete game; random/edge/center styles are represented in training and a corner-biased placement style is held out from both training and validation.

The occupancy MLP did not pass its gameplay gate and its runtime weight is zero. Therefore the action policy uses PDM rankings only. If a future occupancy artifact passes its gate, the action-policy interface can consume the validated combined candidate ranking; it must not otherwise call the MLP.

## Runtime decision and fallback

The table compares its estimated remaining-action value for scan and fire in the observable feature bucket. It selects scan only when both estimates have the required support and scan has lower estimated remaining actions. Otherwise it uses the fixed rule-based fallback. The explanation reports the selected region's normalized relative-score share, score entropy (explicitly relative, not a probability), action-value estimates, and support counts. It makes no confidence/probability claim. Missing or malformed artifacts always use the fixed baseline.

The fixed comparator scans after at least three shots, with no unsunk hit, when the best legal 3×3 region holds at least 20% of total PDM candidate-score mass. The random baseline fires one uniformly sampled legal cell and does not scan. All comparisons evaluate PDM-shot baselines on the same held-out layouts and seeds.

## Regeneration and acceptance

Run `python model/src/sonar_action_experiment.py --train-games 1000 --eval-games 60 --seeds 20261029,20261030,20261031`. The generated JS/JSON table records its seed set, simulator version, training-game count, action-value visits, and held-out metrics. The runtime policy is enabled only if it beats the fixed-scan baseline on mean AI actions without a held-out placement-style regression for every seed; otherwise it remains packaged but the runtime uses the fixed baseline. Occupancy weight remains zero.
