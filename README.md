# Loop Booth: A Comprehensive Systems Architecture

An advanced, desktop-grade full-stack composition engine designed to dismantle the 8-bar creative loop-lock. Utilizing a combination of **Signal Intelligence**, **Logarithmic Spectral Logic**, and **Creative Misuse**, Loop Booth bridges the gap between static looping and dynamic, commercial-ready, multi-section arrangements.

---

## 1. Architectural Blueprint & File Tree

Below is the complete structural layout of the Loop Booth ecosystem.

```text
loop-booth/
├── .env.example               # Environment schema configuration template
├── .gitignore                 # Platform build and binary artifact exclusion configuration
├── index.html                 # Main single-page application orchestrator entry browser frame
├── package.json               # Package declarations (including dual TSX dev & ESbuild server pipelines)
├── server.ts                  # Production-grade Express + Vite Middleware Server (Ingress Port 3000)
├── tsconfig.json              # TypeScript compilation strict checks
├── vite.config.ts            # Vite client compilation plugin parameters
├── src/
│   ├── main.tsx               # Client React DOM entry point
│   ├── index.css              # Custom Font Imports & Tailwind CSS v4 variables
│   ├── App.tsx                # Central Control State, Audio Web-Context Processing, and System Logs
│   ├── types.ts               # Strong type signatures (Stem kinds, Section boundaries, Tab structures)
│   ├── templates.ts           # Genre structural algorithmic templates and tension curve patterns
│   ├── MidiGenerator.ts       # Low-level MIDI binary array encoder (Generates separate 4-Channel dynamic files)
│   ├── DAWProjectCompiler.ts  # Universal DAWProject XML encoder & dynamic ZIP multi-stem packager
│   └── components/
│       ├── ArrangementGrid.tsx # Double-axis timeline sequencer grid (Sect. bounds vs. Track stems)
│       ├── LoopUploader.tsx    # Drag-and-drop AudioContext decoder and sampler metadata analyzer
│       └── SectionEditor.tsx   # Visual tension block manipulator and dynamic bar-alignment tool
```

---

## 2. Technical Capabilities vs. Executive Vision

This software directly addresses the core pillars established in the **Loop Booth Vision Statement**:

### 🎹 Logarithmic Spectral Intelligence & Ingestion
* **Multi-Stem Support**: High-level ingestion for **Drums**, **Bass**, **Melody**, and a global **Full (All-in-One)** compound loop tier—making single-waveform analysis immediately viable for full-mix scaffolding.
* **Intelligent Pitch Shift**: Designed to interface with logarithmic models. The application's core structural logic and chord detection are bound to natural-frequency harmonic structures to maintain perfect context under Constant-Q (CQT) and Source-Filter transposition curves.

### 📈 Structural Evolution: Tension-Driven Scaffolding
* **Dual-Axis Arrangement Engine**: An interactive, responsive SVG/CSS map pairing timeline sections (Intro, Verse, Pre-Hook, Hook, Bridge, Outro) against individual channel gains (Energy Levels: `1` to `5`).
* **Heuristic Orchestrator**: The "AI Suggest Mode" instantly charts linear or peak-tension curves matching the requested genre parameters (`Trap`, `Hip Hop`, `Drill`, `Pop`, `Trip Hop`).

### 🛠️ Universal DAW Export & System Synchronizer
* **Export DAWProject (`.dawproject`)**: Compiles native, structural DAW-independent XML containers with fully tracked markers, tempos, timeline regions, and arrangement tracks. Perfect for immediate structural ingestion into standard systems like Bitwig Studio, Studio One, and others.
* **Reaper ReaScript Sync**: Generates python-based localized API command scripts to reconstruct timeline indices, regions, and grid points directly in Reaper.
* **FL Studio Piano Roll Sync**: Creates customizable Python scripts designed to align structural transitions and marker bounds into the FL Studio sequencer landscape.
* **4-Channel High-Fidelity MIDI Generator**: Encodes clean, low-level binary MIDI format structures. Renders independent tracks based on pitch templates and genre configurations to let you map raw sequences to your synthesizer stack.
* **Exportable Session Brain (`JSON`)**: Renders highly formatted, raw serialized configuration coordinates containing timestamps, section bounds, BPM, genre weights, and loop signatures for downstream analysis and generative model retraining pipelines.

---

## 3. Deployment & Execution Flow

### System Prerequisites
To start the developer environment programmatically:
```bash
# Install initial dependencies
npm install

# Run the development environment on Port 3000 (binds to 0.0.0.0 for Cloud ingress)
npm run dev

# Build production bundle using Esbuild (Bundles custom TS server to portable CommonJS)
npm run build

# Start production server
npm run start
```
