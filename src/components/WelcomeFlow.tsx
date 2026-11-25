import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Premise copy follows the World Bible (§1–2) and is written to work from age 5:
// short sentences, no jargon beyond the Fractae. There is deliberately no
// "skip": it's three short screens and the only way out is through to the first
// pack. Presented as an animated story (design chosen 2026-11-18): each scene
// has its own movement, a segmented progress bar on top, and swiping also moves.

type Scene = "pulse" | "orbit" | "pack";

interface Slide {
  scene: Scene;
  image: string;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    scene: "pulse",
    image: "/logo/logo-ecorex.webp",
    title: "Hace 66 millones de años…",
    text: "Cuando los dinosaurios desaparecieron, sus emociones no se fueron con ellos. Quedaron atrapadas y dormidas, como fósiles, pero de sentimientos.",
  },
  {
    scene: "orbit",
    image: "/species-art/triceratops-umbra/balance.webp",
    title: "Los Fractae",
    text: "Son ocho emociones puras: Alegría, Tristeza, Furia, Miedo, Confianza, Asco, Sorpresa y Curiosidad. Para mostrarse necesitan un cuerpo, y solo conocen uno: el de un dinosaurio.",
  },
  {
    scene: "pack",
    image: "/cards/sobre.webp",
    title: "Tú puedes percibirlos",
    text: "Algo ha agrietado la barrera y tú eres de los pocos que lo notan. Percibe para encontrar cartas, completa el EcoDex y fusiona las repetidas. Tu energía se recupera con el tiempo.",
  },
];

// One hue per Fractae (Alegría, Tristeza, Furia, Miedo, Confianza, Asco, Sorpresa, Curiosidad).
const FRACTAE_HUES = [48, 215, 5, 265, 172, 82, 32, 292];
const SWIPE_PX = 40;

function SceneArt({ slide }: { slide: Slide }) {
  switch (slide.scene) {
    case "pulse":
      return (
        <div className="story-pulse story-in" style={{ "--k": 0 } as React.CSSProperties} aria-hidden="true">
          <i />
          <i />
          <i />
          <img src={slide.image} alt="" draggable={false} />
        </div>
      );
    case "orbit":
      return (
        <div className="story-orbit-wrap story-in" style={{ "--k": 0 } as React.CSSProperties} aria-hidden="true">
          <div className="story-orbit">
            {FRACTAE_HUES.map((hue, k) => (
              <i key={hue} className="story-orb" style={{ "--oh": hue, "--a": k * 45 } as React.CSSProperties} />
            ))}
          </div>
          <img className="story-orbit-img" src={slide.image} alt="" draggable={false} />
        </div>
      );
    case "pack":
      return (
        <>
          <div className="story-packshine story-in" style={{ "--k": 0 } as React.CSSProperties} aria-hidden="true">
            <img src={slide.image} alt="" draggable={false} />
          </div>
          <div className="story-bolts story-in" style={{ "--k": 1 } as React.CSSProperties} aria-hidden="true">
            {[0, 1, 2].map((k) => (
              <i key={k} style={{ "--i": k } as React.CSSProperties} />
            ))}
          </div>
        </>
      );
  }
}

export function WelcomeFlow({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  useLayoutEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function go(next: number) {
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
  }

  // Swiping only moves between scenes (never out of the flow): like the button,
  // it can't skip past the last scene.
  function onTouchEnd(x: number) {
    if (touchX.current === null) return;
    const dx = x - touchX.current;
    touchX.current = null;
    if (dx < -SWIPE_PX) go(index + 1);
    else if (dx > SWIPE_PX) go(index - 1);
  }

  // Rendered into <body>: inside `.page` (position: relative + z-index) the
  // overlay would sit in that stacking context, under the bottom nav.
  return createPortal(
    <div className="welcome-flow" role="dialog" aria-modal="true" aria-label="Bienvenida a Ecorex">
      <div className="welcome-prog" aria-hidden="true">
        {SLIDES.map((_, i) => (
          <i key={i} className={i <= index ? "on" : ""} />
        ))}
      </div>
      <div
        className="welcome-body"
        key={index}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
      >
        <SceneArt slide={slide} />
        <h2 className="welcome-title story-in" style={{ "--k": slide.scene === "pack" ? 2 : 1 } as React.CSSProperties}>
          {slide.title}
        </h2>
        <p className="welcome-text story-in" style={{ "--k": slide.scene === "pack" ? 3 : 2 } as React.CSSProperties}>
          {slide.text}
        </p>
      </div>
      <div className="welcome-footer">
        {isLast ? (
          <button onClick={onFinish}>Percibir mi primera carta</button>
        ) : (
          <button onClick={() => go(index + 1)}>Siguiente</button>
        )}
      </div>
    </div>,
    document.body
  );
}

const SEEN_KEY_PREFIX = "ecorex_welcome_seen_";

export function hasSeenWelcome(userId: number): boolean {
  try {
    return localStorage.getItem(SEEN_KEY_PREFIX + userId) === "1";
  } catch {
    return false;
  }
}

export function markWelcomeSeen(userId: number) {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX + userId, "1");
  } catch {
    // Storage unavailable: worst case the intro shows again next visit.
  }
}
