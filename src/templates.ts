/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SectionLabel, StemType, Genre, Loop, Section, TabData } from "./types";

// 5 genres: Trap, Hip Hop, Drill, Pop, Trip Hop
export const DRUM_PATTERNS: Record<string, Record<string, number[]>> = {
  Trap: {
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
  },
  "Hip Hop": {
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
  },
  Drill: {
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1],
    hat: [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1]
  },
  Pop: {
    kick: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  "Trip Hop": {
    kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1]
  }
};

// Chord progressions by genre
export const CHORD_PROGRESSIONS: Record<string, number[][]> = {
  Trap: [[60, 63, 67], [56, 60, 63], [58, 62, 65], [55, 58, 62]],
  "Hip Hop": [[60, 64, 67], [57, 60, 64], [55, 59, 62], [53, 57, 60]],
  Drill: [[58, 61, 65], [55, 58, 61], [53, 56, 60], [51, 55, 58]],
  Pop: [[60, 64, 67], [62, 65, 69], [57, 60, 64], [55, 59, 62]],
  "Trip Hop": [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]]
};

export const CHORD_NAMES: Record<string, string[]> = {
  Trap: ["Cm", "Ab", "Bb", "Gm"],
  "Hip Hop": ["C", "Am", "G", "F"],
  Drill: ["A#m", "Gm", "Fm", "D#m"],
  Pop: ["C", "Dm", "Am", "G"],
  "Trip Hop": ["Am7", "Fmaj7", "G7", "Em7"]
};

const ENERGY_DENSITY: Record<number, number> = {
  1: 0.15, 2: 0.3, 3: 0.5, 4: 0.7, 5: 0.9
};

const MELODY_MOTIFS: Record<number, number[]> = {
  1: [0, 2],
  2: [0, 2, 4],
  3: [0, 2, 4, 5],
  4: [0, 2, 4, 5, 7],
  5: [0, 2, 4, 5, 7, 9, 11]
};

export function getPatternForSection(
  stem: string,
  _section: string,
  energyLevel: number,
  genre: string = "Trap"
): any[] {
  const result: any[] = [];
  const steps = 16;
  const energy = Math.min(5, Math.max(1, energyLevel));
  const density = ENERGY_DENSITY[energy];
  const patterns = DRUM_PATTERNS[genre] || DRUM_PATTERNS.Trap;

  if (stem.toLowerCase() === "drums") {
    for (let step = 0; step < steps; step++) {
      if (patterns.kick[step] === 1 && Math.random() < density) {
        result.push({ step, type: "KICK", velocity: 70 + energy * 6 });
      }
      if (patterns.snare[step] === 1 && Math.random() < density) {
        result.push({ step, type: "SNARE", velocity: 80 + energy * 4 });
      }
      if (patterns.hat[step] === 1 && Math.random() < density * 1.2) {
        result.push({ step, type: "HAT", velocity: 50 + energy * 8 });
      }
    }
  }

  if (stem.toLowerCase() === "bass") {
    for (let step = 0; step < steps; step++) {
      const isStrongBeat = step % 4 === 0;
      const shouldPlay = isStrongBeat || (energy >= 3 && step % 2 === 0 && Math.random() < density);
      if (shouldPlay) {
        result.push({
          step,
          note: 36 + (energy >= 4 ? 12 : 0),
          duration: 0.25,
          velocity: 60 + energy * 8
        });
      }
    }
  }

  if (stem.toLowerCase() === "melody") {
    const motif = MELODY_MOTIFS[energy] || MELODY_MOTIFS[3];
    const repeatEvery = Math.max(2, 6 - energy);
    for (let step = 0; step < steps; step++) {
      const stepMod = step % 4;
      const shouldPlay = (stepMod === 0) || (energy >= 3 && stepMod === 2) || (energy >= 4 && Math.random() < 0.5);
      if (shouldPlay && Math.random() < density) {
        const motifIndex = Math.floor(step / repeatEvery) % motif.length;
        const noteOffset = motif[motifIndex];
        const octave = energy >= 4 ? 2 : 1;
        result.push({
          step,
          note: 60 + noteOffset + (octave * 12),
          duration: 0.5,
          velocity: 65 + energy * 7
        });
      }
    }
  }

  return result;
}

export function generateTabVariation(
  genre: Genre,
  loops: Loop[],
  _totalBars: number,
  _variationIdx: number
): Partial<TabData> {
  let sections: Section[] = [
    { id: "1", label: "Intro", start: 1, end: 8 },
    { id: "2", label: "Verse", start: 9, end: 24 },
    { id: "3", label: "Hook", start: 25, end: 32 }
  ];

  if (genre === "Pop") {
    sections = [
      { id: "1", label: "Intro", start: 1, end: 4 },
      { id: "2", label: "Verse", start: 5, end: 16 },
      { id: "3", label: "Pre-Hook", start: 17, end: 20 },
      { id: "4", label: "Hook", start: 21, end: 28 },
      { id: "5", label: "Outro", start: 29, end: 32 }
    ];
  }

  if (genre === "Trip Hop") {
    sections = [
      { id: "1", label: "Intro", start: 1, end: 4 },
      { id: "2", label: "Verse", start: 5, end: 16 },
      { id: "3", label: "Hook", start: 17, end: 24 },
      { id: "4", label: "Verse", start: 25, end: 28 },
      { id: "5", label: "Outro", start: 29, end: 32 }
    ];
  }

  if (genre === "Trap" || genre === "Drill") {
    sections = [
      { id: "1", label: "Intro", start: 1, end: 4 },
      { id: "2", label: "Hook", start: 5, end: 12 },
      { id: "3", label: "Verse", start: 13, end: 24 },
      { id: "4", label: "Hook", start: 25, end: 32 }
    ];
  }

  const energyLevels: Record<string, number> = {};
  const assignments: Record<string, string> = {};

  sections.forEach(section => {
    (["Drums", "Bass", "Melody"] as StemType[]).forEach(stem => {
      const key = `${section.id}-${stem}`;
      if (section.label === "Intro") energyLevels[key] = 2;
      else if (section.label === "Verse") energyLevels[key] = 3;
      else if (section.label === "Pre-Hook") energyLevels[key] = 4;
      else if (section.label === "Hook") energyLevels[key] = 5;
      else if (section.label === "Outro") energyLevels[key] = 1;
      else energyLevels[key] = 3;

      const matchingLoop = loops.find(l => l.type === stem);
      assignments[key] = matchingLoop ? matchingLoop.id : stem;
    });
  });

  return { sections, assignments, energyLevels, fxAssignments: {} };
}
