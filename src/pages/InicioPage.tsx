import { useEffect, useRef, useState } from "react";
import { useAppNavigate } from "../lib/navigation";
import {
  getFuseEligible,
  getMyProfile,
  getEnergy,
  getMissions,
  OnboardingState,
  ProfileStats,
  EnergyState,
  MissionsState,
  EligibleSpecies,
  ApiError,
} from "../lib/api";
import { FeatureUnlockModal } from "../components/FeatureUnlockModal";
import { MissionsCard } from "../components/MissionsCard";
import { HomeHero } from "../components/HomeHero";
import { OnboardingChecklist } from "../components/OnboardingChecklist";
import { useOnboarding } from "../lib/OnboardingContext";
import { FusionAltarCard } from "../components/fusion/FusionAltarCard";
import { WelcomeFlow, hasSeenWelcome, markWelcomeSeen } from "../components/WelcomeFlow";
import PushOnboardingTile from "../components/PushOnboardingTile";
import { version } from "../../package.json";

const FUSION_UNLOCK_SEEN_KEY = "ecorex_unlock_seen_fusion";

// Pon a true para volver a mostrar las tarjetas de Álbum y Amigos.
const SHOW_COMING_SOON_TILES = false;

export default function InicioPage() {
  const navigate = useAppNavigate();
  const { check: checkOnboarding, paid } = useOnboarding();
  const paidSeen = useRef(paid);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [fusionReady, setFusionReady] = useState<EligibleSpecies[]>([]);
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [energy, setEnergy] = useState<EnergyState | null>(null);
  const [missions, setMissions] = useState<MissionsState | null>(null);
  const [showFusionUnlockModal, setShowFusionUnlockModal] = useState(false);
  const [fusionProgress, setFusionProgress] = useState<EligibleSpecies[]>([]);
  const [fusionThreshold, setFusionThreshold] = useState(5);
  const [showWelcome, setShowWelcome] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const altarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  function toLoginIfUnauthorized(err: unknown) {
    if (err instanceof ApiError && err.status === 401) navigate("/login");
  }

  function loadProfile() {
    getMyProfile()
      .then((data) => {
        setProfile(data);
        // The intro is for brand-new accounts only: anyone who already has
        // cards is an existing player and never sees it.
        if (!hasSeenWelcome(data.user.id)) {
          if (data.totalDiscoveries === 0) setShowWelcome(true);
          else markWelcomeSeen(data.user.id);
        }
      })
      .catch(toLoginIfUnauthorized);
  }

  function loadEnergy() {
    getEnergy().then(setEnergy).catch(toLoginIfUnauthorized);
  }

  // Reads "Primeros pasos" (and collects the prize if the last step is done).
  // Runs on arrival and when a step is completed right here.
  function loadOnboarding() {
    checkOnboarding({ fresh: true }).then((state) => {
      if (state) setOnboarding(state);
    });
  }

  // The prize changes XP and energy: refresh the header, retire the checklist.
  useEffect(() => {
    if (paid === paidSeen.current) return;
    paidSeen.current = paid;
    loadProfile();
    loadEnergy();
    setOnboarding((state) => state && { ...state, rewardClaimed: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid]);

  useEffect(() => {
    getFuseEligible()
      .then((data) => {
        const unlocked = data.eligible.length > 0;
        setFusionReady(data.eligible);
        setFusionProgress(data.progress ?? []);
        if (data.threshold) setFusionThreshold(data.threshold);
        if (unlocked && !localStorage.getItem(FUSION_UNLOCK_SEEN_KEY)) {
          localStorage.setItem(FUSION_UNLOCK_SEEN_KEY, "1");
          setShowFusionUnlockModal(true);
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login");
      });
    loadProfile();
    loadEnergy();
    loadOnboarding();
    getMissions()
      .then(setMissions)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // The popup only ever shows once, so this takes the player to the altar the first time only.
  function goToAltar() {
    setShowFusionUnlockModal(false);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    altarRef.current?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  }

  const showChecklist = !!onboarding && onboarding.eligible && !onboarding.rewardClaimed;

  return (
    <div className="page">
      {showWelcome && profile && (
        <WelcomeFlow
          onFinish={() => {
            markWelcomeSeen(profile.user.id);
            setShowWelcome(false);
            navigate("/percibir");
          }}
        />
      )}
      {!showChecklist && <PushOnboardingTile />}
      {showFusionUnlockModal && (
        <FeatureUnlockModal
          icon="/icons/altar-fusion.webp"
          title="Altar de Fusión"
          onClose={() => setShowFusionUnlockModal(false)}
          onConfirm={goToAltar}
        />
      )}
      <img src="/logo/logo-ecorex.webp" alt="Ecorex" className="home-logo" fetchPriority="high" />

      {onboarding && showChecklist && <OnboardingChecklist
          state={onboarding}
          onGo={navigate}
          onChanged={loadOnboarding}
        />}

      {profile && <HomeHero profile={profile} energy={energy} streak={missions?.streak} now={now} />}

      <MissionsCard missions={missions} />
      <div ref={altarRef}>
        <FusionAltarCard
          eligible={fusionReady}
          next={fusionProgress[0]}
          threshold={fusionThreshold}
          onFuse={(speciesId) => navigate(speciesId ? `/fusion?speciesId=${speciesId}` : "/fusion")}
        />
      </div>

      {/* Álbum y Amigos: ocultos hasta que estén definidos y desarrollados. */}
      {SHOW_COMING_SOON_TILES && (
        <div className="grid grid-compact">
          <div className="card card-compact card-coming-soon" aria-label="Álbum, próximamente">
            <img className="card-icon" src="/icons/album.webp" alt="" />
            <strong>Álbum</strong>
            <span className="coming-soon-label">Próximamente</span>
          </div>
          <div className="card card-compact card-coming-soon" aria-label="Amigos, próximamente">
            <img className="card-icon" src="/icons/perfil.webp" alt="" />
            <strong>Amigos</strong>
            <span className="coming-soon-label">Próximamente</span>
          </div>
        </div>
      )}
      <p style={{ textAlign: "center", color: "#7fa98a", fontSize: "0.75rem" }}>v{version}</p>
    </div>
  );
}
