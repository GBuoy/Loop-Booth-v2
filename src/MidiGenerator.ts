/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CHORD_PROGRESSIONS } from "./templates";
import { TabData, Genre, StemType } from "./types";

function encodeVarInt(value: number): number[] {
  const bytes: number[] = [];
  do {
    let byte = value & 0x7F;
    value >>= 7;
    if (value > 0) byte |= 0x80;
    bytes.push(byte);
  } while (value > 0);
  return bytes;
}

export function generateStemMidis(
  tab: TabData,
  bpm: number,
  genre: Genre
): Record<string, Blob> {
  const result: Record<string, Blob> = {};
  const ppq = 480;
  const ticksPerBar = ppq * 4;
  const progression = CHORD_PROGRESSIONS[genre] || CHORD_PROGRESSIONS.Trap;

  const stems = [
    { name: "MELODY", channel: 0 },
    { name: "BASS", channel: 1 },
    { name: "DRUMS", channel: 9 }
  ];

  for (const stem of stems) {
    const trackData: number[] = [];
    let currentTick = 0;

    const headerChunk = new Uint8Array([
      0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06,
      0x00, 0x01, 0x00, 0x02, // 2 tracks (1 tempo track format implicitly, or 1 multi-channel)
      0x00, ppq >> 8, ppq & 0xFF
    ]);

    const tempo = Math.floor(60000000 / bpm);
    // Tempo meta-event
    trackData.push(0x00, 0xFF, 0x51, 0x03, (tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF);
    // Time Signature: 4/4
    trackData.push(0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

    for (const section of tab.sections) {
      const barsInSection = section.end - section.start + 1;
      const startBar = section.start - 1;
      const energyKey = `${section.id}-${stem.name === "MELODY" ? "Melody" : stem.name === "BASS" ? "Bass" : "Drums"}`;
      let energy = tab.energyLevels[energyKey] || 3;
      energy = Math.min(5, Math.max(1, energy));

      const density = energy / 5;
      const chord = progression[startBar % progression.length] || [60, 64, 67];

      for (let bar = 0; bar < barsInSection; bar++) {
        const absoluteBar = startBar + bar;
        const barStartTick = absoluteBar * ticksPerBar;

        for (let step = 0; step < 16; step++) {
          const stepTick = barStartTick + (step * ppq / 4);
          const shouldPlay = Math.random() < density * 0.8;

          if (!shouldPlay && energy < 3) continue;
          if (!shouldPlay && step % 4 !== 0 && energy < 4) continue;

          let note = 60;
          let velocity = 60 + (energy * 8);

          if (stem.name === "MELODY") {
            const chordNote = chord[Math.floor(Math.random() * chord.length)];
            const octaveOffset = energy >= 4 ? 12 : 0;
            note = chordNote + octaveOffset;
            velocity = 50 + (energy * 10);
            if (section.label === "Intro") velocity -= 20;
            if (section.label === "Verse") velocity -= 10;
            if (section.label === "Hook") velocity += 10;
          }

          if (stem.name === "BASS") {
            note = chord[0] - 24;
            if (energy >= 4 && Math.random() < 0.3) note += 12;
            velocity = 70 + (energy * 6);
          }

          if (stem.name === "DRUMS") {
            const kickSteps = [0, 8];
            const snareSteps = [4, 12];
            const hatSteps = [2, 6, 10, 14];

            if (kickSteps.includes(step)) note = 36; // Kick Drum Midi Key
            else if (snareSteps.includes(step) && energy >= 2) note = 38; // Acoustic Snare Midi Key
            else if (hatSteps.includes(step) && energy >= 3) note = 42; // Closed Hat Midi Key
            else if (Math.random() < 0.1 && energy >= 4) note = 46; // Open Hat
            else continue;

            velocity = 80 + (energy * 4);
          }

          const delta = stepTick - currentTick;
          if (delta < 0) continue;

          const deltaBytes = encodeVarInt(delta);
          trackData.push(...deltaBytes);
          // Note On Event
          trackData.push(0x90 + stem.channel, note, Math.min(127, velocity));

          let duration = ppq / 4;
          if (stem.name === "MELODY" && energy >= 4) duration = ppq / 2;
          if (stem.name === "BASS" && energy >= 4) duration = ppq;
          if (stem.name === "DRUMS") duration = ppq / 8;

          const offDeltaBytes = encodeVarInt(duration);
          trackData.push(...offDeltaBytes);
          // Note Off Event
          trackData.push(0x80 + stem.channel, note, 0);

          currentTick = stepTick + duration;
        }
      }
    }

    // End of Track event
    const finalDelta = encodeVarInt(ticksPerBar * 4 - currentTick > 0 ? ticksPerBar * 4 - currentTick : 0);
    trackData.push(...finalDelta, 0xFF, 0x2F, 0x00);

    const trackChunkHeader = new Uint8Array([0x4D, 0x54, 0x72, 0x6B]);
    const trackLength = trackData.length;
    const trackLengthBytes = [
      (trackLength >> 24) & 0xFF,
      (trackLength >> 16) & 0xFF,
      (trackLength >> 8) & 0xFF,
      trackLength & 0xFF
    ];

    const fullData = new Uint8Array(
      headerChunk.length + trackChunkHeader.length + trackLengthBytes.length + trackData.length
    );

    let offset = 0;
    fullData.set(headerChunk, offset);
    offset += headerChunk.length;
    fullData.set(trackChunkHeader, offset);
    offset += trackChunkHeader.length;
    fullData.set(new Uint8Array(trackLengthBytes), offset);
    offset += trackLengthBytes.length;
    fullData.set(new Uint8Array(trackData), offset);

    result[stem.name] = new Blob([fullData], { type: "audio/midi" });
  }

  return result;
}
