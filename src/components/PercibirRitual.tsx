import { useRef, useState } from "react";
import { RevealCard } from "./RevealCard";
import { ApiError, DiscoverResult, Species } from "../lib/api";

const PHASE = "calma";
const DRAG_OPEN_THRESHOLD_PX = 120;
const RITUAL_ANIM_MS = 1800;
const CARD_SPINS = 2;
const MAX_SOUND_MS = 3000;
const SFX_TEAR = "/sounds/sfx-tear.mp3";
const SFX_WHOOSH = "/sounds/sfx-whoosh.mp3";

const RARITY_GLOW: Record<string, string> = {
  registrada: "#bfe6c9",
  notable: "#4fa9e0",
  singular: "#a35fe0",
  epica: "#e0a02f",
  primordial: "#ffd54a",
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function speciesSoundUrl(scientificName: string) {
  const slug = scientificName.toLowerCase().replace(/\s+/g, "-");
  return `/sounds/${slug}.mp3`;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function safePlay(audio: HTMLAudioElement) {
  try {
    return audio.play() ?? Promise.resolve();
  } catch {
    return Promise.resolve();
  }
}

function playOnce(url: string) {
  safePlay(new Audio(url)).catch(() => {});
}

type RitualPhase = "sealed" | "opening" | "revealed";

export interface PercibirRitualProps {
  species: Species[];
  progress: { discovered: number; total: number } | null;
  discoverFn: (body: { speciesId: number; phase: string }, signal?: AbortSignal) => Promise<DiscoverResult>;
  onUnauthorized: () => void;
}

export function PercibirRitual({ species, progress, discoverFn, onUnauthorized }: PercibirRitualProps) {
  const [phase, setPhase] = useState<RitualPhase>("sealed");
  const [dragProgress, setDragProgress] = useState(0);
  const [result, setResult] = useState<(DiscoverResult & { fractaeChildName?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dragStartYRef = useRef<number | null>(null);
  const committedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const speciesAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopSpeciesSound() {
    if (soundTimeoutRef.current !== null) {
      clearTimeout(soundTimeoutRef.current);
      soundTimeoutRef.current = null;
    }
    if (speciesAudioRef.current) {
      speciesAudioRef.current.pause();
      speciesAudioRef.current.currentTime = 0;
      speciesAudioRef.current = null;
    }
  }

  function commitOpen() {
    if (!species.length) return;
    setError(null);
    setPhase("opening");
    playOnce(SFX_TEAR);
    playOnce(SFX_WHOOSH);

    const picked = species[Math.floor(Math.random() * species.length)];
    const audio = new Audio(speciesSoundUrl(picked.scientific_name));
    safePlay(audio)
      .then(() => audio.pause())
      .catch(() => {});
    speciesAudioRef.current = audio;

    const controller = new AbortController();
    abortRef.current = controller;

    Promise.all([discoverFn({ speciesId: picked.id, phase: PHASE }, controller.signal), delay(RITUAL_ANIM_MS)])
      .then(([data]) => {
        setResult({ ...data, fractaeChildName: picked.fractae_child_name });
        setPhase("revealed");
        const finalAudio = speciesAudioRef.current;
        if (finalAudio) {
          finalAudio.currentTime = 0;
          safePlay(finalAudio).catch(() => {});
          soundTimeoutRef.current = setTimeout(stopSpeciesSound, MAX_SOUND_MS);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setPhase("sealed");
        setDragProgress(0);
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo."
        );
      });
  }

  function handleDragStart(clientY: number) {
    if (phase !== "sealed") return;
    dragStartYRef.current = clientY;
    committedRef.current = false;
  }

  function handleDragMove(clientY: number) {
    if (dragStartYRef.current === null) return;
    const delta = Math.max(0, clientY - dragStartYRef.current);
    setDragProgress(Math.min(1, delta / DRAG_OPEN_THRESHOLD_PX));
    if (!committedRef.current && delta >= DRAG_OPEN_THRESHOLD_PX) {
      committedRef.current = true;
      commitOpen();
    }
  }

  function handleDragEnd() {
    dragStartYRef.current = null;
    if (!committedRef.current) {
      setDragProgress(0);
    }
  }

  function handleReset() {
    stopSpeciesSound();
    setResult(null);
    setError(null);
    setPhase("sealed");
    setDragProgress(0);
  }

  function handleRetry() {
    setError(null);
    setPhase("sealed");
    setDragProgress(0);
  }

  return (
    <div className="percibir-ritual">
      {error && (
        <div className="percibir-overlay">
          <p className="error">{error}</p>
          <button onClick={handleRetry}>Reintentar</button>
        </div>
      )}

      {!error && phase === "revealed" && result && (
        <div className="percibir-overlay">
          <strong>¡Percibiste una Fractura!</strong>
          <RevealCard
            imageUrl={result.imageUrl}
            commonName={result.commonName}
            scientificName={result.scientificName}
            phase={result.phase}
            rarityTier={result.rarityTier}
            discoveryCode={result.discoveryCode}
            fractaeChildName={result.fractaeChildName}
            glowColor={RARITY_GLOW[result.rarityTier.slug] ?? RARITY_GLOW.registrada}
            spins={prefersReducedMotion() ? 0 : CARD_SPINS}
          />
          <button onClick={handleReset}>Percibir de nuevo</button>
        </div>
      )}

      {!error && phase !== "revealed" && (
        <div className="percibir-overlay percibir-overlay-envelope">
          <h1>Percibir</h1>
          <div className="envelope">
            <div
              className="envelope-seal"
              data-testid="envelope-seal"
              style={{ transform: `translateY(${dragProgress * 40}px)`, opacity: 1 - dragProgress * 0.6 }}
              onPointerDown={(e) => handleDragStart(e.clientY)}
              onPointerMove={(e) => {
                if (dragStartYRef.current !== null) handleDragMove(e.clientY);
              }}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
              onTouchEnd={handleDragEnd}
              onTouchCancel={handleDragEnd}
            />
          </div>
          <p>{!species.length ? "Cargando..." : phase === "opening" ? "Percibiendo..." : "Desliza de arriba a abajo para romper el precinto"}</p>
          {progress && (
            <p>
              Llevas {progress.discovered} especies. Te faltan {Math.max(progress.total - progress.discovered, 0)} de
              esta tanda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
