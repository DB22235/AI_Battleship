---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.
---

# Tactical Frontend Design — Adaptive AI Battleship

This skill establishes the aesthetic and UI design system for **Adaptive AI Battleship**: a restrained, high-fidelity dark-navy tactical command center.

---

## 1. Visual Identity & Design Tokens

Avoid noisy sci-fi dashboards, neon overload, or generic SaaS cards. The game board and tactical state must remain primary, readable, and elegant.

### Color Palette

| Token | Hex Value | Purpose |
|---|---|---|
| `bg-primary` | `#080D18` | Deepest tactical navy background |
| `bg-secondary` | `#0D1525` | Section background, containers |
| `surface-card` | `#111C2E` | Tactical panels, player boards |
| `surface-elevated` | `#17243A` | Modals, elevated dialogs, popovers |
| `accent-cyan` | `#45D7E8` | Primary active targeting, player focus |
| `accent-blue` | `#568BFF` | Secondary accents, structural markers |
| `accent-purple` | `#A78BFA` | AI Insight accent, probability overlays |
| `status-hit` | `#FF647C` | Direct hit, high danger flare |
| `status-miss` | `#7F93AC` | Ocean miss splash, neutral inactive |
| `status-success` | `#4ADE9B` | Valid placement, win state, unlocks |
| `status-warning` | `#FBBF65` | Sunk ship alerts, notifications |
| `text-primary` | `#F2F6FC` | High contrast headings & active stats |
| `text-secondary` | `#A6B4C8` | Subtitles, coordinate labels, descriptions |
| `text-muted` | `#72829A` | Inactive coordinates, captions, meta info |
| `border-subtle` | `#24334A` | Grid cell borders, panel dividers |

### Typography & Spacing
- **Typography:** `Inter` or `Manrope` (clean, geometric, highly legible at small sizes).
- **Grid Spacing:** Strict 8px modular scale ($8\text{px}, 16\text{px}, 24\text{px}, 32\text{px}$).
- **Border Radii:** Cards: $10\text{px} - 16\text{px}$; Buttons: $8\text{px} - 12\text{px}$; Grid Cells: $4\text{px} - 6\text{px}$.

---

## 2. Battleship Grid Semantics & Cell States

Accessibility rule: **Never rely on color alone**. Every cell state must combine a distinct icon/shape or typographic treatment with its color.

- `untested`: Subtle border, dark navy fill, accessible coordinate hover label.
- `hover`: Tactical reticle with `#45D7E8` corners.
- `selected`: Pulsing `#45D7E8` cyan lock-on crosshair.
- `miss`: Center dot / splash ring in `#7F93AC`.
- `hit`: Fiery flame / explosion cross in `#FF647C`.
- `sunk`: Dark steel red with an anchor/skull icon or striped fill.
- `predicted`: Soft translucent `#A78BFA` heatmap glow with numeric rank or relative score badge.
- `valid-preview`: Translucent `#4ADE9B` green ship silhouette.
- `invalid-preview`: Translucent `#FF647C` red strikeout outline.

---

## 3. Responsive Screen Layouts

- **Desktop ($1440\times900$ & $1280\times800$):**
  - Side-by-side boards: **Your Fleet** (left) and **Enemy Waters** (right).
  - Collapsible or docked **AI Intelligence** panel displaying real-time explainable scores.
- **Tablet ($768\text{px}$):**
  - Stacked boards or compact side panels, AI analysis accessible via drawer or below boards.
- **Mobile ($390\text{px}$):**
  - Segmented control to toggle between **Your Fleet** and **Enemy Waters**.
  - Large touch targets ($\ge 44\text{px} \times 44\text{px}$). AI Intelligence in a bottom drawer.
