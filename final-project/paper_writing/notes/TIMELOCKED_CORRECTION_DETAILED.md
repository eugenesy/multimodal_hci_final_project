# Time-Locked Correction Explained in Deep Detail
## Understanding the Steering Response Figure (Slide 8, Right Panel)

---

## **The Core Concept: What Is "Time-Locked"?**

### **Imagine This Scenario:**

A player is tilting their phone, controlling a ball on a tightrope path.

The ball drifts toward the edge. The **phone warns them**: 
- Haptic group: vibration pulse
- Audio group: beep sound
- None group: nothing (but they see it on screen)

**At that exact moment, time = 0.**

Now: **What does the player do in the next 3 seconds?**
- Do they tilt back immediately?
- How fast do they recover?
- Which modality recovers fastest?

That's what time-locked correction measures.

---

## **Why "Time-Lock"?**

### **The Problem Without Time-Locking:**

If you just looked at raw data:
- Player A gets a warning at 15 seconds into the game
- Player B gets a warning at 45 seconds into the game
- Player C gets a warning at 75 seconds into the game

These warnings happen at **different times in the game**, so you can't compare them directly.

### **The Solution: Time-Lock**

Take every warning event in the study, and **reset time to zero at the moment of each warning.**

Then overlay them all on the same timeline:

```
Player A warning: [−1s] [0s] [+1s] [+2s] [+3s]
Player B warning:        [−1s] [0s] [+1s] [+2s] [+3s]
Player C warning:               [−1s] [0s] [+1s] [+2s] [+3s]

Align them:
        [−1s] [0s] [+1s] [+2s] [+3s]  ← All warnings at t=0
Player A: ✓     ⚠️   ↩️    ↩️    ✓
Player B: ✓     ⚠️   ↩️    ↩️    ✓
Player C: ✓     ⚠️   ↩️    ↩️    ✓
```

Now you can **compare how people responded to the warning**, independent of when in the game it happened.

---

## **What Actually Is a "Proximity Escalation Event"?**

### **The Game's Warning System:**

The game constantly monitors: **"How close is the ball to the edge?"**

This is measured in **proximity levels:**
- **Level 0:** Safe (far from edge)
- **Level 1:** Caution (getting closer)
- **Level 2:** Warning (pretty close)
- **Level 3:** Danger (very close)

### **An Escalation Event:**

When the proximity level **jumps up** — e.g., from Level 1 → Level 2, or Level 0 → Level 1 — that's a **proximity escalation.**

At that moment:
- **Haptic group:** Feels vibration intensify
- **Audio group:** Hears beep get faster/higher
- **None group:** Sees the game change (visual only)

### **Example Timeline:**

```
Time (seconds):    −1.0   −0.5    0.0    +0.5   +1.0   +1.5   +2.0

Proximity level:    1      1      2→3     2      1      1      0
                                  ↑
                            ESCALATION EVENT
                            (warning fires here)

Player action:     drifting drifting FEELS  TILTS  TILTS  TILTS  SAFE
                              INFO    BACK   BACK   BACK
```

---

## **What Each Panel Shows:**

### **Left Panel: Proximity Level Over Time**

**Y-axis:** Proximity level (0–3, where 3 = most dangerous)

**What it answers:** **"After the warning, how fast does the player get back to safety?"**

#### **If Haptic (blue) line drops fastest:**
→ "Haptic players recovered to safe zones faster"
→ Suggests haptic feedback helps them steer back quickly

#### **If All lines drop at the same rate:**
→ "All modalities recover at the same speed"
→ No modality advantage in recovery time

#### **What we found:**
✅ **All three lines drop together.** No modality difference.

---

### **Right Panel: Tilt Magnitude Over Time**

**Y-axis:** Tilt magnitude = `sqrt(gamma² + beta²)`
- This measures **how much the player is tilting the phone**
- Larger number = tilting harder/faster

**What it answers:** **"After the warning, how aggressively does the player correct?"**

#### **If Haptic (blue) line spikes higher:**
→ "Haptic players make bigger corrective tilts"
→ Suggests haptic feedback triggers stronger steering

#### **If all lines spike equally:**
→ "All modalities trigger similar-sized corrections"
→ No modality advantage in correction magnitude

#### **What we found:**
✅ **All three lines peak at similar heights.** No modality difference.

---

## **Reading the Figure: A Real Example**

Let's trace one escalation event for an Audio group player:

```
TIME        WHAT'S HAPPENING               PROXIMITY    TILT
            (What the player experiences)   LEVEL       MAG

−1.0 sec    Ball drifting. Player casual.   Level 1      Low
            (~15 degrees tilt)

−0.5 sec    Still drifting. No warning yet. Level 1      Low

 0.0 sec    🔔 BEEP! Audio warning fires!   Level 2      Starts ↑
            Brain registers: "Getting close"             rising

+0.5 sec    Player tilts back hard.         Level 2      Peak ↑
            Maximum corrective effort.      (staying)    (highest
                                                         tilt)

+1.0 sec    Correction working. Proximity   Level 1      Falls ↓
            dropping. Ball moving back.

+1.5 sec    Back in safe zone.              Level 0      Low
            Player relaxes tilting.         (Safe)

+3.0 sec    Baseline behavior resumed.      Level 0      Normal
            Ball back on track.
```

**Key insight:** From beep (t=0) to recovery (t=~1.5 sec), about **1.5 seconds.**

---

## **Why This Matters: What We're Testing**

### **Question: Do feedback modalities help players react faster?**

#### **Hypothesis (what we expected):**
- **Haptic players** (feel vibration): React fast, recover in ~1 sec
- **Audio players** (hear beep): React medium, recover in ~1.5 sec
- **None players** (see only): React slow, recover in ~2 sec

#### **What we actually found:**
- **All three groups:** Recover in same time (~1.5 sec)
- **All three groups:** Peak tilt magnitude similar
- **All three groups:** Proximity drops at same rate

#### **Conclusion:**
"Modality doesn't predict how fast or aggressively players respond to warnings."

---

## **The Shaded Bands (±SE)**

The gray/blue/red areas around each line show **variability.**

### **What It Means:**

If the band is **narrow:** Players in that group were consistent (all reacted similarly)

If the band is **wide:** Players were inconsistent (some reacted fast, some slow)

### **Our Data:**

✅ **All three bands are similar width** → All modalities have similar variability.

---

## **Excluded Events: The Fine Print**

The figure caption says: *"Events within 500 ms of a fall or respawn were excluded."*

### **Why Exclude These?**

If the player just **fell and the ball respawned**, they can't respond normally.
- They're recovering mentally from the fall
- The ball position just jumped
- Response would be artificial, not real

So we only analyzed "clean" escalation events where the player had **full control.**

---

## **The Three Panels Tell a Story Together (Slide 8)**

### **Panel 1 (Learning Curve):**
"Over the whole game session, all groups follow the same difficulty pattern."

### **Panel 2 (Time-Locked Response):**
"In individual moments of threat, all groups respond the same way."

### **Together:**
"Modality doesn't predict performance at any scale—macro (whole game) or micro (single warning)."

---

## **If Someone Asks These Questions:**

### **Q: "Why does the proximity level stay high right after the warning?"**

A: "Because the player's tilt hasn't fully taken effect yet. There's a slight lag between when they tilt and when the ball position updates. By t=+1 to +1.5 sec, the correction shows up."

---

### **Q: "If haptic was better, what would we see?"**

A: "The blue line (haptic) would drop faster and peak higher. It would show:
- Faster proximity recovery (left panel blue line crosses down earlier)
- Larger tilt corrections (right panel blue line spikes higher)

But we don't see that. All three lines look identical."

---

### **Q: "What about reaction time?"**

A: "Good question. The time from t=0 (warning) to when tilt magnitude peaks (right panel) is roughly **0.3–0.5 seconds**. This is similar across all modalities—no modality has a faster reaction time."

---

### **Q: "Why can't you test individual responsiveness from this?"**

A: "Because all three groups show the same average response. To know 'does person X respond better to haptic than audio?' you'd need to test the same person with both modalities and compare. This study tested different people in different modalities, so we can only see group-level patterns."

---

## **Simple Takeaway:**

**Time-locked correction shows:**

✅ When warned, all players tilt back similarly  
✅ All players recover at similar speeds  
✅ All players reach safety in similar timeframes  
✅ **Modality doesn't predict real-time steering response**

This is **evidence that individual differences matter more than technology choice.**

---

**Memorize this:** *"Time-locked correction shows that when warned, all three groups steered back at the same speed with similar magnitude. No modality had an advantage in real-time response."* 🎯
