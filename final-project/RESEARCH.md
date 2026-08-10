# Research Design — PathSense

## Overview

**PathSense** is a single-player tilt-controlled tightrope balance game for smartphones. A participant connects via QR code and must keep a ball on a narrow pre-designed path by tilting a provided phone using only their **non-dominant hand**. The ball falls off the path if the player strays too far from the centerline, returning to the last checkpoint. As the ball approaches the path edge, the phone delivers an escalating proximity warning (haptic / audio / none).

The use of the non-dominant hand is theoretically motivated: the non-dominant hand is the body's frame-setter, responsible for stabilisation and postural adjustment (Guiard, 1987). It has less precise timing and spatial calibration than the dominant hand, making it more likely to benefit from augmented feedback that compensates for the non-dominant limb's reduced proprioceptive acuity. Proximity feedback — which is graded (not just binary) — directly augments the kinesthetic awareness of where the ball sits on the path, extending the participant's effective body schema to include the phone as a spatial probe (Maravita & Iriki, 2004).

The tightrope design is used over a maze/obstacle design for three reasons:
1. The task is reproducible across participants (fixed path, same challenge every run)
2. Proximity feedback is directly interpretable ("how close to the edge am I?")
3. The balance metaphor makes the non-dominant hand framing immediately obvious — tilt control is the only natural way to perform this task

---

## Primary Research Question

> **Does continuous proximity-based feedback modality (haptic / audio / none) affect fall rate in a single-player tilt-controlled tightrope balance task performed with the non-dominant hand?**

---

## Secondary Research Questions

| # | Research Question |
|---|-------------------|
| RQ2 | Does *any* proximity feedback reduce falls compared to the no-feedback (none) condition? |
| RQ3 | Which modality (haptic / audio) produces fewer falls? |
| RQ4 | Does performance improve across difficulty levels (L1 → L2 → L3), and is that improvement modality-dependent? |

---

## Hypotheses

### H1 — Feedback Effect (Primary)
**Participants with any proximity feedback (haptic or audio) will fall less often than the no-feedback condition.**

*Rationale:* Proximity feedback provides early warning before the ball reaches the path edge, enabling corrective tilt before a fall occurs. Augmented feedback improves motor performance especially for novel, continuous tasks with a non-dominant limb where proprioceptive calibration is weakest (Schmidt & Wulf, 1997; Lim et al., 2015).

### H2 — Haptic Superiority
**Haptic proximity feedback will produce fewer falls than audio.**

*Rationale:* Haptic feedback operates on a separate sensory channel from the primary visual task (watching the game on-screen) and, crucially, is delivered through the hand performing the task — creating a direct coupling between the warning signal and the effector. Per Multiple Resource Theory (Wickens, 1984), feedback that does not compete for the same perceptual resource as the primary task degrades performance less. Audio shares the attentional channel but not the tactile-motor channel. The hand holding the phone can respond to a vibration proprioceptively without shifting attention, whereas audio still requires auditory-motor translation.

### H3 — Non-Dominant Hand Calibration Benefit
**Feedback benefit (falls with feedback minus falls without) will be larger for participants with less tilt experience (no prior experience with motion controls).**

*Rationale:* The non-dominant hand's control disadvantage is larger for participants with less exposure to continuous fine motor tilt tasks. These participants have weaker feedforward models for tilt-based control and will rely more on feedback to correct errors (Schmidt & Wulf, 1997).

### H4 — Within-Session Improvement
**Fall rate will decrease across difficulty levels within a session (L1 → L2 → L3), with feedback conditions showing a smaller rate of increase than the none condition as difficulty increases.**

*Rationale:* Motor learning under augmented feedback accelerates error correction in early trials. As difficulty increases (narrower path, heavier inertia), the advantage of feedback for maintaining precision should grow — the none condition degrades more steeply than the feedback conditions.

---

## Study Design

| Element | Value |
|---------|-------|
| Design | Between-subjects on modality; within-subjects on difficulty level |
| Primary IV | Feedback modality: `haptic` / `audio` / `none` |
| Secondary IV | Difficulty level: `1` (introductory) / `2` (moderate) / `3` (hard) |
| Assignment | Random assignment to one modality; same modality for all 3 levels in the session |
| Primary DV | `falls` per round |
| Secondary DVs | `checkpoints_passed`, `score`, `time_at_level_1_ms`, `time_at_level_2_ms`, `time_at_level_3_ms` |
| Session structure | 3 rounds per session (one per difficulty level), same modality throughout |
| Round duration | 90 s (L1) / 75 s (L2) / 60 s (L3) |
| Target N | 36 participants (12 per modality group) |
| Device | Single provided Android phone — eliminates device confound, haptic guaranteed |
| Non-dominant hand | All participants use their non-dominant hand only; dominant hand rests at side |
| Session format | Researcher-controlled — admin panel triggers each level start |

### Session Structure
```
Level 1 (90 s) → results screen → Level 2 (75 s) → results screen → Level 3 (60 s) → survey
```

The researcher controls each level start manually via the admin panel. Level order is fixed (not randomised) so that difficulty is a constant within-person factor.

### Counterbalancing / Assignment
Participants are randomly assigned to one of the three modality conditions. Assignment should be stratified by handedness (left / right) at recruitment to ensure balance across conditions. Since this is between-subjects, each participant completes one session only (3 levels).

### Device Confound: Eliminated
A single provided Android phone is used for all participants. `navigator.vibrate()` availability is guaranteed. iOS exclusion is not required since all participants use the same device.

---

## Variables

### Independent Variables
- **Modality** (primary, between-subjects): `haptic` | `audio` | `none`
- **Difficulty level** (secondary, within-subjects): `1` | `2` | `3`

### Proximity Warning System
Proximity thresholds are **fixed across all difficulty levels** so that `time_at_level_X_ms` values are measured against the same absolute distances (px from path edge) across all conditions and difficulty levels. Only corridor width and ball physics vary by level.

| Level | Label  | Gap to path edge | Feedback intensity |
|-------|--------|-----------------|--------------------|
| 0     | SAFE   | > 40 px          | none               |
| 1     | NEAR   | 20–40 px         | light              |
| 2     | WARN   | 8–20 px          | medium             |
| 3     | DANGER | < 8 px           | heavy              |
| 4     | HIT    | fall occurred    | momentary burst    |

**Note on Level 3 saturation:** At difficulty Level 3 (halfWidth = 35 px < PROX_T[0] = 40 px), the ball is always within 40 px of the path edge. `time_at_level_1_ms` will be saturated (≈ round duration) at difficulty Level 3 for all participants. This is a known property of the design and limits direct cross-difficulty comparison of `time_at_level_1_ms`. Use `falls` as the primary cross-level DV.

### Difficulty Level Parameters

| Level | Corridor half-width | Drag | Round |
|-------|--------------------:|-----:|------:|
| 1     | 80 px               | 2.5  | 90 s  |
| 2     | 55 px               | 2.0  | 75 s  |
| 3     | 35 px               | 1.5  | 60 s  |

*Narrower corridor + higher drag = heavier ball inertia requiring more precise and anticipatory tilt.*

### Path Designs (fixed per level)
Paths are pre-designed and identical for all participants within each difficulty level. Ball starts at the path origin (index 0); each subsequent waypoint is a checkpoint; the final waypoint is the end goal.

| Level | Shape        | Checkpoints |
|-------|--------------|------------|
| 1     | Gentle S-curve | 4        |
| 2     | N-shape        | 4        |
| 3     | Tight zigzag   | 6        |

### Dependent Variables
| Variable | Measurement | Source |
|----------|-------------|--------|
| `falls` | Count of ball-off-path events per round (primary DV) | game.js |
| `checkpoints_passed` | How many waypoints reached before round end | game.js |
| `score` | `checkpoints_passed × 100 − falls × 25` | game.js |
| `time_at_level_1_ms` | Total ms spent in NEAR proximity zone (gap 20–40 px) | game.js |
| `time_at_level_2_ms` | Total ms spent in WARN proximity zone (gap 8–20 px) | game.js |
| `time_at_level_3_ms` | Total ms spent in DANGER proximity zone (gap < 8 px) | game.js |

### Covariates / Controls
| Variable | Purpose |
|----------|---------|
| `difficulty_level` | Controls for within-session difficulty effect |
| `round_duration_ms` | Normalisation denominator for time-based DVs |
| `device_model`, `os` | Device record (all sessions use same provided phone — for verification) |
| `screen_res`, `pixel_ratio` | Display size verification |
| `session_id` | Groups rounds within one study session |

### Participant Demographics (collected once, first round of session)
Stored in `survey_responses.jsonl` under the `demographics` key.

| Variable | Values | Rationale |
|----------|--------|-----------|
| `age` | integer | Motor performance varies with age |
| `gender` | Man / Woman / Non-binary / Prefer not to say | Standard inclusion |
| `handedness` | Right / Left / Either | Defines which hand is non-dominant |
| `gaming_experience` | None / Casual / Regular / Frequent | Prior game controller experience predicts motor adaptation |
| `tilt_experience` | Yes / No | Prior tilt control exposure is a direct confound |

---

## CSV Data Schema

```
session_id, round, difficulty_level, round_duration_ms,
player_id, player_name, modality,
checkpoints_passed, falls, score,
time_at_level_1_ms, time_at_level_2_ms, time_at_level_3_ms,
os, os_version, device_model, screen_res, pixel_ratio, browser, session_timestamp
```

Saved to: `data/results_YYYYMMDD.csv` (one file per calendar day, rows appended after each round).
Player history: `data/players.json` (UUID → modality history, play count, device records).
Survey responses: `data/survey_responses.jsonl` (one JSON per line).

**Analysis note:** Normalise time-based DVs by `round_duration_ms` when comparing across difficulty levels (e.g. `time_at_level_2_ms / round_duration_ms`). See note above about Level 3 saturation of `time_at_level_1_ms`.

---

## Session Protocol (Researcher Checklist)

1. Start server: `node server.js`
2. Open **Game Display** (`https://localhost:3000`) on the external monitor — full-screen with F11
3. Open **Admin Panel** (`https://localhost:3000/admin`) on the laptop
4. Participant scans QR code shown on admin panel with the **provided Android phone**
5. Participant types their name and taps **Join Game**
6. Confirm admin panel shows the participant's name and assigned modality
7. Ask participant to read the modality briefing shown on their phone screen
8. **Instruct participant**: "Use only your non-dominant hand to hold and tilt the phone. Your dominant hand rests at your side."
9. Confirm which hand is non-dominant (record in session log)
10. If modality is **haptic**: confirm phone is not on silent
11. If modality is **audio**: confirm phone volume is audible
12. Ask participant to lock screen rotation before starting
13. Click **▶ Level 1** on the admin panel
14. After Level 1 ends (~90 s), results screen shows — briefly review falls/checkpoint count with participant
15. Click **▶ Level 2**, then **▶ Level 3** in sequence
16. After Level 3, participant completes the survey on their phone
17. Export data: click **↓ Export CSV** on the admin panel
18. Note any session issues (phone grip switching, shoulder rotations, interruptions)

**Stratification reminder:** Aim for roughly equal left-handed and right-handed participants across modality groups. Record handedness in session log at the time of each session.

---

## Analysis Plan (Outline)

- **Primary analysis (H1)**: One-way ANOVA or Kruskal-Wallis on `falls`, aggregated across 3 levels, with modality as between-subjects factor. Post-hoc pairwise comparisons with Bonferroni correction.
- **H2**: Planned contrast: haptic vs. audio condition means on `falls`.
- **H3 (moderation)**: Interaction term `modality × tilt_experience` on `falls` using linear mixed model.
- **H4**: Mixed ANOVA with modality (between) × difficulty_level (within) on `falls`. The interaction term tests whether the rate of increase in falls across levels differs by modality.
- **Normalised proximity**: Use `time_at_level_2_ms / round_duration_ms` and `time_at_level_3_ms / round_duration_ms` as supplementary DVs (avoid L1 for Level 3 due to saturation).
- **Covariates**: `gaming_experience`, `tilt_experience`, `handedness` as covariates in the mixed model.

---

## Key References

Guiard, Y. (1987). Asymmetric division of labor in human skilled bimanual action. *Journal of Motor Behavior, 19*(4), 486–517.

Lim, S. C., Lee, K. C., & Yeo, M. (2015). Effects of augmented sensory feedback on motor performance. *Perceptual and Motor Skills, 120*(2), 469–483. https://doi.org/10.2466/22.PMS.120v19x4

> ⚠️ Lim et al. (2015) could not be verified via Consensus, PubMed, or web search. Do not cite in the paper until confirmed with your supervisor.

Maravita, A., & Iriki, A. (2004). Tools for the body (schema). *Trends in Cognitive Sciences, 8*(2), 79–86. https://doi.org/10.1016/j.tics.2003.12.008

Schmidt, R. A., & Wulf, G. (1997). Continuous concurrent feedback degrades skill learning: Implications for training and simulation. *Human Factors, 39*(4), 509–525. https://doi.org/10.1518/001872097778667979

Wickens, C. D. (1984). Processing resources in attention. In R. Parasuraman & D. R. Davies (Eds.), *Varieties of Attention* (pp. 63–102). Academic Press.

---

## Theoretical Note

This study sits at the intersection of **augmented feedback and motor control** (Schmidt & Wulf, 1997), **bimanual division of labor** (Guiard, 1987), and **body schema extension via tools** (Maravita & Iriki, 2004). The non-dominant hand framing is not merely a difficulty manipulation — it targets the theoretical claim that augmented sensory feedback can extend the body's effective schema to include a held object (the phone acting as a spatial probe). Proximity feedback gives the non-dominant hand spatial calibration information that its proprioceptive system normally provides less precisely than the dominant hand.

The between-subjects design at N=36 (12 per group) is powered for large effects. With a medium effect (Cohen's f ≈ 0.25), power is approximately 40% — appropriate for a pilot study whose purpose is to estimate effect sizes and inform a larger follow-up. All null results should be interpreted cautiously, not as evidence of absence.

Note the theoretical tension with Schmidt & Wulf (1997), who found that continuous concurrent feedback can degrade long-term skill retention. This study measures task performance during a single session, not retention, which is the appropriate scope for the applied framing (body schema extension, not motor skill acquisition per se).
