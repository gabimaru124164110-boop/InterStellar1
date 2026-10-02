# InterStellar 🌌

A mobile-first, online planetarium engine built as a full-stack TypeScript project.

## What is included

### Frontend
- Three.js/WebGL 2 renderer
- Responsive mobile UI
- Pointer/touch sky navigation
- Dynamic field-of-view based tile loading
- Streaming star renderer
- RA/Dec grid
- Named-object search
- Planet/Sun/Moon positions using Astronomy Engine
- Time machine controls
- Observer location controls
- Layer toggles
- Tile cache + stale tile eviction
- NASA Milky Way background hook

### Backend
- Express REST API
- Sky tile endpoint
- Search endpoint
- Solar-system endpoint
- Star catalogue importer for HYG v4.1
- Build-time tiling of the star catalogue
- Configurable tile LOD and magnitude limits
- Static tile serving

## Architecture

```text
Camera
  │
  ├── direction
  ├── FOV
  └── zoom
       │
       ▼
Visibility / Tile Manager
       │
       ├── required sky tiles
       ├── prefetch ring
       └── stale tile eviction
       │
       ▼
Backend /api/sky/tiles
       │
       ▼
Prebuilt tile catalogue
       │
       ▼
GPU point cloud
```

The browser does NOT ask the backend for every star on every frame. It only asks for the tiles intersecting the current view plus a small predictive margin.

## Setup

Requires Node.js 20+.

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Optional: import a real star catalogue

HYG v4.1 is CC BY-SA 4.0 according to its archived repository. The importer can download the CSV from GitHub when your machine has internet access.

```bash
cd backend
npm run import:hyg
```

This produces compact JSON tile files under `backend/data/tiles`.

### 3. Start the backend

```bash
cd backend
npm run dev
```

Default:
`http://localhost:8787`

### 4. Start the frontend

In another terminal:

```bash
cd frontend
npm run dev
```

Open the Vite URL.

## NASA sky asset

InterStellar is configured to use NASA SVS Deep Star Maps 2020 as its Milky Way background. The app defaults to the official NASA 4K preview JPEG so the project remains small.

For a self-hosted production deployment, put a processed version in:

```text
frontend/public/assets/milkyway.jpg
```

and set:

```text
VITE_MILKYWAY_URL=/assets/milkyway.jpg
```

NASA's Deep Star Maps 2020 entry is ID 4851. It provides celestial-coordinate maps in ICRF/J2000 and states that the celestial mapping is designed for spherical mapping and 3D animation.

## Production notes

The first version uses rectangular RA/Dec tiles because they are easy to inspect and debug. The tile provider interface is intentionally isolated so it can be replaced by HEALPix/NESTED indexing without changing the renderer.

For a large production catalogue:
- preprocess Gaia/Hipparcos/Tycho/HYG sources into binary tile chunks
- store only catalogue fields needed by the renderer
- use magnitude thresholds by LOD
- use typed-array transfer formats
- serve immutable hashed tile files through a CDN
- keep search/index data separate from render data

## Credits and licensing

- NASA SVS Deep Star Maps 2020: see NASA SVS entry 4851.
- HYG Database v4.1: CC BY-SA 4.0. Preserve attribution/share-alike when redistributing derivative data.
- Astronomy Engine: MIT license.
- Three.js: MIT license.

Do not bundle third-party planetary texture packs into your own distribution unless their specific license terms permit your intended use. Solar System Scope states that its texture pack is distributed under CC BY 4.0.
