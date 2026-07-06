import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getFuseEligible, fuseSpecies, EligibleSpecies, DiscoverResult, ApiError } from "../lib/api";
import { XpToast } from "../components/XpToast";
import { LevelUpScreen } from "../components/LevelUpScreen";
import { useNavVisibility } from "../lib/NavVisibilityContext";
import { useNotifications } from "../lib/NotificationsContext";

const RITUAL_MS = 1500;
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

export default function FusionPage() {
  const navigate = useNavigate();
  const { hideNav, showNav } = useNavVisibility();
  const { refetch: refetchNotifications } = useNotifications();
  const [searchParams] = useSearchParams();
  const [eligible, setEligible] = useState<EligibleSpecies[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fusing, setFusing] = useState<number | null>(null);
  const [glowSlug, setGlowSlug] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [showXpToast, setShowXpToast] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<{ previousLevel: number; level: number } | null>(null);

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
    // iOS Safari blocks audio.play() once the user-gesture "activation" has
    // expired — which it has by the time handleFuse's awaits resolve. Playing
    // (and immediately pausing) the element synchronously within the click
    // handler keeps it unlocked for the later programmatic play() below.
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

  function load() {
    setError(null);
    getFuseEligible()
      .then((data) => setEligible(data.eligible))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login");
          return;
        }
        setError("No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.");
      });
  }

  useEffect(load, [navigate]);
  useEffect(
    () => () => {
      stopSound();
      showNav();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const preselectedId = Number(searchParams.get("speciesId")) || null;

  async function handleFuse(species: EligibleSpecies) {
    if (fusing !== null) return;
    stopSound();
    hideNav();
    setFusing(species.speciesId);
    setGlowSlug(null);
    setError(null);
    primeSound(species.scientificName);
    try {
      const [data] = await Promise.all([fuseSpecies({ speciesId: species.speciesId }), delay(RITUAL_MS)]);
      setGlowSlug(data.rarityTier.slug);
      await delay(400);
      setResult(data);
      setShowXpToast(true);
      refetchNotifications();
      if (data.xp.leveledUp) {
        setLevelUpInfo({ previousLevel: data.xp.previousLevel, level: data.xp.level });
      }
      playSound();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login");
        return;
      }
      setError(
        err instanceof ApiError ? err.message : "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo."
      );
      showNav();
    } finally {
      setFusing(null);
    }
  }

  function handleReset() {
    stopSound();
    setResult(null);
    setShowXpToast(false);
    setLevelUpInfo(null);
    setGlowSlug(null);
    showNav();
    load();
  }

  return (
    <div className="page">
      <h1>Altar de Fusión</h1>

      {error && (
        <div className="card">
          <p className="error">{error}</p>
          <button onClick={handleReset}>Reintentar</button>
        </div>
      )}

      {!error && result && (
        <div
          className="card"
          style={{ border: `4px solid ${RARITY_GLOW[result.rarityTier.slug] ?? "#3fae5a"}` }}
        >
          <strong>¡Fusión completada!</strong>
          <img src={result.imageUrl} alt={result.commonName} className="species-image" />
          <div>
            {result.commonName} ({result.scientificName})
          </div>
          <div>Fase: {result.phase}</div>
          <div>Rareza: {result.rarityTier.name}</div>
          <div>Código: {result.discoveryCode}</div>
          <button onClick={handleReset}>Volver al altar</button>
        </div>
      )}

      {!error && !result && !eligible && <p>Cargando...</p>}

      {!error && !result && eligible && eligible.length === 0 && (
        <p>Aún no tienes 5 duplicados de Balance de ninguna especie. ¡Sigue percibiendo!</p>
      )}

      {!error && !result && eligible && eligible.length > 0 && (
        <div className="grid">
          {eligible.map((species) => (
            <div
              key={species.speciesId}
              className="card"
              style={{
                border: species.speciesId === preselectedId ? "3px solid #ffd54a" : undefined,
              }}
            >
              <img
                src={species.balanceAnchorUrl}
                alt={species.commonName}
                className="species-image"
                loading="lazy"
              />
              <strong>{species.commonName}</strong>
              <div>Duplicados: {species.balanceCount}</div>
              <button disabled={fusing === species.speciesId} onClick={() => handleFuse(species)}>
                {fusing === species.speciesId ? "Fusionando..." : "Fusionar"}
              </button>
            </div>
          ))}
        </div>
      )}
      {showXpToast && result && (
        <XpToast xpGained={result.xp.xpGained} onDone={() => setShowXpToast(false)} />
      )}
      {levelUpInfo && (
        <LevelUpScreen
          previousLevel={levelUpInfo.previousLevel}
          level={levelUpInfo.level}
          onClose={() => setLevelUpInfo(null)}
        />
      )}
    </div>
  );
}
