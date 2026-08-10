# Statistics Explained Simply
## For PathSense Study

---

## **The Big Question We Asked:**
**"Does feedback modality (Haptic vs. Audio vs. None) change how many times people fall?"**

---

## **Test 1: Kruskal-Wallis**

### **What it does:**
Compares **all three groups at once** to see if they're different.

### **In plain English:**
"Are Haptic, Audio, and None groups all performing the same, or is at least one different?"

### **Our result:**
❌ **All p > 0.19** → They're all the same. No winner.

### **When to mention:**
*"We used Kruskal-Wallis tests across all three modalities..."*

---

## **Test 2: Mann-Whitney U**

### **What it does:**
Compares **two specific groups** one pair at a time.

### **In plain English:**
"Is Haptic better than Audio? Is Audio better than None?" (etc.)

### **Our result:**
❌ **All p > 0.27** → No pairwise differences either.

### **When to mention:**
*"We then ran Mann-Whitney U tests to check pairs..."*

---

## **Test 3: Bayes Factor (BF₀₁)**

### **What it does:**
Measures **evidence for the null hypothesis** (NOT finding a difference).

### **In plain English:**
Instead of just saying "we didn't find a difference," it says "**how much evidence is there that there really is NO difference?**"

### **Our result:**
✅ **BF₀₁ ≈ 84** → 84 times more evidence for "no effect" than "there is an effect"

### **Why it matters:**
- **p > 0.05** just means "we didn't find a difference"
- **BF₀₁ = 84** means "the data actively supports NO difference"

### **When to mention:**
*"Bayesian analysis (BF₀₁ ≈ 84) showed strong evidence against a modality effect..."*

---

## **Test 4: Effect Size (rank-biserial r)**

### **What it does:**
Measures **how big the actual difference is**, separate from whether it's statistically significant.

### **In plain English:**
"Even if groups were different, would it matter? Or is the difference tiny?"

### **Our result:**
❌ **r = −0.44 to +0.25** → Negligible to small differences. Doesn't matter in practice.

### **Why it matters:**
You could have a statistically significant difference that's practically useless.
You could have no significant difference with tiny effect sizes (us).

### **When to mention:**
*"Effect sizes were negligible (r from −0.44 to +0.25), indicating minimal practical difference..."*

---

## **Test 5: Holm Correction**

### **What it does:**
Adjusts p-values when you test **many comparisons** (controls for "multiple testing problem").

### **In plain English:**
"If you test 100 things, you'll find 5 significant by chance. Holm fixes that."

### **Our result:**
Applied to Mann-Whitney U tests (3 pairwise comparisons).

### **When to mention:**
*"We applied Holm correction for multiple comparisons..."*

---

## **Quick Reference: What Each Tests Answers**

| Test | Question | Result |
|------|----------|--------|
| **Kruskal-Wallis** | Are all 3 groups different? | No (p > 0.19) |
| **Mann-Whitney U** | Are any 2 groups different? | No (p > 0.27) |
| **Bayes Factor** | How much evidence for NO effect? | Very strong (BF₀₁ ≈ 84) |
| **Effect Size** | How big is the actual difference? | Tiny (r ≈ 0.2) |
| **Holm Correction** | Did we account for multiple tests? | Yes |

---

## **The Summary Answer:**

**"What tests did you do?"**

> "We used **Kruskal-Wallis tests** to compare all three modalities, followed by **pairwise Mann-Whitney U tests** with Holm correction. To quantify evidence for the null, we computed **Bayes factors** (BF₀₁ ≈ 84), which strongly supported no modality effect. **Effect sizes** were negligible (r = −0.44 to +0.25), indicating no practical difference even if one existed."

Or simpler:

> "**Kruskal-Wallis** tests showed no modality difference (p > 0.19). **Bayes factors** (BF₀₁ ≈ 84) provided strong evidence for this null result. **Effect sizes** were negligible."

---

## **If They Ask Follow-Up Questions:**

**Q: "Why Kruskal-Wallis instead of ANOVA?"**
A: "Small sample sizes (n=8–9) and non-normal distributions of fall counts. Non-parametric tests are more robust."

**Q: "What's BF₀₁?"**
A: "Bayes Factor for null. Values > 1 mean evidence for 'no effect.' Our 84 means 84× more support for no modality difference."

**Q: "Why do you care about effect size?"**
A: "Because p-values only say if something exists, not if it matters. Our effect sizes are tiny, so even if differences existed, they wouldn't be useful in practice."

---

**Print this out or memorize the table above!** 🎯
