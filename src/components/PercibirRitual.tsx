import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RevealCard } from "./RevealCard";
import { XpToast } from "./XpToast";
import { LevelUpScreen } from "./LevelUpScreen";
import { ApiError, DiscoverResult, Species } from "../lib/api";
import { useNavVisibility } from "../lib/NavVisibilityContext";
import { useNotifications } from "../lib/NotificationsContext";
import { formatEnergyCountdown } from "../lib/energy";

const PHASE = "balance";
const DRAG_COMMIT_PROGRESS = 0.96;
const RITUAL_ANIM_MS = 1800;
const NEW_SLOT_OVERLAY_MS = 1300;
const REVEAL_TITLE_VISIBLE_MS = 2000;
const CARD_SPINS = 2;
const MAX_SOUND_MS = 3000;
const SFX_TEAR = "/sounds/sfx-tear.mp3";
const SFX_WHOOSH = "/sounds/sfx-whoosh.mp3";

// sobre.png is a 1024x1536 pack; the seal crease sits where the crimped top
// flap widens into the pack body, roughly 9% down from the top edge.
// Sized to match RevealCard's fixed 300px design width (see RevealCard.tsx
// CARD_NATURAL_WIDTH) so the pack and the revealed card read as the same
// physical object at the same screen size, minus the .page's 1rem side gutters.
const PACK_ASPECT = 1536 / 1024;
const PACK_MAX_WIDTH = 300;
const PACK_SIDE_GUTTER_PX = 32;
const PEEK_SCALE = 1.55;
const PEEK_TRANSLATE_RATIO = 0.05;
const SEAM_FRACTION = 0.09;

function vibrate(pattern: number | number[]) {
  // Vibration API has no support in iOS Safari (native or installed PWA) —
  // this is a no-op there by design, only Android/Chrome will feel it.
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

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
  discoverFn: (body: { phase: string }, signal?: AbortSignal) => Promise<DiscoverResult>;
  onUnauthorized: () => void;
  /** When set, energy is depleted (0 remaining) and the pack can't be opened until this timestamp. */
  energyResetAt?: number | null;
}

export function PercibirRitual({ species, discoverFn, onUnauthorized, energyResetAt }: PercibirRitualProps) {
  const energyDepleted = energyResetAt != null;
  const navigate = useNavigate();
  const { hideNav, showNav, pulseTab } = useNavVisibility();
  const { refetch: refetchNotifications } = useNotifications();
  const [showNewSlotOverlay, setShowNewSlotOverlay] = useState(false);
  const [showRevealTitle, setShowRevealTitle] = useState(false);
  const [phase, setPhase] = useState<RitualPhase>("sealed");
  const [peeking, setPeeking] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [result, setResult] = useState<(DiscoverResult & { fractaeChildName?: string }) | null>(null);
  const [showXpToast, setShowXpToast] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<{ previousLevel: number; level: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const draggingRef = useRef(false);
  const committedRef = useRef(false);
  const lastVibrateStepRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const speciesAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Full-bleed immersive screen: prevent iOS Safari's rubber-band scroll
    // (and the dynamic toolbar exposing extra layout viewport) from making
    // the fixed pack overlay feel scrollable.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      showNav();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // iOS Safari treats a touch starting near the left edge as its
    // system "swipe right to go back" gesture, hijacking it before our own
    // drag-to-open / card-rotate handlers ever see it. Blocking the default
    // on that initial touch (Safari only checks this at touchstart) keeps
    // the whole ritual's rightward gestures ours.
    const EDGE_ZONE_PX = 24;
    function blockEdgeSwipeBack(e: TouchEvent) {
      if (e.touches[0]?.clientX <= EDGE_ZONE_PX && e.cancelable) {
        e.preventDefault();
      }
    }
    document.addEventListener("touchstart", blockEdgeSwipeBack, { passive: false });
    return () => document.removeEventListener("touchstart", blockEdgeSwipeBack);
  }, []);

  useEffect(() => {
    if (phase !== "revealed") return;
    setShowRevealTitle(true);
    const timeout = setTimeout(() => setShowRevealTitle(false), REVEAL_TITLE_VISIBLE_MS);
    return () => clearTimeout(timeout);
  }, [phase]);

  useLayoutEffect(() => {
    function measure() {
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  const packWidth = Math.min(PACK_MAX_WIDTH, stageSize.width - PACK_SIDE_GUTTER_PX);
  const packHeight = packWidth * PACK_ASPECT;
  const packTop = (stageSize.height - packHeight) / 2;
  const peekTranslate = stageSize.height * PEEK_TRANSLATE_RATIO;
  const peekHeight = packHeight * PEEK_SCALE;
  const seamTop = packTop + peekTranslate + peekHeight * SEAM_FRACTION;

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

    const controller = new AbortController();
    abortRef.current = controller;

    Promise.all([discoverFn({ phase: PHASE }, controller.signal), delay(RITUAL_ANIM_MS)])
      .then(([data]) => {
        const matchedSpecies = species.find((s) => s.id === data.speciesId);
        setResult({ ...data, fractaeChildName: matchedSpecies?.fractae_child_name });
        setPhase("revealed");
        setShowXpToast(true);
        refetchNotifications();
        // Level-up is deliberately NOT shown here: it would mount on top of
        // the card reveal the instant it appears, competing for attention.
        // It's deferred until the user finishes with the reveal (swipe up,
        // see handleCommitUp) so the two never show at once.
        const audio = new Audio(speciesSoundUrl(data.scientificName));
        speciesAudioRef.current = audio;
        safePlay(audio).catch(() => {});
        soundTimeoutRef.current = setTimeout(stopSpeciesSound, MAX_SOUND_MS);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setPhase("sealed");
        setDragProgress(0);
        showNav();
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

  function handleTapEnvelope() {
    if (phase !== "sealed" || peeking || !species.length || energyDepleted) return;
    vibrate(15);
    hideNav();
    setPeeking(true);
  }

  function progressFromClientX(clientX: number) {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  function handleDragStart(clientX: number) {
    if (phase !== "sealed" || !peeking) return;
    draggingRef.current = true;
    committedRef.current = false;
    lastVibrateStepRef.current = 0;
    // The handle jumps straight to the touch point, like grabbing the seam
    // of a real pack wherever your finger lands, then tracks it 1:1.
    setDragProgress(progressFromClientX(clientX));
  }

  function handleDragMove(clientX: number) {
    if (!draggingRef.current) return;
    const nextProgress = progressFromClientX(clientX);
    setDragProgress(nextProgress);

    const step = Math.floor(nextProgress * 10);
    if (step > lastVibrateStepRef.current) {
      lastVibrateStepRef.current = step;
      vibrate(8);
    }

    if (!committedRef.current && nextProgress >= DRAG_COMMIT_PROGRESS) {
      committedRef.current = true;
      vibrate([20, 30, 40]);
      commitOpen();
    }
  }

  function handleDragEnd() {
    draggingRef.current = false;
    if (!committedRef.current) {
      setDragProgress(0);
    }
  }

  function handleReset() {
    stopSpeciesSound();
    setResult(null);
    setShowXpToast(false);
    setLevelUpInfo(null);
    setError(null);
    setPhase("sealed");
    setPeeking(false);
    setDragProgress(0);
    showNav();
  }

  function proceedAfterCommit() {
    if (!result) return;
    if (result.isNewSlot) {
      setShowNewSlotOverlay(true);
      setTimeout(() => {
        navigate("/coleccion", {
          state: { justUnlockedKey: `${result.speciesId}_${result.phase}` },
        });
      }, NEW_SLOT_OVERLAY_MS);
    } else {
      pulseTab("/coleccion");
      handleReset();
    }
  }

  function handleCommitUp() {
    if (!result) return;
    // First swipe-up: if this discovery leveled the player up, show that
    // now instead of proceeding — never at the same time as the reveal.
    // Dismissing the level-up screen (below) runs the deferred proceed step.
    if (result.xp.leveledUp && !levelUpInfo) {
      setLevelUpInfo({ previousLevel: result.xp.previousLevel, level: result.xp.level });
      return;
    }
    proceedAfterCommit();
  }

  function handleRetry() {
    setError(null);
    setPhase("sealed");
    setPeeking(false);
    setDragProgress(0);
  }

  return (
    <div className="percibir-ritual">
      {showXpToast && result && result.xp.xpGained > 0 && (
        <XpToast xpGained={result.xp.xpGained} onDone={() => setShowXpToast(false)} />
      )}
      {levelUpInfo && (
        <LevelUpScreen
          previousLevel={levelUpInfo.previousLevel}
          level={levelUpInfo.level}
          onClose={() => {
            setLevelUpInfo(null);
            proceedAfterCommit();
          }}
        />
      )}
      {error && (
        <div className="percibir-overlay">
          <p className="error">{error}</p>
          <button onClick={handleRetry}>Reintentar</button>
        </div>
      )}

      {!error && phase === "revealed" && result && !showNewSlotOverlay && (
        <div className="percibir-overlay">
          {showRevealTitle && <strong className="reveal-title-fade">¡Percibiste una Fractura!</strong>}
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
            onCommitUp={handleCommitUp}
          />
        </div>
      )}

      {showNewSlotOverlay && result && (
        <div className="percibir-overlay">
          <div className="new-slot-toast">
            <strong>¡Nueva especie registrada!</strong>
            <div>
              {result.commonName} ({result.fractaeChildName ?? result.phase})
            </div>
          </div>
        </div>
      )}

      {!error && phase !== "revealed" && (
        <div className="envelope-stage" ref={stageRef}>
          {stageSize.width > 0 && (
            <>
              <img
                src="/cards/sobre.png"
                alt="Sobre de cartas Ecorex"
                className="envelope-pack-img"
                data-testid="envelope-pack"
                onClick={handleTapEnvelope}
                draggable={false}
                style={{
                  width: packWidth,
                  top: packTop,
                  marginLeft: -packWidth / 2,
                  opacity: energyDepleted ? 0.5 : 1,
                  transform: peeking
                    ? `translateY(${peekTranslate}px) scale(${PEEK_SCALE})`
                    : "translateY(0) scale(1)",
                }}
              />

              <p className="envelope-hint envelope-hint-top">
                {!species.length
                  ? "Cargando..."
                  : energyDepleted
                    ? `Sin energía · próxima en ${formatEnergyCountdown(energyResetAt!)}`
                    : !peeking
                      ? "Toca el sobre para abrirlo"
                      : phase === "opening"
                        ? "Percibiendo..."
                        : "Desliza de izquierda a derecha para abrir"}
              </p>

              {peeking && (
                <div
                  ref={trackRef}
                  className="envelope-drag-track"
                  data-testid="envelope-drag-line"
                  style={{ top: seamTop, opacity: phase === "opening" ? 0 : 1 }}
                  onPointerDown={(e) => handleDragStart(e.clientX)}
                  onPointerMove={(e) => {
                    if (draggingRef.current) handleDragMove(e.clientX);
                  }}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                  onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                  onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
                  onTouchEnd={handleDragEnd}
                  onTouchCancel={handleDragEnd}
                >
                  <div className="envelope-drag-line">
                    <div className="envelope-drag-line-fill" style={{ width: `${dragProgress * 100}%` }} />
                  </div>
                  <div
                    className={`envelope-drag-handle${dragProgress === 0 ? " envelope-drag-handle-pulse" : ""}`}
                    style={{ left: `${dragProgress * 100}%` }}
                  >
                    ↔
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
