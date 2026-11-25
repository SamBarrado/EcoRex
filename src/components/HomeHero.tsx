import type { EnergyState, ProfileStats, StreakState } from "../lib/api";
import { avatarUrl } from "../lib/avatars";
import { formatEnergyCountdown } from "../lib/energy";
import { streakLabel } from "../lib/streak";

// Home "panel de misión" header (design chosen 2026-11-18): who you are and
// where you stand (level ring + avatar), then four at-a-glance chips.

function Chip({ label, ariaLabel, children }: { label: string; ariaLabel: string; children: React.ReactNode }) {
  return (
    <div className="home-chip" role="group" aria-label={ariaLabel}>
      <span className="home-chip-value">{children}</span>
      <small>{label}</small>
    </div>
  );
}

export function HomeHero({
  profile,
  energy,
  streak,
  now,
}: {
  profile: ProfileStats;
  energy: EnergyState | null;
  streak: StreakState | null | undefined;
  now: number;
}) {
  const { user, level, xpIntoLevel, xpForNextLevel, title } = profile;
  const pct = xpForNextLevel ? Math.max(0, Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))) : 100;
  const bolts = energy && !energy.unlimited ? Array.from({ length: energy.max }, (_, i) => i < energy.remaining) : [];
  const waiting = energy && !energy.unlimited && energy.remaining === 0 && energy.resetAt !== null;

  return (
    <section className="home-hero">
      <div className="home-hero-top">
        <div className="home-ring">
          <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
            <circle cx="32" cy="32" r="28" className="home-ring-track" />
            <circle cx="32" cy="32" r="28" className="home-ring-fill" pathLength="100" style={{ strokeDasharray: `${pct} 100` }} />
          </svg>
          {user.avatar ? (
            <img src={avatarUrl(user.avatar)} alt="" />
          ) : (
            <span className="home-ring-initial" aria-hidden="true">{user.display_name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="home-hero-text">
          <b>{user.display_name}</b>
          <span>
            Nivel {level}
            {title ? ` · ${title}` : ""}
          </span>
          <div className="level-progress-bar">
            <div className="level-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <small>{xpForNextLevel === null ? "MAX" : `${xpIntoLevel}/${xpForNextLevel} XP`}</small>
        </div>
      </div>

      <div className="home-chips">
        <Chip label="Energía" ariaLabel={energy ? (energy.unlimited ? "Energía ilimitada" : `Energía ${energy.remaining} de ${energy.max}`) : "Energía"}>
          {!energy ? (
            "–"
          ) : energy.unlimited ? (
            "∞"
          ) : (
            <span className="home-bolts" aria-hidden="true">
              {bolts.map((on, i) => (
                <i key={i} className={on ? "on" : ""} />
              ))}
            </span>
          )}
        </Chip>
        <Chip label="Racha" ariaLabel={streak ? `Racha: ${streakLabel(streak.days)}` : "Racha"}>
          <span className={`home-flame${streak && streak.days > 0 && !streak.activeToday ? " home-flame-risk" : ""}`}>🔥 {streak?.days ?? 0}</span>
        </Chip>
        <Chip label="Especies" ariaLabel={`Especies descubiertas ${profile.speciesDiscoveredCount} de ${profile.speciesTotalCount}`}>
          {profile.speciesDiscoveredCount}
          <small>/{profile.speciesTotalCount}</small>
        </Chip>
        <Chip label="Registros" ariaLabel={`Registros del EcoDex ${profile.registeredCount} de ${profile.registeredTotalCount}`}>
          {profile.registeredCount}
          <small>/{profile.registeredTotalCount}</small>
        </Chip>
      </div>

      {waiting && energy?.resetAt != null && <p className="home-hint">⚡ +1 de energía en {formatEnergyCountdown(energy.resetAt, now)}</p>}
      {streak && streak.days > 0 && !streak.activeToday && <p className="home-hint home-hint-warn">¡Juega hoy para no perder tu racha de {streakLabel(streak.days)}!</p>}
    </section>
  );
}
