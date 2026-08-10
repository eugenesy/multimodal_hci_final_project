# PathSense

**A smartphone-native tightrope balance game for proximity-feedback research.**

Participants hold an Android phone with their non-dominant hand and tilt it to keep a ball on a narrow path. Three between-subjects groups receive different proximity feedback modalities (haptic, audio, none) as the ball approaches the path edge. Falls are the primary outcome measure.

Built for a Multimodal HCI course final project at NTU × Academia Sinica, 2026.

---

## Study Summary

- **25 participants**, ages 13–18, non-dominant hand only
- **3 modalities**: haptic vibration, audio tones, no feedback
- **4 difficulty levels**: Practice → Easy → Medium → Hard
- **Key finding**: No significant modality effect (Kruskal-Wallis p > 0.19; BF₀₁ ≈ 84 at Easy level), but a 10× baseline gap between groups reveals individual differences matter more than modality choice

Full results in [`paper_writing/paper.pdf`](paper_writing/paper.pdf).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Game engine | [Phaser 3](https://phaser.io/) |
| Server | Node.js + Socket.IO |
| Transport | HTTPS (self-signed cert for gyroscope access) |
| Gyroscope | GyroNorm.js |
| Database | SQLite via better-sqlite3 |
| Analysis | Python (pandas, scipy, matplotlib) |
| Paper | LaTeX / ACM sigconf (tectonic) |

---

## How to Run

### Prerequisites
- Node.js v18+
- OpenSSL (for HTTPS certificate)

### Setup

```bash
npm install

# Generate HTTPS cert (required for gyroscope on phones)
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=localhost"

node server.js
```

Three URLs are printed on boot:
- `https://localhost:3000/` — Game display (external monitor)
- `https://localhost:3000/admin` — Researcher admin panel
- `https://<ip>:3000/controller` — Player phone (shown as QR on admin panel)

To trust the cert on phones: open `https://<ip>:3000/cert` and install it.

---

## Repository Structure

```
.
├── server.js               # Node.js game server (Socket.IO, SQLite)
├── public/
│   ├── index.html          # Game display
│   ├── admin.html          # Researcher panel
│   ├── controller.html     # Phone controller
│   └── js/
│       ├── game.js         # Phaser 3 MarbleScene
│       ├── display.js      # Display socket client
│       ├── admin.js        # Admin socket client
│       └── controller.js   # Phone gyroscope + feedback
├── paper_writing/
│   ├── paper.tex           # Final paper (ACM sigconf)
│   ├── paper.pdf           # Compiled PDF
│   ├── presentation.tex    # Beamer slides
│   ├── analysis.py         # Statistical analysis script
│   ├── mhci.bib            # Bibliography
│   └── images/             # Figures and photos
├── CLAUDE.md               # Architecture and dev notes
├── RESEARCH.md             # Study design and hypotheses
└── proposal_presentation.mov  # Early study proposal presentation
```

---

## Paper

The final paper is [`paper_writing/paper.pdf`](paper_writing/paper.pdf) (4 pages, ACM sigconf format).

Key sections: PathSense platform description, between-subjects study design, Kruskal-Wallis and Mann-Whitney results with Bayes factors, time-locked steering response analysis.

## Proposal

[`proposal_presentation.mov`](proposal_presentation.mov) is the original study proposal presentation, recorded before data collection.
