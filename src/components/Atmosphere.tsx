import { CSSProperties, useMemo } from "react";
import { useLocation } from "react-router-dom";
import BackgroundFx from "./BackgroundFx";
import { usePlayer } from "../lib/PlayerContext";
import type { EnergyState } from "../lib/api";

// "Atmósfera viva" (design chosen 2026-11-18): the global background. It
// changes with the screen (dawn / mystery / museum / calm), dims when the
// player is out of energy, glows when it is full, and flashes on good events.
// Everything is gradients + transform/opacity: no blur filters on big layers.

export type AtmosphereContext = "inicio" | "percibir" | "coleccion" | "perfil";
export type EnergyMood = "full" | "mid" | "empty";

export function atmosphereContext(pathname: string): AtmosphereContext {
  if (pathname.startsWith("/percibir")) return "percibir";
  if (pathname.startsWith("/coleccion")) return "coleccion";
  if (pathname.startsWith("/perfil")) return "perfil";
  return "inicio";
}

/** 0..1 share of energy left. Unknown (not loaded / logged out) and unlimited count as full. */
export function energyFraction(energy: EnergyState | null): number {
  if (!energy || energy.unlimited || energy.max <= 0) return 1;
  return Math.max(0, Math.min(1, energy.remaining / energy.max));
}

export function energyMood(energy: EnergyState | null): EnergyMood {
  const f = energyFraction(energy);
  return f >= 1 ? "full" : f <= 0 ? "empty" : "mid";
}

// Deterministic motes (no Math.random during render: stable between renders and tests).
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOTE_COUNT = 14;

export default function Atmosphere() {
  const { pathname } = useLocation();
  const { energy, hit } = usePlayer();
  const motes = useMemo(() => {
    const r = mulberry32(20261118);
    return Array.from({ length: MOTE_COUNT }, (_, i) => ({
      id: i,
      style: {
        left: `${(r() * 96).toFixed(1)}%`,
        top: `${(8 + r() * 84).toFixed(1)}%`,
        "--dx": `${Math.round((r() - 0.5) * 60)}px`,
        "--dy": `${Math.round((r() - 0.5) * 70)}px`,
        "--wd": `${(7 + r() * 7).toFixed(1)}s`,
        "--bd": `${(2.6 + r() * 3).toFixed(1)}s`,
        "--dl": `-${(r() * 8).toFixed(1)}s`,
      } as CSSProperties,
    }));
  }, []);

  const style = { "--energy": energyFraction(energy).toFixed(2) } as CSSProperties;

  return (
    <div className="atm" data-ctx={atmosphereContext(pathname)} data-energy={energyMood(energy)} style={style} aria-hidden="true">
      <div className="atm-layers">
        <i className="atm-c atm-c-inicio" />
        <i className="atm-c atm-c-percibir" />
        <i className="atm-c atm-c-coleccion" />
        <i className="atm-c atm-c-perfil" />
        <i className="atm-spot" />
        <div className="atm-dust">
          {motes.map((m) => (
            <i key={m.id} style={m.style} />
          ))}
        </div>
        <i className="atm-shine" />
      </div>
      <BackgroundFx />
      {hit && <i key={hit.id} className="atm-hit" style={{ "--hit": hit.color } as CSSProperties} />}
    </div>
  );
}
