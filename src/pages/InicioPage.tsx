import { useEffect, useState } from "react";
import { useAppNavigate } from "../lib/navigation";
import {
  getFuseEligible,
  getMyProfile,
  getEnergy,
  getMissions,
  getOnboarding,
  claimOnboarding,
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
import { usePlayer } from "../lib/PlayerContext";
import { useNotifications } from "../lib/NotificationsContext";
import { useAchievements } from "../lib/AchievementsContext";
import { FIRST_STEPS_ACHIEVEMENT } from "../lib/achievements";
import { FusionProgressCard } from "../components/FusionProgressCard";
import { WelcomeFlow, hasSeenWelcome, markWelcomeSeen } from "../components/WelcomeFlow";
import PushOnboardingTile from "../components/PushOnboardingTile";
import { version } from "../../package.json";

const FUSION_UNLOCK_SEEN_KEY = "ecorex_unlock_seen_fusion";

// Pon a true para volver a mostrar las tarjetas de Álbum y Amigos.
const SHOW_COMING_SOON_TILES = false;

export default function InicioPage() {
  const navigate = useAppNavigate();
  const { refresh: refreshPlayer } = usePlayer();
  const { refetch: refetchNotifications } = useNotifications();
  const { announce } = useAchievements();
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [fusionUnlocked, setFusionUnlocked] = useState(false);
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [energy, setEnergy] = useState<EnergyState | null>(null);
  const [missions, setMissions] = useState<MissionsState | null>(null);
  const [showFusionUnlockModal, setShowFusionUnlockModal] = useState(false);
  const [fusionProgress, setFusionProgress] = useState<EligibleSpecies[]>([]);
  const [fusionThreshold, setFusionThreshold] = useState(5);
  const [showWelcome, setShowWelcome] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getFuseEligible()
      .then((data) => {
        const unlocked = data.eligible.length > 0;
        setFusionUnlocked(unlocked);
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
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login");
      });
    getEnergy()
      .then(setEnergy)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login");
      });
    // "Primeros pasos": when the last step is done, collect the prize (the
    // server re-checks it and pays once) and celebrate with a medal.
    getOnboarding()
      .then((state) => {
        setOnboarding(state);
        if (!state.eligible || state.rewardClaimed || !state.steps.every((s) => s.done)) return;
        claimOnboarding()
          .then((result) => {
            if (!result.claimed) return;
            setOnboarding({ ...state, rewardClaimed: true });
            refreshPlayer();
            refetchNotifications();
            void announce([FIRST_STEPS_ACHIEVEMENT]);
          })
          .catch(() => {});
      })
      .catch(() => {});
    getMissions()
      .then(setMissions)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

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
        />
      )}
      <img src="/logo/logo-ecorex.webp" alt="Ecorex" className="home-logo" fetchPriority="high" />

      {onboarding && showChecklist && <OnboardingChecklist state={onboarding} onGo={navigate} />}

      {profile && <HomeHero profile={profile} energy={energy} streak={missions?.streak} now={now} />}

      <MissionsCard missions={missions} />
      <FusionProgressCard species={fusionProgress[0]} threshold={fusionThreshold} />

      <div className="grid grid-compact">
        <div
          className={fusionUnlocked ? "card card-clickable card-altar card-altar-unlocked" : "card card-altar"}
          role={fusionUnlocked ? "button" : undefined}
          tabIndex={fusionUnlocked ? 0 : undefined}
          onClick={() => fusionUnlocked && navigate("/fusion")}
          onKeyDown={(e) => fusionUnlocked && (e.key === "Enter" || e.key === " ") && navigate("/fusion")}
        >
          <img className="card-icon" src="/icons/altar-fusion.webp" alt="" />
          <div className="card-altar-text">
            <strong>Altar de Fusión {!fusionUnlocked && "🔒"}</strong>
            <span className="card-altar-hint">
              {fusionUnlocked ? `Fusiona ${fusionThreshold} cartas Balance en una nueva` : "Aún bloqueado"}
            </span>
          </div>
        </div>
        {/* Álbum y Amigos: ocultos hasta que estén definidos y desarrollados. */}
        {SHOW_COMING_SOON_TILES && (
          <>
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
          </>
        )}
      </div>
      <p style={{ textAlign: "center", color: "#7fa98a", fontSize: "0.75rem" }}>v{version}</p>
    </div>
  );
}
