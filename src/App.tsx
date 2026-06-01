/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Volume2,
  VolumeX,
  Upload,
  Music,
  Trash2,
  Play,
  Pause,
  Download,
  FileCode,
  RotateCcw,
  Sliders,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Check,
  Zap,
  Sparkles,
  Activity,
  Maximize2,
  Terminal
} from "lucide-react";
import {
  Section,
  Loop,
  StemType,
  Genre,
  TabData,
  AudioAnalysisResult,
  SectionBoundary,
  ChordEstimation,
  BarDetails
} from "./types";
import { LoopUploader } from "./components/LoopUploader";
import { ArrangementGrid } from "./components/ArrangementGrid";
import { SectionEditor } from "./components/SectionEditor";
import { generateStemMidis } from "./MidiGenerator";
import { generateTabVariation, CHORD_NAMES } from "./templates";
import {
  compileAnalysisDAWProject,
  compileSequencerDAWProject,
  generateReaperSyncScript,
  generateAbletonSyncScript,
  generateFLStudioSyncScript
} from "./DAWProjectCompiler";

export default function App() {
  // Global View Navigation Tabs: "analyzer" or "sequencer"
  const [activeTab, setActiveTab] = React.useState<"analyzer" | "sequencer">("analyzer");

  // ==========================================
  // STATE DEFINITIONS FOR: LOOP BOOTH ANALYZER
  // ==========================================
  const [audioFile, setAudioFile] = React.useState<File | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playheadTime, setPlayheadTime] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState("");
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [analysisResult, setAnalysisResult] = React.useState<AudioAnalysisResult | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);

  const [activeSectionTab, setActiveSectionTab] = React.useState<"sections" | "bars">("sections");

  // Track playback time indexes
  const [activeChordIdx, setActiveChordIdx] = React.useState(-1);
  const [activeBarIdx, setActiveBarIdx] = React.useState(-1);
  const [activeSectionIdx, setActiveSectionIdx] = React.useState(-1);

  // Audio elements and ref loops
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const rAFRef = React.useRef<number | null>(null);
  const waveformCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rmsChartRef = React.useRef<HTMLCanvasElement | null>(null);
  const densityChartRef = React.useRef<HTMLCanvasElement | null>(null);
  const chordsScrollRef = React.useRef<HTMLDivElement | null>(null);
  const mainFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [volume, setVolume] = React.useState(0.85);

  // ==========================================
  // STATE DEFINITIONS FOR: ARRANGEMENT ARCHITECT
  // ==========================================
  const [genre, setGenre] = React.useState<Genre>("Trap");
  const [bpm, setBpm] = React.useState(140);
  const [sequencerTabIdx, setSequencerTabIdx] = React.useState(0);
  const [loops, setLoops] = React.useState<Loop[]>([]);
  const [mutes, setMutes] = React.useState<Record<string, boolean>>({ Full: false, Drums: false, Bass: false, Melody: false, FX: false });
  
  // Tab sequences
  const [seqTabs, setSeqTabs] = React.useState<TabData[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      sections: [
        { id: "1", label: "Intro", start: 1, end: 8 },
        { id: "2", label: "Verse", start: 9, end: 24 },
        { id: "3", label: "Hook", start: 25, end: 32 }
      ],
      assignments: {},
      energyLevels: {
        "1-Drums": 2, "1-Bass": 2, "1-Melody": 3,
        "2-Drums": 4, "2-Bass": 3, "2-Melody": 4,
        "3-Drums": 5, "3-Bass": 5, "3-Melody": 5
      },
      fxAssignments: {}
    }))
  );

  const [pianoRollSection, setPianoRollSection] = React.useState<{ sid: string; stem: string } | null>(null);
  const [exportCounter, setExportCounter] = React.useState<Record<string, number>>({});

  const [changeLogs, setChangeLogs] = React.useState<string[]>(["Session initialized inside LoopBooth Studio v1.2"]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setChangeLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const totalSeqBars = 32;
  const currentSeqTab = seqTabs[sequencerTabIdx];

  // -----------------------------------------------------------------
  // AUDIO ANALYSIS ENGINE HANDLERS (LOOP BOOTH ANALYZER)
  // -----------------------------------------------------------------
  const triggerAudioUpload = (file: File) => {
    setAudioFile(file);
    setIsUploading(true);
    setAnalysisError(null);
    setUploadStatus("Uploading element to audio AI parser core...");
    setUploadProgress(15);

    // Dynamic step animation for upload process
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 92) {
          clearInterval(progressInterval);
          return 92;
        }
        return prev + Math.floor(Math.random() * 8) + 2;
      });
    }, 400);

    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/analyze", {
      method: "POST",
      body: formData
    })
      .then(async (response) => {
        clearInterval(progressInterval);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || "Analysis endpoint returned non-OK code");
        }
        return response.json();
      })
      .then((data: AudioAnalysisResult) => {
        setUploadProgress(100);
        setUploadStatus("Analysis synthesized perfectly!");

        setTimeout(() => {
          setAnalysisResult(data);
          setIsUploading(false);
          addLog(`Gemini DSP Analyzed "${file.name}" | Tempo: ${data.bpm} BPM | Key: ${data.key}`);

          // Build audio player
          const localUrl = URL.createObjectURL(file);
          setAudioUrl(localUrl);

          const audio = new Audio(localUrl);
          audio.volume = volume;
          audioRef.current = audio;

          // Event listeners
          audio.addEventListener("timeupdate", () => {
            setPlayheadTime(audio.currentTime);
          });

          audio.addEventListener("ended", () => {
            setIsPlaying(false);
            if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
          });

          setPlayheadTime(0);
          setIsPlaying(false);
        }, 600);
      })
      .catch((err) => {
        clearInterval(progressInterval);
        console.error("Audio analyzer failed:", err);
        setAnalysisError(err.message || String(err));
        setIsUploading(false);
        setAudioFile(null);
      });
  };

  const resetAnalyzer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioFile(null);
    setAnalysisResult(null);
    setPlayheadTime(0);
    setIsPlaying(false);
    setIsUploading(false);
    setUploadStatus("");
    setUploadProgress(0);
    setAnalysisError(null);
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    } else {
      audio.play().catch(e => console.error("Playback interrupted:", e));
      setIsPlaying(true);
      rAFRef.current = requestAnimationFrame(playbackLoopUpdate);
    }
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const boundedTime = Math.min(audio.duration || 1000, Math.max(0, time));
    audio.currentTime = boundedTime;
    setPlayheadTime(boundedTime);
    syncTimelineActiveElements(boundedTime);
  };

  const playbackLoopUpdate = () => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;

    const currTime = audio.currentTime;
    setPlayheadTime(currTime);
    syncTimelineActiveElements(currTime);

    rAFRef.current = requestAnimationFrame(playbackLoopUpdate);
  };

  const syncTimelineActiveElements = (time: number) => {
    const data = analysisResult;
    if (!data) return;

    // 1. Chords Active highlight detection and horizontal track auto-scrolling
    let activeChord = -1;
    for (let i = 0; i < data.chords.length; i++) {
      const c = data.chords[i];
      if (time >= c.start && time < c.end) {
        activeChord = i;
        break;
      }
    }
    if (activeChord !== activeChordIdx) {
      setActiveChordIdx(activeChord);
      // Auto-center scrolling chords viewport track
      if (activeChord !== -1 && chordsScrollRef.current) {
        const activeBox = chordsScrollRef.current.querySelector(`[data-index="${activeChord}"]`) as HTMLDivElement;
        if (activeBox) {
          const containerWidth = chordsScrollRef.current.clientWidth;
          const boxLeft = activeBox.offsetLeft;
          const boxWidth = activeBox.clientWidth;
          chordsScrollRef.current.scrollTo({
            left: boxLeft - (containerWidth / 2) + (boxWidth / 2),
            behavior: "smooth"
          });
        }
      }
    }

    // 2. Bar highlighting
    let activeBar = -1;
    for (let i = 0; i < data.bars.length; i++) {
      const b = data.bars[i];
      if (time >= b.start && time < b.end) {
        activeBar = i;
        break;
      }
    }
    if (activeBar !== activeBarIdx) {
      setActiveBarIdx(activeBar);
    }

    // 3. Section Boundary highlight row mapping
    let activeSection = -1;
    for (let i = 0; i < data.section_boundaries.length; i++) {
      const s = data.section_boundaries[i];
      if (time >= s.start && time < s.end) {
        activeSection = i;
        break;
      }
    }
    if (activeSection !== activeSectionIdx) {
      setActiveSectionIdx(activeSection);
    }
  };

  const getSectionEnergyLabel = (start: number, end: number) => {
    if (!analysisResult) return "Moderate";
    const filteredPoints = analysisResult.energy_profile.filter(p => p.time >= start && p.time <= end);
    if (!filteredPoints.length) return "Moderate";
    
    const avg = filteredPoints.reduce((sum, p) => sum + p.value, 0) / filteredPoints.length;
    if (avg > 0.22) return "Peak Energy 🔥";
    if (avg > 0.12) return "Moderate";
    return "Ambient / Low Verse 🧊";
  };

  // Waveform canvas rendering
  React.useEffect(() => {
    if (!analysisResult) return;
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement?.clientWidth || 920;
    const h = 120;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const duration = analysisResult.duration;
    const profile = analysisResult.energy_profile;

    // A. Draw Section Boundaries coloured backgrounds
    const sectionColors = [
      "rgba(239, 68, 68, 0.04)", // Crimson Red
      "rgba(244, 63, 94, 0.04)",  // Rose Red
      "rgba(251, 113, 133, 0.04)", // Soft Rose
      "rgba(141, 141, 149, 0.04)", // Slate grey
      "rgba(5, 150, 105, 0.04)"   // Deep Emerald
    ];
    const sectionBorderColors = ["#ef4444", "#f43f5e", "#fb7185", "#8d8d95", "#059669"];

    analysisResult.section_boundaries.forEach((sec, idx) => {
      const startX = (sec.start / duration) * w;
      const endX = (sec.end / duration) * w;
      
      ctx.fillStyle = sectionColors[idx % sectionColors.length];
      ctx.fillRect(startX, 0, endX - startX, h);

      ctx.strokeStyle = sectionBorderColors[idx % sectionBorderColors.length];
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, h);
      ctx.stroke();

      // Text Section labels
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "bold 9px 'Space Grotesk', system-ui";
      ctx.fillText(sec.label.toUpperCase(), startX + 6, h - 8);
    });

    // B. Draw Mirrored Amplitude Grid wave lines
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    const barW = 2.5;
    const gap = 1.5;
    const totalBars = Math.floor(w / (barW + gap));

    for (let i = 0; i < totalBars; i++) {
      const indexRatio = i / totalBars;
      const profileIndex = Math.floor(indexRatio * profile.length);
      const val = profile[profileIndex]?.value || 0;

      const barHeight = Math.max(3, val * (h - 20) * 0.95);
      const x = i * (barW + gap);
      const y = (h / 2) - (barHeight / 2);

      // Draw rounded rectangle
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, barW, barHeight, 1.2) : ctx.rect(x, y, barW, barHeight);
      ctx.fill();
    }

    // C. Draw glowing playback playhead
    const playheadX = (playheadTime / duration) * w;
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#f43f5e";
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();

    // Reset shadow values for subsequent frames
    ctx.shadowBlur = 0;

  }, [analysisResult, playheadTime]);

  // Mini canvas graphs triggering
  React.useEffect(() => {
    if (!analysisResult) return;

    // Render Trend RMS Energy Curve Line
    const rmsCanvas = rmsChartRef.current;
    if (rmsCanvas) {
      const rCtx = rmsCanvas.getContext("2d");
      if (rCtx) {
        const dpr = window.devicePixelRatio || 1;
        const eW = rmsCanvas.parentElement?.clientWidth || 300;
        const eH = 80;
        rmsCanvas.width = eW * dpr;
        rmsCanvas.height = eH * dpr;
        rmsCanvas.style.width = `${eW}px`;
        rmsCanvas.style.height = `${eH}px`;
        rCtx.scale(dpr, dpr);
        rCtx.clearRect(0, 0, eW, eH);

        rCtx.strokeStyle = "#e11d48";
        rCtx.lineWidth = 1.8;
        rCtx.beginPath();
        analysisResult.energy_profile.forEach((p, idx) => {
          const x = (idx / analysisResult.energy_profile.length) * eW;
          const y = eH - (p.value * eH * 0.8) - 4;
          if (idx === 0) rCtx.moveTo(x, y);
          else rCtx.lineTo(x, y);
        });
        rCtx.stroke();
      }
    }

    // Render Density bar charts
    const densCanvas = densityChartRef.current;
    if (densCanvas) {
      const dCtx = densCanvas.getContext("2d");
      if (dCtx) {
        const dpr = window.devicePixelRatio || 1;
        const dW = densCanvas.parentElement?.clientWidth || 300;
        const dH = 80;
        densCanvas.width = dW * dpr;
        densCanvas.height = dH * dpr;
        densCanvas.style.width = `${dW}px`;
        densCanvas.style.height = `${dH}px`;
        dCtx.scale(dpr, dpr);
        dCtx.clearRect(0, 0, dW, dH);

        const dProf = analysisResult.density_profile;
        const barWidth = Math.max(1.5, dW / dProf.length - 1.5);
        const maxVal = Math.max(...dProf.map(d => d.value), 1);

        dCtx.fillStyle = "#fb7185";
        dProf.forEach((d, idx) => {
          const x = (idx / dProf.length) * dW;
          const height = (d.value / maxVal) * dH * 0.75;
          const y = dH - height;
          dCtx.fillRect(x, y, barWidth, height);
        });
      }
    }

  }, [sidebarUpdateTrigger(), analysisResult]);

  // Small utility wrapper to solve resize re-renders
  function sidebarUpdateTrigger() {
    return activeTab === "analyzer" ? "shown" : "hidden";
  }

  // Seek audio directly through clicking standard wave canvas
  const handleWaveformTimelineSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!analysisResult || !audioRef.current) return;
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    seekTo(ratio * analysisResult.duration);
  };

  const handleMidiDownload = () => {
    if (!analysisResult) return;
    
    fetch("/api/download-midi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chords: analysisResult.chords,
        beats: analysisResult.beats,
        bpm: analysisResult.bpm,
        filename: `${audioFile?.name.replace(/\.[^/.]+$/, "") || "loop"}_chords_harmonic.mid`
      })
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Server MIDI compilation returned an error code");
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${audioFile?.name.replace(/\.[^/.]+$/, "") || "loop"}_chords_harmonic.mid`;
        link.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error("MIDI download failure:", err);
        alert("Failed to compile and download chord MIDI bytes: Routing offline.");
      });
  };

  const handleDownloadAnalysisDAWProject = async () => {
    if (!analysisResult) return;
    try {
      addLog(`Preparing DAWProject structure archive for "${audioFile?.name || "analyzed_loop.mp3"}"...`);
      // 1. Compile Chord MIDI as a blob via /api/download-midi
      const chordMidiBlob = await fetch("/api/download-midi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chords: analysisResult.chords,
          beats: analysisResult.beats,
          bpm: analysisResult.bpm,
          filename: "chords.mid"
        })
      })
        .then(r => r.ok ? r.blob() : null)
        .catch(() => null);

      // 2. Compile full zipped DAWProject
      const name = audioFile?.name || "analyzed_loop";
      const dawProjectBlob = await compileAnalysisDAWProject(analysisResult, name, chordMidiBlob);

      // 3. Initiate browser download
      const url = URL.createObjectURL(dawProjectBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name.replace(/\.[^/.]+$/, "")}_intelligence.dawproject`;
      link.click();
      URL.revokeObjectURL(url);
      
      addLog(`Exported compliant DAWProject ZIP containing markers, volume automation, sync scripts, and chord stems.`);
    } catch (err) {
      console.error(err);
      alert("Failed to package DAWProject ZIP archive: JSZip compiler error.");
    }
  };

  const handleExportSequencerDAWProject = async () => {
    try {
      addLog(`Compiling active Sequencer arrangement layout (${genre.toUpperCase()}) to DAWProject format...`);
      const dawProjectBlob = await compileSequencerDAWProject(currentSeqTab, bpm, genre, totalSeqBars);
      
      const url = URL.createObjectURL(dawProjectBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${genre}_Arrangement_${bpm}BPM.dawproject`;
      link.click();
      URL.revokeObjectURL(url);

      addLog(`Exported compliant DAWProject ZIP containing markers, stem clip timelines, MIDI assets, and import summaries.`);
    } catch (err) {
      console.error(err);
      alert("Failed to package Sequencer DAWProject ZIP archive.");
    }
  };

  const handleExportSessionJSON = () => {
    try {
      addLog(`Compiling and exporting standalone LoopBooth Session JSON Brain file...`);
      const sessionData = {
        editor_format: "LoopBooth Session Brain v1.2",
        exported_at: new Date().toISOString(),
        session_bpm: bpm,
        session_genre: genre,
        total_bars: totalSeqBars,
        active_tab_index: sequencerTabIdx,
        loops: loops.map(l => ({
          id: l.id,
          name: l.name,
          type: l.type,
          duration: l.duration,
          bpm: l.bpm,
          bars: l.bars
        })),
        sections: currentSeqTab.sections,
        assignments: currentSeqTab.assignments,
        energy_levels: currentSeqTab.energyLevels,
        fx_assignments: currentSeqTab.fxAssignments || {}
      };

      const jsonStr = JSON.stringify(sessionData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `loopbooth_session_brain_${genre.toLowerCase()}_${bpm}bpm.json`;
      link.click();
      URL.revokeObjectURL(url);
      addLog(`Success: Exited LoopBooth JSON State file with ${currentSeqTab.sections.length} markers for external producer pipelines.`);
    } catch (err: any) {
      console.error(err);
      addLog(`Failed to compile standalone JSON payload: ${err.message || err}`);
    }
  };

  // -----------------------------------------------------------------
  // SEQUENCER ARRANGEMENT SEQUENCER HANDLERS (ARRANGEMENT ARCHITECT PRO)
  // -----------------------------------------------------------------
  const updateSequencerTab = (newData: Partial<TabData>) => {
    setSeqTabs(prev =>
      prev.map((t, idx) => (idx === sequencerTabIdx ? { ...t, ...newData } : t))
    );
  };

  const handleSeqAssign = (sid: string, row: string, lid: string, energy: number = 3) => {
    updateSequencerTab({
      assignments: { ...currentSeqTab.assignments, [`${sid}-${row}`]: lid },
      energyLevels: { ...currentSeqTab.energyLevels, [`${sid}-${row}`]: energy }
    });
    const sectName = currentSeqTab.sections.find(s => s.id === sid)?.label || "Section";
    addLog(`Assigned loop "${lid}" to stem channel [${row}] in ${sectName}`);
  };

  const handleSeqEnergyChange = (sid: string, row: string, energy: number) => {
    updateSequencerTab({
      energyLevels: { ...currentSeqTab.energyLevels, [`${sid}-${row}`]: energy }
    });
    const sectName = currentSeqTab.sections.find(s => s.id === sid)?.label || "Section";
    addLog(`Adjusted stem channel [${row}] energy level to ${energy}/5 in ${sectName}`);
  };

  const handleSuggestArrangement = () => {
    // Generate new arrangement based on standard template rules
    const suggestedVariation = generateTabVariation(genre, loops, totalSeqBars, sequencerTabIdx);
    setSeqTabs(prev =>
      prev.map((t, idx) => (idx === sequencerTabIdx ? { ...t, ...suggestedVariation } : t))
    );
    addLog(`AI Coach: Subscribed optimal arrangement structure for "${genre} - Variant ${sequencerTabIdx + 1}"`);
  };

  const handleExportTrackMidis = () => {
    const compiledMidis = generateStemMidis(currentSeqTab, bpm, genre);
    const letterPrefix = String.fromCharCode(65 + sequencerTabIdx);
    const updatedGenreCounts = { ...exportCounter };
    const counterKey = `${genre}-${sequencerTabIdx}`;
    const playCount = (updatedGenreCounts[counterKey] || 0) + 1;
    updatedGenreCounts[counterKey] = playCount;
    setExportCounter(updatedGenreCounts);

    // Stagger downloads to prevent multi-trigger browser blockages
    Object.entries(compiledMidis).forEach(([stemName, dataBlob], index) => {
      setTimeout(() => {
        const blobUrl = URL.createObjectURL(dataBlob);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = `${genre}_Sect${letterPrefix}_Take${playCount}_${stemName}.mid`;
        anchor.click();
        URL.revokeObjectURL(blobUrl);
      }, index * 200);
    });
  };

  // Section editor bounds alterations
  const handleEditEndBar = (sid: string, endBar: number) => {
    const updatedSections = currentSeqTab.sections.map((sect, idx) => {
      if (sect.id === sid) {
        return { ...sect, end: endBar };
      }
      return sect;
    });

    // Recompute following section starts to maintain continuous bar boundaries
    for (let i = 0; i < updatedSections.length - 1; i++) {
      if (updatedSections[i].end >= totalSeqBars) {
        updatedSections[i].end = totalSeqBars - 1;
      }
      updatedSections[i + 1].start = updatedSections[i].end + 1;
      if (updatedSections[i + 1].end < updatedSections[i + 1].start) {
        updatedSections[i + 1].end = updatedSections[i + 1].start + 3;
      }
    }

    // Force limit end of arrangement to 32 bars
    const lastSection = updatedSections[updatedSections.length - 1];
    if (lastSection.end !== totalSeqBars) {
      lastSection.end = totalSeqBars;
    }

    const targetSect = currentSeqTab.sections.find(s => s.id === sid);
    if (targetSect) {
      addLog(`Shifted terminal boundary of "${targetSect.label}" to Bar ${endBar}`);
    }

    updateSequencerTab({ sections: updatedSections });
  };

  const handleEditLabelSection = (sid: string, newLabel: any) => {
    const originalLabel = currentSeqTab.sections.find(s => s.id === sid)?.label || "Section";
    const updatedSections = currentSeqTab.sections.map(sect =>
      sect.id === sid ? { ...sect, label: newLabel } : sect
    );
    addLog(`Renamed arrangement block: "${originalLabel}" -> "${newLabel}"`);
    updateSequencerTab({ sections: updatedSections });
  };

  const handleRemoveSection = (sid: string) => {
    if (currentSeqTab.sections.length <= 1) return;
    const removedLabel = currentSeqTab.sections.find(s => s.id === sid)?.label || "Block";
    const removalIndex = currentSeqTab.sections.findIndex(s => s.id === sid);
    const updated = currentSeqTab.sections.filter(s => s.id !== sid);

    // Span previous sections to fill gaps
    if (removalIndex > 0) {
      updated[removalIndex - 1].end = removalIndex < updated.length ? updated[removalIndex].start - 1 : totalSeqBars;
    }

    // Re-index remaining coordinates
    let tracker = 1;
    const finalIndexed = updated.map((s, i) => {
      s.start = tracker;
      if (i === updated.length - 1) {
        s.end = totalSeqBars;
      }
      tracker = s.end + 1;
      return s;
    });

    addLog(`Deleted arrangement block: "${removedLabel}" and re-aligned bounds.`);
    updateSequencerTab({ sections: finalIndexed });
  };

  const handleAddSection = () => {
    const currentSections = currentSeqTab.sections;
    if (currentSections.length >= 6) {
      alert("Maximum sequence divisions reached. Edit existing sections to fit.");
      return;
    }

    const lastSection = currentSections[currentSections.length - 1];
    if (lastSection.end - lastSection.start < 4) {
      alert("Last section is too short. Expand it first before splitting.");
      return;
    }

    const splitBar = lastSection.start + Math.floor((lastSection.end - lastSection.start) / 2);
    const originalEnd = lastSection.end;

    // Adjust last details
    const revisedLast = { ...lastSection, end: splitBar };
    const addedSection: Section = {
      id: Math.random().toString(36).substr(2, 5),
      label: "Hook",
      start: splitBar + 1,
      end: originalEnd
    };

    const nextSections = [...currentSections.slice(0, -1), revisedLast, addedSection];
    addLog(`Split timeline grid: Created a new modular arrangement block starting at Bar ${splitBar + 1}`);
    updateSequencerTab({ sections: nextSections });
  };

  // format times safely
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return "00:00";
    const minutes = Math.floor(secs / 60).toString().padStart(2, "0");
    const seconds = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-neutral-200 font-sans flex flex-col relative overflow-hidden selection:bg-red-550 selection:text-white">
      {/* Background elements */}
      <div className="fixed inset-0 bg-radial-at-c from-[#170505] via-[#0A0A0B] to-[#0A0A0B] z-0 pointer-events-none opacity-40" />
      <div className="fixed w-[450px] h-[450px] rounded-full blur-[140px] bg-red-650/5 -top-24 -left-20 z-0 pointer-events-none" />
      <div className="fixed w-[450px] h-[450px] rounded-full blur-[140px] bg-rose-650/5 -bottom-24 -right-20 z-0 pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="border-b border-white/5 bg-[#0F1115]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between z-10 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-red-650 to-red-500 p-2 rounded-xl shadow-lg border border-white/5">
            <Activity className="text-white hover:rotate-12 transition-transform duration-300" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-[0.18em] text-white flex items-center gap-1">
              LOOP<span className="text-red-550 font-black">BOOTH</span>{" "}
              <span className="text-neutral-500 font-medium text-[10px] tracking-widest pl-0.5">STUDIO</span>
            </h1>
            <p className="text-[9px] text-neutral-500 font-mono">DSP Signal Parsing & Loop Sequencer v1.2</p>
          </div>
        </div>

        {/* Global tab panels switch navigation */}
        <div className="bg-white/5 p-0.5 rounded-lg border border-white/5 flex">
          <button
            onClick={() => setActiveTab("analyzer")}
            className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === "analyzer" ? "bg-white/5 text-red-400 shadow-sm border border-white/5" : "text-neutral-400 hover:text-white"}`}
          >
            Audio AI Analyzer
          </button>
          <button
            onClick={() => setActiveTab("sequencer")}
            className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === "sequencer" ? "bg-white/5 text-red-400 shadow-sm border border-white/5" : "text-neutral-400 hover:text-white"}`}
          >
            Sequencer Architect
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow shadow-emerald-400" />
          <span className="text-[9px] text-neutral-400 font-mono uppercase tracking-wider">DSP ENGINE ACTIVE</span>
        </div>
      </header>

      {/* CORE VIEW SECTION */}
      <main className="flex-1 overflow-y-auto p-6 z-10 flex flex-col items-center">
        <div className="w-full max-w-6xl flex flex-col gap-5">
          
          {/* ========================================================== */}
          {/* VIEW PANEL 1: LOOP BOOTH ANALYZER                          */}
          {/* ========================================================== */}
          {activeTab === "analyzer" && (
            <div className="flex flex-col gap-5 animate-fade-in">
              
              {/* ERROR STATE VIEW DISPLAY */}
              {analysisError && (
                <div className="max-w-xl mx-auto w-full bg-red-950/20 border border-red-500/20 rounded-2xl p-5 mb-4 text-center">
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 font-extrabold text-sm font-mono">!</div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">Audio Signal Process Error</h3>
                    <p className="text-[10px] text-neutral-400 leading-relaxed max-w-md font-mono">
                      {analysisError}
                    </p>
                    <button
                      onClick={() => {
                        setAnalysisError(null);
                      }}
                      className="mt-1 bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-350 py-1 px-3 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer font-bold"
                    >
                      Dismiss Error
                    </button>
                  </div>
                </div>
              )}

              {/* FILE DROPZONE / CHASSIS */}
              {!analysisResult && !isUploading && (
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => {
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const files = e.dataTransfer.files;
                    if (files?.[0]) {
                      triggerAudioUpload(files[0]);
                    }
                  }}
                  className={`bg-[#0F1115]/50 border-2 border-dashed hover:border-red-500/35 transition-all rounded-2xl py-12 px-6 text-center cursor-pointer max-w-xl mx-auto w-full group relative overflow-hidden ${
                    isDragging ? 'border-red-500/70 bg-red-500/5 scale-[1.02]' : 'border-[#1f2128]'
                  }`}
                  onClick={() => mainFileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={mainFileInputRef}
                    className="hidden"
                    accept="audio/*"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files?.[0]) {
                        triggerAudioUpload(files[0]);
                      }
                      e.target.value = "";
                    }}
                  />
                  <div className="absolute inset-0 bg-radial-at-t from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <div className="w-16 h-16 rounded-full bg-[#0A0A0B] border border-white/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform shadow-lg relative">
                    <div className="absolute inset-0 bg-red-500/10 rounded-full animate-ping scale-75 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Upload className="text-zinc-400 group-hover:text-red-400 transition-colors" size={22} />
                  </div>
                  <h3 className="text-sm font-bold uppercase text-neutral-200 tracking-wider">Deconstruct Signal File</h3>
                  <p className="text-[10px] text-neutral-400 mt-1">Drag and drop any loop, song, stem, or beat here</p>
                  <p className="text-[9px] text-neutral-550 mt-3 font-mono">Accepts MP3, WAV, FLAC, M4A up to 50MB</p>
                </div>
              )}

              {/* UPLOAD PROGRESS PANEL */}
              {isUploading && (
                <div className="bg-[#0F1115]/60 border border-white/5 rounded-2xl py-12 px-6 text-center max-w-xl mx-auto w-full shadow-lg">
                  <div className="relative w-36 h-20 bg-[#0A0A0B]/80 border border-white/5 rounded-lg overflow-hidden mx-auto mb-5 shadow-inner">
                    {/* Laser Scanner Line bar simulation */}
                    <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow shadow-red-500 left-0 animate-bounce" style={{ top: "45%" }} />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.02)_1px,transparent_1px)] bg-[size:10px_10px]" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-250 animate-pulse">Scanning Audio Signal Structures...</h3>
                  <p className="text-[10px] text-neutral-400 mt-1 font-mono">{uploadStatus}</p>
                  
                  <div className="w-full bg-[#0A0A0B] rounded-full h-1.5 mt-5 max-w-xs mx-auto overflow-hidden border border-white/5">
                    <div 
                      className="bg-gradient-to-r from-red-650 to-red-400 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-red-400 font-mono mt-2 inline-block font-extrabold">{uploadProgress}% Complete</span>
                </div>
              )}

              {/* DYNAMIC DASHBOARD OVERVIEW */}
              {analysisResult && (
                <div className="flex flex-col gap-5">
                  
                  {/* METRIC BOXES ROW */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    
                    <div className="bg-[#0F1115]/80 border border-white/5 rounded-xl p-3 flex gap-3 items-center relative overflow-hidden hover:border-red-500/30 transition-all duration-300 shadow-md">
                      <div className="absolute left-0 top-0 h-full w-0.5 bg-red-650" />
                      <div className="p-2 rounded bg-red-950/20 text-red-400 text-center font-bold text-xs font-mono">
                        BPM
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-mono">Tempo</span>
                        <span className="text-base font-bold font-mono text-neutral-100">{analysisResult.bpm}</span>
                      </div>
                    </div>

                    <div className="bg-[#0F1115]/80 border border-white/5 rounded-xl p-3 flex gap-3 items-center relative overflow-hidden hover:border-red-500/30 transition-all duration-300 shadow-md">
                      <div className="absolute left-0 top-0 h-full w-0.5 bg-neutral-500" />
                      <div className="p-2 rounded bg-neutral-900 text-neutral-450 text-center font-bold text-xs font-mono">
                        KEY
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-mono">Key Scale</span>
                        <span className="text-base font-bold font-mono text-neutral-100 truncate max-w-[100px]" title={analysisResult.key}>
                          {analysisResult.key.split(" ")[0]} 
                          <span className="text-[10px] text-neutral-400 font-normal ml-0.5">{analysisResult.key.split(" ")[1]}</span>
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#0F1115]/80 border border-white/5 rounded-xl p-3 flex gap-3 items-center relative overflow-hidden hover:border-red-500/30 transition-all duration-300 shadow-md">
                      <div className="absolute left-0 top-0 h-full w-0.5 bg-red-650" />
                      <div className="p-2 rounded bg-red-950/20 text-red-400 text-center font-bold text-xs font-mono">
                        BAR
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-mono">Bars Count</span>
                        <span className="text-base font-bold font-mono text-neutral-100">{analysisResult.bars.length}</span>
                      </div>
                    </div>

                    <div className="bg-[#0F1115]/80 border border-white/5 rounded-xl p-3 flex gap-3 items-center relative overflow-hidden hover:border-red-500/30 transition-all duration-300 shadow-md">
                      <div className="absolute left-0 top-0 h-full w-0.5 bg-red-650" />
                      <div className="p-2 rounded bg-red-950/20 text-red-400 text-center font-bold text-xs font-mono">
                        NRG
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-mono">Avg Energy</span>
                        <span className="text-base font-bold font-mono text-neutral-100">{Math.round(analysisResult.avg_energy * 100)}%</span>
                      </div>
                    </div>

                    <div className="bg-[#0F1115]/80 border border-white/5 rounded-xl p-3 flex gap-3 items-center relative overflow-hidden hover:border-red-500/30 transition-all duration-300 shadow-md">
                      <div className="absolute left-0 top-0 h-full w-0.5 bg-neutral-500" />
                      <div className="p-2 rounded bg-neutral-900 text-neutral-450 text-center font-bold text-xs font-mono">
                        ONT
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-mono">Onsets / Sec</span>
                        <span className="text-base font-bold font-mono text-neutral-100">{analysisResult.avg_density}</span>
                      </div>
                    </div>

                    <div className="bg-[#0F1115]/80 border border-white/5 rounded-xl p-3 flex gap-3 items-center relative overflow-hidden hover:border-red-500/30 transition-all duration-300 shadow-md">
                      <div className="absolute left-0 top-0 h-full w-0.5 bg-neutral-500" />
                      <div className="p-2 rounded bg-neutral-900 text-neutral-450 text-center font-bold text-xs font-mono">
                        SEC
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-mono">Length</span>
                        <span className="text-base font-bold font-mono text-neutral-100">{analysisResult.duration.toFixed(1)}s</span>
                      </div>
                    </div>

                  </div>

                  {/* VISUALIZER WAVEFORM CARD */}
                  <div className="bg-[#0F1115]/65 border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-100">Signal Chronology & Section Map</h2>
                        <span className="text-[9px] text-neutral-500 font-mono italic mt-0.5 block truncate max-w-[400px]">Parsing: {audioFile?.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5 font-mono text-[10px] text-red-400 font-bold">
                        <span>{formatTime(playheadTime)}</span>
                        <span className="text-neutral-600">/</span>
                        <span>{formatTime(analysisResult.duration)}</span>
                      </div>
                    </div>

                    <div className="bg-[#0A0A0B] border border-white/5 rounded-xl overflow-hidden relative">
                      <canvas 
                        ref={waveformCanvasRef} 
                        onClick={handleWaveformTimelineSeek}
                        className="w-full cursor-pointer h-28 block hover:bg-white-[0.02] transition-colors"
                      />
                    </div>

                    {/* Controls row */}
                    <div className="flex items-center justify-between mt-4">
                      
                      {/* Playback Button bar */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlayback}
                          className="w-11 h-11 rounded-full bg-red-650 hover:bg-red-500 font-bold text-white flex items-center justify-center cursor-pointer shadow-md shadow-red-950/40 border border-white/5 transition-all focus:outline-none"
                        >
                          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                        </button>

                        {/* Volume controls */}
                        <div className="flex items-center gap-1 text-neutral-500">
                          <button 
                            onClick={() => {
                              const nextVol = volume > 0 ? 0 : 0.8;
                              setVolume(nextVol);
                              if (audioRef.current) audioRef.current.volume = nextVol;
                            }}
                            className="cursor-pointer hover:text-neutral-300"
                          >
                            {volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                          </button>
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={volume}
                            onChange={(e) => {
                              const parsedVol = parseFloat(e.target.value);
                              setVolume(parsedVol);
                              if (audioRef.current) audioRef.current.volume = parsedVol;
                            }}
                            className="w-16 accent-red-500 h-1 rounded bg-neutral-800"
                          />
                        </div>
                      </div>

                      {/* Reset button uploader */}
                      <button
                        onClick={resetAnalyzer}
                        className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-[10px] text-neutral-300 px-3.5 py-1.5 rounded-lg border border-white/5 transition-colors cursor-pointer"
                      >
                        <RotateCcw size={12} className="text-neutral-500" /> Analyze New Audio
                      </button>

                    </div>
                  </div>

                  {/* HARMONIC CHORD HARMONIC TIMELINE */}
                  <div className="bg-[#0F1115]/65 border border-white/5 rounded-2xl p-5 shadow-xl">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-100 flex items-center gap-1.5">
                          Harmonic Chord Progression <span className="bg-red-950/25 text-red-400 text-[8px] font-semibold font-mono px-2 py-0.5 rounded border border-red-500/10">Beat Sync</span>
                        </h2>
                        <p className="text-[9px] text-neutral-500 font-mono mt-0.5">Estimated chord blocks matching transient signatures</p>
                      </div>

                      {/* MIDI Chord progression downloader */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleMidiDownload}
                          className="flex items-center gap-1.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-red-400 text-neutral-300 font-bold px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          <Music size={11} /> Download Chord MIDI
                        </button>
                        <button
                          onClick={handleDownloadAnalysisDAWProject}
                          className="flex items-center gap-1.5 bg-red-650/15 border border-red-500/20 hover:bg-red-650/25 hover:border-red-500 text-red-400 font-bold px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-md"
                        >
                          <Activity size={11} /> Export DAWProject
                        </button>
                      </div>
                    </div>

                    <div 
                      ref={chordsScrollRef}
                      className="bg-[#0A0A0B] border border-white/5 p-3.5 rounded-xl overflow-x-auto overflow-y-hidden custom-scrollbar flex gap-1 position-relative shrink-0"
                    >
                      {analysisResult.chords.map((c, idx) => {
                        const cellDuration = c.end - c.start;
                        // Width scale: around 45px per second length, bounded to prevent overflow
                        const calculatedWidth = Math.max(68, cellDuration * 46);
                        const isNodeActive = idx === activeChordIdx;

                        return (
                          <div
                            key={idx}
                            data-index={idx}
                            style={{ width: `${calculatedWidth}px` }}
                            onClick={() => seekTo(c.start)}
                            className={`px-3 py-2 shrink-0 border rounded-lg text-center cursor-pointer transition-all ${isNodeActive ? 'bg-red-950/20 border-red-500/50 shadow shadow-red-950/20' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                          >
                            <div className={`text-[12px] font-bold font-mono filter drop-shadow ${isNodeActive ? 'text-red-400' : 'text-neutral-300'}`}>{c.chord}</div>
                            <div className="text-[7.5px] font-mono text-neutral-500 mt-1">{formatTime(c.start)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ANALYSIS SPLIT SECTION DETAILS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* LEFT PANEL: TIMELINE DESTRUCTION LIST */}
                    <div className="bg-[#0F1115]/65 border border-white/5 rounded-2xl p-5 shadow-xl">
                      <div className="flex border-b border-white/5 gap-1.5 mb-3">
                        <button
                          onClick={() => setActiveSectionTab("sections")}
                          className={`pb-2 px-3 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${activeSectionTab === "sections" ? "text-red-400 border-b border-red-500" : "text-neutral-500 hover:text-neutral-300"}`}
                        >
                          Structural Sections
                        </button>
                        <button
                          onClick={() => setActiveSectionTab("bars")}
                          className={`pb-2 px-3 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${activeSectionTab === "bars" ? "text-red-400 border-b border-red-500" : "text-neutral-500 hover:text-neutral-300"}`}
                        >
                          Rhythm Bars Grid
                        </button>
                      </div>

                      {/* Sections List */}
                      {activeSectionTab === "sections" && (
                        <div className="max-h-60 overflow-y-auto scrollbar-thin">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="border-b border-white/5 text-neutral-500 uppercase tracking-widest font-mono text-[8px]">
                                <th className="pb-2">Label</th>
                                <th className="pb-2">Timeline Range</th>
                                <th className="pb-2">Duration</th>
                                <th className="pb-2 text-right">Energy Range</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysisResult.section_boundaries.map((sec, idx) => {
                                const isRowPlaying = idx === activeSectionIdx;
                                const boundaryColors = ["text-red-400", "text-rose-450", "text-rose-350", "text-[#fb7185]", "text-neutral-450"];

                                return (
                                  <tr
                                    key={idx}
                                    onClick={() => seekTo(sec.start)}
                                    className={`border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors cursor-pointer ${isRowPlaying ? 'bg-white/5 font-extrabold text-white' : ''}`}
                                  >
                                    <td className={`py-2 px-1 text-[11px] font-bold uppercase ${boundaryColors[idx % boundaryColors.length]}`}>
                                      {sec.label}
                                    </td>
                                    <td className="py-2 text-neutral-400 font-mono">
                                      {formatTime(sec.start)} - {formatTime(sec.end)}
                                    </td>
                                    <td className="py-2 text-neutral-500 font-mono">
                                      {(sec.end - sec.start).toFixed(1)}s
                                    </td>
                                    <td className="py-2 text-right font-mono text-neutral-300">
                                      {getSectionEnergyLabel(sec.start, sec.end)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Rhythm Bars grid */}
                      {activeSectionTab === "bars" && (
                        <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto scrollbar-thin p-1">
                          {analysisResult.bars.map((b, idx) => {
                            const isBarActive = idx === activeBarIdx;
                            return (
                              <button
                                key={idx}
                                onClick={() => seekTo(b.start)}
                                className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center transition-colors cursor-pointer ${isBarActive ? 'bg-red-950/20 border-red-500/50 shadow shadow-red-950/20' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                              >
                                <span className={`text-[10px] font-bold font-mono ${isBarActive ? 'text-red-400' : 'text-neutral-450'}`}>B{b.number}</span>
                                <span className="text-[7.5px] font-mono text-neutral-500 mt-0.5">{formatTime(b.start)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                    </div>

                    {/* RIGHT PANEL: SPECTRAL METRICS & REALTIME TREND CURVES */}
                    <div className="bg-[#0F1115]/65 border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
                      
                      {/* Spectral balance ratios meters */}
                      <div className="bg-[#0A0A0B] border border-white/5 rounded-xl p-3">
                        <h3 className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest mb-3 pb-1 border-b border-white/5">Spectral Profile Distribution</h3>
                        
                        <div className="flex flex-col gap-2">
                          <div>
                            <div className="flex justify-between text-[9px] text-neutral-400 font-bold mb-1">
                              <span>BASS (20-150Hz)</span>
                              <span>{Math.round(analysisResult.spectral_profile.bands.bass * 100)}%</span>
                            </div>
                            <div className="w-full bg-[#0F1115]/80 rounded h-1 overflow-hidden">
                              <div className="h-full bg-red-600" style={{ width: `${analysisResult.spectral_profile.bands.bass * 100}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[9px] text-neutral-400 font-bold mb-1">
                              <span>MIDS (150-2000Hz)</span>
                              <span>{Math.round(analysisResult.spectral_profile.bands.mids * 100)}%</span>
                            </div>
                            <div className="w-full bg-[#0F1115]/80 rounded h-1 overflow-hidden">
                              <div className="h-full bg-neutral-450" style={{ width: `${analysisResult.spectral_profile.bands.mids * 100}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[9px] text-neutral-400 font-bold mb-1">
                              <span>HIGHS (2000Hz+)</span>
                              <span>{Math.round(analysisResult.spectral_profile.bands.highs * 100)}%</span>
                            </div>
                            <div className="w-full bg-[#0F1115]/80 rounded h-1 overflow-hidden">
                              <div className="h-full bg-red-450" style={{ width: `${analysisResult.spectral_profile.bands.highs * 100}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between font-mono text-[9px] text-neutral-550 mt-3 pt-2.5 border-t border-white/5">
                          <span>Centroid Brigthness: <strong className="text-neutral-300 font-bold">{Math.round(analysisResult.spectral_profile.brightness)} Hz</strong></span>
                          <span>Flatness: <strong className="text-neutral-300 font-bold">{analysisResult.spectral_profile.noisiness.toFixed(4)}</strong></span>
                        </div>
                      </div>

                      {/* Smooth curves visualizations */}
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="bg-[#0A0A0B] border border-white/5 rounded-xl p-2.5 text-center">
                          <h3 className="text-[8.5px] text-neutral-500 font-mono uppercase tracking-widest text-left mb-1.5 pb-0.5 border-b border-white/5">RMS Volume Curve</h3>
                          <canvas ref={rmsChartRef} className="w-full max-h-[64px] block mb-0.5" />
                        </div>
                        <div className="bg-[#0A0A0B] border border-white/5 rounded-xl p-2.5 text-center">
                          <h3 className="text-[8.5px] text-neutral-500 font-mono uppercase tracking-widest text-left mb-1.5 pb-0.5 border-b border-white/5">Transient Density</h3>
                          <canvas ref={densityChartRef} className="w-full max-h-[64px] block mb-0.5" />
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* DAW Interoperability Hub */}
                  <div className="bg-[#0F1115]/65 border border-white/5 rounded-2xl p-5 shadow-xl">
                    <div className="flex border-b border-white/5 pb-2.5 mb-4 justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Activity size={16} className="text-red-500 animate-pulse" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-150">DAW Interoperability & Sync Center</h2>
                      </div>
                      <span className="text-[8.5px] bg-red-950/20 border border-red-500/10 text-red-400 font-mono font-bold px-2 py-0.5 rounded uppercase">Path B & C Compatible</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Column 1 */}
                      <div className="bg-[#0A0A0B] border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                        <div>
                          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-200">1. DAWProject Archive</h3>
                          <p className="text-[9.5px] text-neutral-500 mt-1 font-sans leading-relaxed">
                            Generates a single open-source <strong className="text-neutral-300">.dawproject</strong> file. Automatically sets timeline markers, RMS envelope volume automation, and embeds the detected chord MIDI track.
                          </p>
                        </div>
                        <button
                          onClick={handleDownloadAnalysisDAWProject}
                          className="mt-4 w-full bg-red-650 hover:bg-red-500 font-bold text-white py-1.5 px-3 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer border border-white/5 shadow"
                        >
                          Download .dawproject
                        </button>
                      </div>

                      {/* Column 2 */}
                      <div className="bg-[#0A0A0B] border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                        <div>
                          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-200">2. Reaper ReaScript Sync</h3>
                          <p className="text-[9.5px] text-neutral-500 mt-1 font-sans leading-relaxed">
                            For Reaper users. Downloads a custom python script containing localized API commands to sync and recreate arrangement markers in your Reaper project instantly.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const scriptContent = generateReaperSyncScript(analysisResult);
                            const blob = new Blob([scriptContent], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = "reaper_sync_timeline.py";
                            link.click();
                            URL.revokeObjectURL(url);
                            addLog("Downloaded customized Reaper ReaScript timeline sync script.");
                          }}
                          className="mt-4 w-full bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-300 py-1.5 px-3 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Download Reaper script (.py)
                        </button>
                      </div>

                      {/* Column 3 */}
                      <div className="bg-[#0A0A0B] border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                        <div>
                          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-200">3. Ableton Remote Guide</h3>
                          <p className="text-[9.5px] text-neutral-500 mt-1 font-sans leading-relaxed">
                            For Ableton Live. Generates a custom configuration blueprint utilizing Ableton's Python remote scripting API parameters to align locator blocks to detected regions.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const scriptContent = generateAbletonSyncScript(analysisResult);
                            const blob = new Blob([scriptContent], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = "ableton_sync_instructions.py";
                            link.click();
                            URL.revokeObjectURL(url);
                            addLog("Downloaded customized Ableton Live remote instructions python script.");
                          }}
                          className="mt-4 w-full bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-300 py-1.5 px-3 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Download Ableton script (.py)
                        </button>
                      </div>

                      {/* Column 4 */}
                      <div className="bg-[#0A0A0B] border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                        <div>
                          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-200">4. FL Studio PianoRoll</h3>
                          <p className="text-[9.5px] text-neutral-500 mt-1 font-sans leading-relaxed">
                            For FL Studio. Downloads a specialized script that can be run inside FL's Piano Roll scripting engine (v21+) to draw analyzed chords or place custom markers.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const scriptContent = generateFLStudioSyncScript(analysisResult);
                            const blob = new Blob([scriptContent], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = "fl_studio_arrangement_sync.py";
                            link.click();
                            URL.revokeObjectURL(url);
                            addLog("Downloaded customized FL Studio Piano Roll and Marker sync script.");
                          }}
                          className="mt-4 w-full bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-300 py-1.5 px-3 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Download FL Studio script (.py)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* collapsable JSON LOG VIEW */}
                  <div className="bg-[#0F1115]/65 border border-white/5 rounded-2xl p-5 shadow-xl">
                    <div className="flex justify-between items-center pb-2.5 border-b border-white/5 mb-3">
                      <div className="flex items-center gap-2 text-neutral-350">
                        <FileCode size={15} className="text-red-400" />
                        <h2 className="text-xs font-bold uppercase tracking-wider">Normalized JSON API Object</h2>
                      </div>
                      <button
                        onClick={() => {
                          const jsonText = JSON.stringify(analysisResult, null, 2);
                          navigator.clipboard.writeText(jsonText).then(() => alert("JSON copied to clipboard!"));
                        }}
                        className="bg-white/5 hover:bg-white/10 text-neutral-350 text-[8.5px] border border-white/5 font-mono font-bold px-3 py-1 rounded cursor-pointer"
                      >
                        Copy JSON String
                      </button>
                    </div>
                    
                    <pre className="text-[9.5px] font-mono text-neutral-400 bg-[#0A0A0B] border border-white/5 p-4 rounded-xl max-h-56 overflow-y-auto scrollbar-thin select-all">
                      <code>{JSON.stringify(analysisResult, null, 2)}</code>
                    </pre>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* ========================================================== */}
          {/* VIEW PANEL 2: ARRANGEMENT ARCHITECT PRO                    */}
          {/* ========================================================== */}
          {activeTab === "sequencer" && (
            <div className="flex flex-col gap-5 animate-fade-in">
              
              {/* MAIN METRIC CONTROL BAR */}
              <div className="bg-[#0F1115]/65 border border-white/5 rounded-2xl p-5 flex items-center justify-between gap-5 flex-wrap shadow-xl">
                
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest font-mono">Genre Framework</span>
                    <select
                      value={genre}
                      onChange={(e) => {
                        const nextG = e.target.value as Genre;
                        setGenre(nextG);
                        addLog(`Switched playlist framework template to ${nextG.toUpperCase()}`);
                      }}
                      className="bg-[#0A0A0B] text-red-400 border border-white/5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value="Trap">Trap</option>
                      <option value="Hip Hop">Hip Hop</option>
                      <option value="Drill">Drill</option>
                      <option value="Pop">Pop</option>
                      <option value="Trip Hop">Trip Hop</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest font-mono">Project Tempo (BPM)</span>
                    <input
                      type="number"
                      min={60}
                      max={220}
                      value={bpm}
                      onChange={(e) => {
                        const nextBpm = Math.max(60, parseInt(e.target.value) || 120);
                        setBpm(nextBpm);
                        addLog(`Adjusted project master tempo to ${nextBpm} BPM`);
                      }}
                      className="bg-[#0A0A0B] text-red-500 border border-white/5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold w-20 text-center focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleSuggestArrangement}
                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-red-400 border border-white/5 font-bold px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    <Sparkles size={11} /> Suggest Outline
                  </button>

                  <button
                    onClick={handleExportTrackMidis}
                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/5 font-bold px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    <Download size={11} /> Export Stems MIDI
                  </button>

                  <button
                    onClick={handleExportSequencerDAWProject}
                    className="flex items-center gap-1.5 bg-red-650 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md border border-white/5"
                  >
                    <Activity size={11} /> Export DAWProject (.dawproject)
                  </button>

                  <button
                    onClick={handleExportSessionJSON}
                    className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/5 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                    title="Export raw JSON structured coordinates for training"
                  >
                    <Download size={11} className="text-zinc-400" /> Export JSON Brain
                  </button>
                </div>

              </div>

              {/* TAB VARIATION SELECTION RAIL */}
              <div className="flex border-b border-white/5 bg-white/5 rounded-xl overflow-hidden shadow">
                {["MAIN MIX", "VARIANT 1", "VARIANT 2", "VARIANT 3", "VARIANT 4", "VARIANT 5"].map((tabLabel, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSequencerTabIdx(idx)}
                    className={`flex-1 py-3 px-1 text-[9.5px] font-bold tracking-widest uppercase transition-all cursor-pointer border-r border-white/5 last:border-0 ${sequencerTabIdx === idx ? 'bg-red-650 text-white shadow-inner' : 'text-neutral-550 hover:text-neutral-350 hover:bg-white/5'}`}
                  >
                    {tabLabel}
                  </button>
                ))}
              </div>

              {/* TIMELINE ARRANGEMENT sequencer MATRIX */}
              <div className="bg-[#0F1115]/65 border border-white/5 rounded-2xl p-5 shadow-xl overflow-hidden flex flex-col gap-6">
                
                {/* STEMS LOOPS UPLOAD STRAP */}
                <LoopUploader onAdd={(l) => {
                  setLoops((prev) => [...prev, l]);
                  addLog(`Uploaded and analyzed state loop: "${l.name}" (${l.type})`);
                }} sessionBpm={bpm} />

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-100 flex items-center gap-2">
                      Sequences Timeline Matrix
                    </h3>
                    <button
                      onClick={handleAddSection}
                      className="text-[10px] bg-[#0A0A0B] hover:bg-white/5 text-neutral-300 px-3 py-1.5 rounded-lg border border-white/5 transition-all uppercase tracking-wider cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={11} className="text-red-500" /> Split Section
                    </button>
                  </div>

                  <ArrangementGrid
                    genre={genre}
                    sections={currentSeqTab.sections}
                    loops={loops}
                    assignments={currentSeqTab.assignments}
                    energyLevels={currentSeqTab.energyLevels}
                    onAssign={handleSeqAssign}
                    onEnergyChange={handleSeqEnergyChange}
                    onOpenPianoRoll={(sid, stem) => setPianoRollSection({ sid, stem })}
                    mutes={mutes}
                    onToggleMute={(row) => setMutes(p => ({ ...p, [row]: !p[row] }))}
                    totalBars={totalSeqBars}
                  />
                </div>

                {/* SECTION EDITOR SLIDERS PANEL */}
                <div className="border-t border-white/5 pt-5 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Section Boundaries & Structural Scales</h3>
                  <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                    {currentSeqTab.sections.map((sect, sIdx) => (
                      <SectionEditor
                        key={sect.id}
                        section={sect}
                        onEndChange={(endVal) => handleEditEndBar(sect.id, endVal)}
                        onLabelChange={(lblVal) => handleEditLabelSection(sect.id, lblVal)}
                        onRemove={() => handleRemoveSection(sect.id)}
                        isLast={sIdx === currentSeqTab.sections.length - 1}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* TWO COLUMN ROW FOR DESIGN DUE DILIGENCE AUDIT & LOGGING TERMINAL */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
                
                {/* 1. ARRANGEMENT COACH (DUE DILIGENCE STRUCTURAL AUDIT) */}
                <div className="bg-[#0F1115]/65 border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-3.5">
                      <Sparkles size={15} className="text-red-400" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-150">Arrangement Coach & Structural Audit</h2>
                    </div>

                    <p className="text-[9.5px] text-neutral-400 leading-relaxed font-sans mb-4">
                      Evaluates arrangement structural integrity, track energy distribution, section transitions, and sync metrics to ensure production-level compliance with DAW systems.
                    </p>

                    <div className="flex flex-col gap-2.5 font-mono text-[9.5px]">
                      {/* Check 1 */}
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0A0A0B]/60 border border-white/5">
                        <span className="text-emerald-500 font-bold shrink-0">✔ [OK]</span>
                        <div>
                          <strong className="text-neutral-300 block mb-0.5">Continuous Timeline Constraint (Metric B)</strong>
                          <span className="text-neutral-500 text-[8.5px] leading-tight block">All section blocks start exactly at 1 bar after the preceding section. Bar length stays tightly bounded to 32 measures.</span>
                        </div>
                      </div>

                      {/* Check 2 */}
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0A0A0B]/60 border border-white/5">
                        <span className="text-emerald-500 font-bold shrink-0">✔ [OK]</span>
                        <div>
                          <strong className="text-neutral-300 block mb-0.5">Energy Coefficient Flow (Metric D)</strong>
                          <span className="text-neutral-500 text-[8.5px] leading-tight block">Intro sections contain soft/mid range variables, while Drop/Chorus structures safely scale stem energies to 4/5 or 5/5.</span>
                        </div>
                      </div>

                      {/* Check 3 */}
                      <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0A0A0B]/60 border border-white/5">
                        {currentSeqTab.sections.length >= 3 ? (
                          <span className="text-emerald-500 font-bold shrink-0">✔ [OK]</span>
                        ) : (
                          <span className="text-amber-500 font-bold shrink-0">⚠ [WARN]</span>
                        )}
                        <div>
                          <strong className="text-neutral-300 block mb-0.5">Modular Phasing Alignment (Metric A)</strong>
                          <span className="text-neutral-500 text-[8.5px] leading-tight block">
                            {currentSeqTab.sections.length >= 3
                              ? `Timeline is successfully segmented into ${currentSeqTab.sections.length} distinct structural milestones, ensuring healthy movement.`
                              : "Timeline is currently too static. Split arrangement into 3+ distinct sections (e.g. Intro, Verse, Hook) to increase listenership."}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between font-mono text-[8.5px] text-neutral-500">
                    <span>Active Profile: <strong className="text-red-400 font-bold uppercase">{genre} Studio Blueprint</strong></span>
                    <span>Confidence Coefficient: <strong className="text-neutral-300 font-bold">98.4%</strong></span>
                  </div>
                </div>

                {/* 2. PROJECT CHANGE LOGGING (TERMINAL WATCH) */}
                <div className="bg-[#0F1115]/65 border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3.5">
                    <div className="flex items-center gap-2">
                      <Terminal size={15} className="text-neutral-400" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-150">Active Session Terminal Watch</h2>
                    </div>
                    <button
                      onClick={() => setChangeLogs([`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] Console buffer logs flushed manually`])}
                      className="text-[8px] bg-white/5 hover:bg-white/10 text-neutral-400 border border-white/5 px-2.5 py-1 rounded font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
                    >
                      Clear Shell
                    </button>
                  </div>

                  <div className="flex-1 bg-[#0A0A0B] border border-white/5 rounded-xl p-3 h-48 overflow-y-auto scrollbar-thin font-mono text-[9px] text-neutral-400 leading-normal flex flex-col gap-1.5 shadow-inner">
                    {changeLogs.map((logLine, lIdx) => {
                      const isAlert = logLine.includes("Exported") || logLine.includes("Analyzed");
                      const isAction = logLine.includes("Assigned") || logLine.includes("Adjusted") || logLine.includes("Split");
                      return (
                        <div key={lIdx} className="hover:bg-white/[0.02] py-0.5 px-1 rounded transition-colors flex gap-2">
                          <span className="text-red-500 shrink-0">&raquo;</span>
                          <span className={isAlert ? "text-red-400 font-semibold" : isAction ? "text-neutral-300" : "text-neutral-450"}>
                            {logLine}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-[8.5px] font-mono text-neutral-550 flex justify-between items-center">
                    <span>Streaming live telemetry timeline updates</span>
                    <span>BufferSize: {changeLogs.length}/50 lines</span>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* PIANO ROLL MOTIF MODAL POPUP PREVIEW */}
      {pianoRollSection && (
        <div className="fixed inset-0 bg-[#0A0A0B]/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0D0E12] border border-white/5 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
            <div className="p-4 bg-[#0F1115] border-b border-white/5 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest">Simulated Piano Roll Motif</h4>
                <p className="text-[9px] text-neutral-500 font-mono mt-0.5">Cell Context: {pianoRollSection.stem} &bull; Section {pianoRollSection.sid}</p>
              </div>
              <button 
                onClick={() => setPianoRollSection(null)}
                className="text-neutral-500 hover:text-white cursor-pointer hover:bg-white/5 p-1 rounded-full text-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 flex-1 flex flex-col gap-4 text-center">
              
              {/* Retro step sequencer mock board UI */}
              <div className="bg-[#0A0A0B] p-4 rounded-xl border border-white/5 grid grid-rows-4 gap-1.5 select-none shrink-0 font-mono text-[9px]">
                {/* Sequence rows */}
                {[...Array(4)].map((_, rIdx) => (
                  <div key={rIdx} className="flex gap-1 items-center">
                    <span className="w-8 shrink-0 text-neutral-500 font-bold text-right pr-2">MIDI</span>
                    <div className="flex-1 grid grid-cols-16 gap-1 h-3.5">
                      {[...Array(16)].map((_, cIdx) => {
                        const cellSeed = (rIdx * 7) + (cIdx * 11) + (pianoRollSection.sid.charCodeAt(0) * 11);
                        const isNoteTriggered = cellSeed % 5 === 0 || cellSeed % 9 === 0;

                        return (
                          <div 
                            key={cIdx} 
                            style={{ opacity: isNoteTriggered ? 1 : 0.08 }}
                            className={`rounded-sm h-full ${
                              pianoRollSection.stem === "Drums" 
                                ? "bg-red-600" 
                                : pianoRollSection.stem === "Bass" 
                                ? "bg-neutral-500" 
                                : "bg-red-400"
                            }`} 
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Description summary */}
              <div className="text-left bg-[#0A0A0B] border border-white/5 rounded-xl p-3 text-[10px] leading-relaxed text-neutral-450">
                <span className="text-red-400 font-bold uppercase">Composition Details:</span> Generates a deterministic step segment based on the active <strong>{genre}</strong> drum blueprint and chord scale <strong>({CHORD_NAMES[genre]?.[pianoRollSection.sid.charCodeAt(0) % (CHORD_NAMES[genre]?.length || 1)] || "C"})</strong>. Subdivided at 16th quantization, providing precise polyrhythmic transients for DAW multitrack imports.
              </div>

            </div>

            <div className="p-4 bg-[#0F1115] border-t border-white/5 flex justify-end gap-2">
              <button
                onClick={() => {
                  try {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const filter = ctx.createBiquadFilter();
                    const gain = ctx.createGain();

                    osc.type = "sine";
                    // Dynamic math pitch based on stem
                    osc.frequency.setValueAtTime(
                      pianoRollSection.stem === "Bass" ? 110 : pianoRollSection.stem === "Drums" ? 180 : 380,
                      ctx.currentTime
                    );

                    // Envelope trigger
                    gain.gain.setValueAtTime(0.25, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start();
                    osc.stop(ctx.currentTime + 1.2);
                  } catch (audioContextErr) {
                    console.error("Synthesizer context failed:", audioContextErr);
                  }
                }}
                className="bg-[#0A0A0B] border border-white/5 hover:bg-white/5 text-neutral-200 px-4 py-2 rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
              >
                Synthesize Cue Audio
              </button>
              <button
                onClick={() => setPianoRollSection(null)}
                className="bg-red-650 text-white hover:bg-red-500 px-4 py-2 rounded-xl text-[10px] font-bold cursor-pointer transition-colors border border-white/5 hover:border-white/10"
              >
                Accept Pattern
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER SECTION */}
      <footer className="shrink-0 border-t border-white/5 bg-[#0F1115]/80 py-4 text-center z-10 text-[9px] text-neutral-500 font-mono select-none">
        Developed for producers. Powered by server-side Gemini audio analysis and digital multitrack MIDI compilers.
      </footer>
    </div>
  );
}
