# Inspira — Project Context Document
*Generated: 2026-04-28 | Session migration checkpoint*

---

## 1. UI/UX & Theming

### Design Direction
**Premium luxury interior design studio aesthetic** — warm, restrained, editorial. Reference: Oliver Burns Studio, Shalini Misra Design, LOUD.srl (for motion principles).

### Colour Palette
```
--cream:   #f0ebe0   — main background (warm off-white)
--warm:    #e8e3d8   — stats section background (slightly darker cream)
--dark:    #1a1714   — near-black (text, CTA bg, footer bg)
--mid:     #4a4540   — body text on cream
--muted:   #6b6560   — secondary text
--light:   #b8b2a8   — labels, tags, captions
--border:  rgba(26,23,20,0.08)  — thin dividers
Hero bg:   #1c1510   — dark warm coffee
```

### Typography
```
--serif:   'Cormorant Garamond', Georgia, serif   — headlines (weights 300, 400, 500, italic)
--sans:    'Inter', sans-serif                    — body (weights 300, 400, 500, 600)
--mono:    'Space Mono', monospace                — labels, tags, coordinates
```
Loaded via Google Fonts + @fontsource/space-mono

### Type Scale
- Hero headline: `clamp(56px, 8vw, 120px)` — serif italic weight 300
- Section headlines: `clamp(44px, 6vw, 80px)` — serif weight 500
- Step titles: `clamp(28px, 3vw, 44px)` — serif weight 500
- Body: 15–16px Inter weight 400, line-height 1.85–1.95
- Labels: 9–11px Space Mono, letter-spacing 0.2em, uppercase
- Stats: `clamp(48px, 6vw, 80px)` — serif weight 400

### CSS Framework
Tailwind CSS v4 via `@tailwindcss/vite` plugin — used minimally. Most styling is inline React styles using CSS variables.

### CSS Variables (src/index.css)
```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
@import "@fontsource/space-mono/400.css";
@import "tailwindcss";

:root {
  --cream: #f5f0e8; --warm: #ede8de; --dark: #1a1714;
  --mid: #6b6560; --light: #b8b2a8; --border: rgba(26,23,20,0.10);
  --serif: 'Cormorant Garamond', Georgia, serif;
  --sans: 'Inter', sans-serif; --mono: 'Space Mono', monospace;
}
body { font-family: var(--sans); background: var(--cream); color: var(--dark); cursor: none; }
```

### Component Patterns
- **Cursor**: Two-part spring-physics ring. Outer ring (40px, stiffness 60, damping 18) + inner dot (6px, stiffness 500, damping 32). `mixBlendMode: 'difference'`. Expands on hover over buttons/links.
- **MagButton**: Magnetic spring physics on hover (stiffness 200, damping 14). `whileHover` glow on filled, border brighten on outline.
- **FadeIn**: IntersectionObserver + Framer Motion opacity+y. Once:true, margin -80px.
- **Reveal**: Line-by-line text reveal (y: 108% → 0) with stagger 0.1s per line.
- **Dividers**: `height:1, background: rgba(26,23,20,0.08)` — never use border property, always a div.

### Animation Principles
- Ease: `[0.16, 1, 0.3, 1]` (custom cubic bezier) for all reveals
- Duration: 0.9–1.2s for text, 0.8s for fades
- No bouncy animations. Slow, deliberate, confident.
- Scroll-triggered: useInView with once:true

### Hero Background
GLSL WebGL fluid shader (`src/components/FluidBackground.jsx`). Domain-warped simplex noise with fake environment mapping for liquid metal effect. Runs on canvas with ResizeObserver. Speed: `u_time * 0.10`. Used on loader screen only now (hero has static warm gradient instead).

---

## 2. Collaboration & Environment Setup

### Repository
- **GitHub**: `github.com/palgandhi/inspira` (public)
- **Branch**: `main`
- **Last commit**: `feat: landing page complete — luxury interior design theme`

### Local Machine
- MacBook Air M1 8GB
- macOS, zsh shell
- Python 3.11 via venv at `~/inspira/.venv`
- Node v22.18.0, npm 10.9.3

### Project Structure
```
~/inspira/
├── inspira/                    ← Python backend (FastAPI + CV pipeline)
│   ├── understanding/
│   │   └── inspiration_analyzer.py    ← Module 1 COMPLETE
│   ├── reconstruction/                ← Module 2 stub
│   ├── adaptation/                    ← Module 3 stub
│   └── utils/
│       ├── constants.py
│       ├── logger.py
│       └── datatypes.py
├── frontend/                   ← React 18 + Vite
│   ├── src/
│   │   ├── App.jsx             ← React Router, 4 routes
│   │   ├── index.css           ← CSS variables, fonts
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx ← COMPLETE
│   │   │   ├── UploadPage.jsx  ← stub
│   │   │   ├── ProcessingPage.jsx ← stub
│   │   │   └── ResultPage.jsx  ← stub
│   │   └── components/
│   │       ├── FluidBackground.jsx   ← GLSL WebGL shader
│   │       ├── FloatingObject.jsx    ← Three.js icosahedron
│   │       └── FeatureCards.jsx      ← Process steps
├── outputs/
│   └── reconstructions/
│       └── room_scene_final.ply      ← 131,276 Gaussians (our best so far)
├── data/
│   └── sample_rooms/converted/       ← 19 JPG room photos
├── docs/
│   ├── Inspira_SRS.docx
│   └── Inspira_SDS.docx
├── tests/
│   ├── test_inspiration_analyzer.py  ← 15 tests PASSING
│   └── test_perception.py            ← 15 tests PASSING
└── requirements.txt
```

### Dev Commands
```bash
# Frontend
cd ~/inspira/frontend && npm run dev    # → localhost:3000

# Backend (not yet built)
cd ~/inspira && source .venv/bin/activate
uvicorn inspira.api.main:app --reload   # → localhost:8000

# Module 1 test
python3 -m pytest tests/ -v
```

### Frontend Dependencies
```json
{
  "react": "18", "react-router-dom", "framer-motion",
  "@react-three/fiber", "@react-three/drei", "three",
  "tailwindcss", "@tailwindcss/vite",
  "@fontsource/space-mono"
}
```

### Reconstruction Environment
- **Platform**: Google Colab (T4 GPU) — Colab limits reset, use this
- **Known issue**: Viser viewer hangs training. Fix: `--vis wandb` flag
- **Known issue**: torch inductor SM error. Fix: `TORCH_COMPILE_DISABLE=1`
- **Photos on Kaggle**: `/kaggle/input/datasets/pal1008gandhi/inspira-dataset/` (19 JPGs)
- **Working PLY**: `~/inspira/outputs/reconstructions/room_scene_final.ply` (131K Gaussians, 16.4 dB PSNR)
- **Nerfstudio config path pattern**: `/content/ns_trained/ns_data/splatfacto/[timestamp]/config.yml`

### Ollama (Local AI)
- LLaVA 7B running via `ollama serve` on localhost:11434
- Used by Module 1 InspirationAnalyzer via REST API

---

## 3. Current Progress

### Module 1 — InspirationAnalyzer ✅ COMPLETE
**File**: `inspira/understanding/inspiration_analyzer.py`
- K-means clustering → 5 dominant colours
- CLIP ViT-B/32 two-pass grid detection → furniture categories (20 types)
- LLaVA 7B via Ollama REST → style, room_type, layout_description
- 15 tests passing
- Output: `InspirationImage` datatype with furniture list, palette, style, description

### Module 2 — RoomReconstructor 🔄 IN PROGRESS
- COLMAP registered 18/19 images successfully
- Custom gsplat training: 131,276 Gaussians, 16.4 dB PSNR
- PLY file saved at `outputs/reconstructions/room_scene_final.ply`
- Nerfstudio splatfacto attempts: 6 attempts, all failing at training start
- **Current blocker**: Viser viewer hangs process (fix: `--vis wandb`), torch inductor SM error (fix: env vars)
- Export to .splat format: NOT YET DONE
- Three.js viewer: NOT YET BUILT

### Module 3 — AdaptationEngine ⏭️ NOT STARTED
- Input: InspirationImage + RoomScan
- Output: AdaptedLayout with furniture placements, warnings, style score

### Module 4 — FastAPI Backend ⏭️ NOT STARTED
- 6 REST endpoints planned
- Async job queue for reconstruction

### Module 5 — Frontend ✅ LANDING PAGE DONE, other pages stubbed

#### Landing Page Sections (all complete):
1. **Loader**: Full-screen percentage counter with FluidBackground shader, progress bar
2. **Hero**: Dark warm coffee bg (#1c1510), SVG perspective room illustration, italic serif headline "See it in your room, / before it's in your room.", description + CTA bottom row
3. **Navbar**: Fixed, mix-blend-mode difference, serif logo, mono nav links, outlined CTA
4. **About**: Split layout — left: large serif headline "The gap between inspiration and reality is over." + body text. Right: floating Three.js icosahedron+octahedron+rings on cream bg
5. **How it works strip**: 3-panel (Upload / Photograph / Explore) on #e8e2d5
6. **Stats**: 4-column grid on #e8e3d8 — 450M, <60s, 94K, 100%
7. **Process (FeatureCards)**: Alternating left/right layout, 5 steps, watermark numbers, scroll-triggered reveals
8. **CTA**: Dark bg, italic serif headline, warm glow, cream button
9. **Footer**: Dark bg, serif logo, mono copyright

#### Other Pages:
- UploadPage.jsx — stub only ("Coming Soon")
- ProcessingPage.jsx — stub only
- ResultPage.jsx — stub only

---

## 4. Pending Tasks

### 🔴 Critical (blocks demo)
- [ ] **Fix nerfstudio training** — use `--vis wandb` + `TORCH_COMPILE_DISABLE=1`, get `.splat` file exported
- [ ] **Build Three.js .splat viewer** — integrate into ResultPage using `@pmndrs/gaussian-splats-3d`
- [ ] **UploadPage** — drag-drop inspiration image + room photos, validation, submit to backend
- [ ] **ProcessingPage** — animated progress steps (5 stages), polls backend for job status
- [ ] **ResultPage** — 3D viewer showing reconstructed room, toggle empty/furnished
- [ ] **FastAPI backend** — 6 endpoints minimum:
  - `POST /api/analyze-inspiration` — runs Module 1
  - `POST /api/upload-room-photos` — accepts photos
  - `POST /api/reconstruct` — starts reconstruction job
  - `GET /api/job/{job_id}` — polls job status
  - `GET /api/result/{job_id}` — returns adapted layout
  - `GET /api/splat/{job_id}` — serves .splat file

### 🟡 Important (polish)
- [ ] **Module 3 AdaptationEngine** — surface labelling, furniture placement, validation
- [ ] **Connect frontend to backend** — replace mock data with real API calls
- [ ] **3D viewer performance** — LOD, frustum culling for 131K Gaussians on M1
- [ ] **Mobile responsiveness** — landing page currently desktop-only
- [ ] **Commit all current work** — git add + push

### 🟢 Nice to have
- [ ] Deploy to Hugging Face Spaces
- [ ] Demo video recording
- [ ] README with screenshots

---

## 5. Implementation Guidelines

### Reconstruction — Correct Colab Setup
```python
# Always set these before ns-train
os.environ["TORCH_COMPILE_DISABLE"] = "1"
os.environ["TORCHINDUCTOR_DISABLE"]  = "1"
os.environ["QT_QPA_PLATFORM"]        = "offscreen"

# Always use --vis wandb to prevent viser from hanging
!ns-train splatfacto \
    --data /content/ns_data \
    --output-dir /content/ns_trained \
    --vis wandb \                          # ← CRITICAL
    --viewer.quit-on-train-completion True \
    --max-num-iterations 15000 \
    --steps-per-save 1000 \
    --pipeline.model.sh-degree 0 \
    --pipeline.model.use-scale-regularization True

# Export — always patch weights_only first
eval_path = "/usr/local/lib/python3.12/dist-packages/nerfstudio/utils/eval_utils.py"
# Replace: torch.load(load_path, map_location="cpu")
# With:    torch.load(load_path, map_location="cpu", weights_only=False)
```

### Frontend Architecture Rules
- **All styling**: inline React styles + CSS variables. No Tailwind classes in new components.
- **Animations**: Framer Motion only. No CSS transitions except `transition` on hover states.
- **Ease curve**: Always `[0.16, 1, 0.3, 1]` for reveals and fades.
- **No dark panels** inside the light (cream) sections — everything stays on cream or uses the stats bg (#e8e3d8).
- **No neon colors** — accent is warm gold `#c9a84c` if needed, never #c8ff00 (that was the old theme, completely removed).
- **Cursor**: Never use `cursor: pointer`. Always `cursor: none`. The custom cursor handles all feedback.
- **Fonts**: Serif for all headlines. Sans for body. Mono for labels/tags/coordinates only.

### Three.js Splat Viewer (to be built)
```bash
npm install @pmndrs/gaussian-splats-3d
```
```jsx
import { Viewer } from '@pmndrs/gaussian-splats-3d'
// Load room_scene_final.ply or nerfstudio exported .splat
// Render in ResultPage inside a fixed-height div
```

### FastAPI Backend Structure
```
inspira/api/
├── main.py          ← FastAPI app, CORS, startup
├── routes/
│   ├── inspiration.py   ← POST /analyze-inspiration
│   ├── reconstruction.py ← POST /reconstruct, GET /job/{id}
│   └── results.py        ← GET /result/{id}, GET /splat/{id}
├── jobs.py          ← In-memory job queue (asyncio)
└── models.py        ← Pydantic request/response models
```

### Do Nots
- ❌ Do NOT use `cursor: pointer` anywhere
- ❌ Do NOT add gradients to text (no bg-clip text)
- ❌ Do NOT use any neon/bright accent colors in the luxury theme
- ❌ Do NOT use `border-radius` on buttons (sharp corners only)
- ❌ Do NOT add scrollable carousels — use alternating layouts instead
- ❌ Do NOT run nerfstudio without `--vis wandb` (hangs forever)
- ❌ Do NOT retrain from scratch if a PLY checkpoint exists locally
- ❌ Do NOT use SuperSplat or Polycam to judge reconstruction quality — use our own Three.js viewer
