/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SectionLabel = "Intro" | "Verse" | "Pre-Hook" | "Hook" | "Bridge" | "Outro";
export type StemType = "Drums" | "Bass" | "Melody" | "FX" | "Full";
export type Genre = "Trap" | "Hip Hop" | "Drill" | "Pop" | "Trip Hop";

export interface Section {
  id: string;
  label: SectionLabel;
  start: number;
  end: number;
}

export interface Loop {
  id: string;
  name: string;
  type: StemType;
  duration: number;
  bpm: number;
  bars: number;
  url: string;
}

export type SubBarEventType = "Note On" | "Sweep" | "Chop" | "Dropout" | "Fill" | "Re-entry" | "Silence";

export interface SubBarEvent {
  id: string;
  type: SubBarEventType;
  startBeat: number;
  endBeat: number;
}

export interface ArrangementClip {
  id: string;
  stem: string; // e.g. "Drums", "Bass"
  startBar: number; // e.g. 1
  endBar: number; // exclusively end bar, e.g. if start 1 end 5, duration is 4 bars
  energy: number;
  assignedLoopId: string;
}

export interface TabData {
  id: number;
  sections: Section[];
  clips: ArrangementClip[];
  assignments: Record<string, string>; // kept for backward compat if needed
  energyLevels: Record<string, number>; // kept for backward compat if needed
  fxAssignments: Record<string, string>;
  subBarEvents?: Record<string, SubBarEvent[]>;
}

export interface SpectralProfile {
  brightness: number;
  noisiness: number;
  bands: {
    bass: number;
    mids: number;
    highs: number;
  };
}

export interface SectionBoundary {
  start: number;
  end: number;
  label: string;
}

export interface ChordEstimation {
  start: number;
  end: number;
  chord: string;
}

export interface BarDetails {
  number: number;
  start: number;
  end: number;
  beats: number[];
}

export interface SeriesPoint {
  time: number;
  value: number;
}

export interface AudioAnalysisResult {
  bpm: number;
  bpm_confidence?: number;
  alt_bpm?: number[];
  key: string;
  duration: number;
  beats: number[];
  non_standard_bars?: boolean;
  theoretical_bars?: number;
  avg_energy: number;
  avg_density: number;
  energy_profile: SeriesPoint[];
  density_profile: SeriesPoint[];
  spectral_profile: SpectralProfile;
  section_boundaries: SectionBoundary[];
  chords: ChordEstimation[];
  bars: BarDetails[];
}
