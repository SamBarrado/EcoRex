import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Slide {
  image: string;
  title: string;
  text: string;
}

// Premise copy follows docs/lore_world_bible_ecorex_v5.md §1–2 and is written
// to work from age 5: short sentences, no jargon beyond the Fractae. There is
// deliberately no "skip": it's three short screens and the only way out is
// through to the first pack.
const SLIDES: Slide[] = [
  {
    image: "/logo/logo-ecorex.png",
    title: "Hace 66 millones de años…",
    text: "Cuando los dinosaurios desaparecieron, sus emociones no se fueron con ellos. Quedaron atrapadas y dormidas, como fósiles, pero de sentimientos.",
  },
  {
    image: "/species-art/triceratops-umbra/balance.webp",
    title: "Los Fractae",
    text: "Son ocho emociones puras: Alegría, Tristeza, Furia, Miedo, Confianza, Asco, Sorpresa y Curiosidad. Para mostrarse necesitan un cuerpo, y solo conocen uno: el de un dinosaurio.",
  },
  {
    image: "/cards/sobre.png",
    title: "Tú puedes percibirlos",
    text: "Algo ha agrietado la barrera y tú eres de los pocos que lo notan. Percibe para encontrar cartas, completa el EcoDex y fusiona las repetidas. Tu energía se recupera con el tiempo.",
  },
];

export function WelcomeFlow({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  useLayoutEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Rendered into <body>: inside `.page` (position: relative + z-index) the
  // overlay would sit in that stacking context, under the bottom nav and FAB.
  return createPortal(
    <div className="welcome-flow" role="dialog" aria-modal="true" aria-label="Bienvenida a Ecorex">
      <div className="welcome-body">
        <img src={slide.image} alt="" className="welcome-image" draggable={false} />
        <h2 className="welcome-title">{slide.title}</h2>
        <p className="welcome-text">{slide.text}</p>
      </div>
      <div className="welcome-footer">
        <div className="welcome-dots" aria-hidden="true">
          {SLIDES.map((_, i) => (
            <span key={i} className={i === index ? "welcome-dot welcome-dot-active" : "welcome-dot"} />
          ))}
        </div>
        {isLast ? (
          <button onClick={onFinish}>Percibir mi primera carta</button>
        ) : (
          <button onClick={() => setIndex(index + 1)}>Siguiente</button>
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
