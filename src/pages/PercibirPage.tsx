import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSpecies, getMyProfile, discover, Species, DiscoverResult, ApiError } from "../lib/api";

const PHASE = "calma";
const MIN_RITUAL_MS = 1500;
const MAX_SOUND_MS = 3000;

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

export default function PercibirPage() {
  const navigate = useNavigate();
  const [species, setSpecies] = useState<Species[] | null>(null);
  const [progress, setProgress] = useState<{ discovered: number; total: number } | null>(null);
  const [holding, setHolding] = useState(false);
  const [glowSlug, setGlowSlug] = useState<string | null>(null);
  const [result, setResult] = useState<(DiscoverResult & { fractaeChildName?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const releasedEarlyRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopSound() {
    if (soundTimeoutRef.current !== null) {
      clearTimeout(soundTimeoutRef.current);
      soundTimeoutRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }

  function primeSound(scientificName: string) {
    // iOS Safari only allows audio.play() without a fresh user gesture if the
    // element already played during the gesture that started this ritual —
    // the real playSound() call below happens after several awaits, well
    // outside the pointerdown gesture, so it would otherwise be silently
    // blocked.
    const audio = new Audio(speciesSoundUrl(scientificName));
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {});
    currentAudioRef.current = audio;
  }

  function playSound() {
    const audio = currentAudioRef.current;
    if (!audio) return;
    audio.play().catch(() => {});
    soundTimeoutRef.current = setTimeout(stopSound, MAX_SOUND_MS);
  }

  useEffect(() => {
    setError(null);
    Promise.all([getSpecies(), getMyProfile()])
      .then(([speciesData, profileData]) => {
        setSpecies(speciesData.species);
        setProgress({ discovered: profileData.speciesDiscoveredCount, total: profileData.speciesTotalCount });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login");
          return;
        }
        setError("No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.");
      });
  }, [navigate, retryCount]);

  useEffect(() => stopSound, []);

  async function handlePressStart() {
    if (!species || species.length === 0 || holding) return;
    setError(null);
    setHolding(true);
    setGlowSlug(null);
    releasedEarlyRef.current = false;

    const picked = species[Math.floor(Math.random() * species.length)];
    const controller = new AbortController();
    abortRef.current = controller;
    primeSound(picked.scientific_name);

    try {
      const [data] = await Promise.all([
        discover({ speciesId: picked.id, phase: PHASE }, controller.signal),
        delay(MIN_RITUAL_MS),
      ]);

      if (releasedEarlyRef.current) return;

      setGlowSlug(data.rarityTier.slug);
      await delay(400);
      setResult({ ...data, fractaeChildName: picked.fractae_child_name });
      setHolding(false);
      playSound();
    } catch (err) {
      if (controller.signal.aborted) return;
      setHolding(false);
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login");
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo."
      );
    }
  }

  function handlePressEnd() {
    if (!holding) return;
    releasedEarlyRef.current = true;
    abortRef.current?.abort();
    setHolding(false);
    setGlowSlug(null);
  }

  function handleReset() {
    stopSound();
    setResult(null);
    setError(null);
    setRetryCount((n) => n + 1);
  }

  return (
    <div className="page">
      <h1>Percibir</h1>

      {error && (
        <div className="card">
          <p className="error">{error}</p>
          <button onClick={handleReset}>Reintentar</button>
        </div>
      )}

      {!error && result && (
        <div className="card">
          <strong>¡Percibiste una Fractura!</strong>
          <img src={result.imageUrl} alt={result.commonName} className="species-image" />
          <div>{result.commonName} ({result.scientificName})</div>
          {result.fractaeChildName && <div>Fractae: {result.fractaeChildName}</div>}
          <div>Fase: {result.phase}</div>
          <div>Rareza: {result.rarityTier.name}</div>
          <div>Código: {result.discoveryCode}</div>
          <button onClick={handleReset}>Percibir de nuevo</button>
        </div>
      )}

      {!error && !result && (
        <div className="card" style={{ textAlign: "center" }}>
          <div
            onPointerDown={handlePressStart}
            onPointerUp={handlePressEnd}
            onPointerCancel={handlePressEnd}
            onPointerLeave={handlePressEnd}
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              margin: "1rem auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#22331f",
              border: `4px solid ${glowSlug ? RARITY_GLOW[glowSlug] : "#3fae5a"}`,
              boxShadow: holding ? `0 0 24px ${glowSlug ? RARITY_GLOW[glowSlug] : "#3fae5a"}` : "none",
              transition: "box-shadow 0.3s ease, border-color 0.3s ease",
              cursor: species && species.length > 0 ? "pointer" : "default",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
              touchAction: "none",
            }}
          >
            <span style={{ opacity: holding ? 0.6 : 1 }}>{holding ? "Percibiendo..." : "?"}</span>
          </div>
          <p>{!species ? "Cargando..." : "Mantén pulsado para percibir"}</p>
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
