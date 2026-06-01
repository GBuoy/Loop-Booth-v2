/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SectionLabel = "Intro" | "Verse" | "Pre-Hook" | "Hook" | "Bridge" | "Outro";
export type StemType = "Drums" | "Bass" | "Melody" | "FX";
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

export interface TabData {
  id: number;
  sections: Section[];
  assignments: Record<string, string>; // key: `${section.id}-${stem}` -> loopId or loopName
  energyLevels: Record<string, number>; // key: `${section.id}-${stem}` -> 1..5
  fxAssignments: Record<string, string>;
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
  key: string;
  duration: number;
  beats: number[];
  avg_energy: number;
  avg_density: number;
  energy_profile: SeriesPoint[];
  density_profile: SeriesPoint[];
  spectral_profile: SpectralProfile;
  section_boundaries: SectionBoundary[];
  chords: ChordEstimation[];
  bars: BarDetails[];
}
