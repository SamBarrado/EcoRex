import { useLayoutEffect, useRef, useState } from "react";
import { Card } from "./Card";

const CARD_NATURAL_WIDTH = 300;

export interface CardThumbProps {
  imageUrl: string;
  commonName: string;
  scientificName: string;
  rarityTier: { slug: string; name: string };
  fractaeChildName?: string;
  lorePhrase?: string;
  glowColor: string;
}

export function CardThumb({
  imageUrl,
  commonName,
  scientificName,
  rarityTier,
  fractaeChildName,
  lorePhrase,
  glowColor,
}: CardThumbProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    function update() {
      if (!outer) return;
      setScale(outer.offsetWidth > 0 ? outer.offsetWidth / CARD_NATURAL_WIDTH : 1);
    }

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(outer);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="card-thumb">
      <div className="card-thumb-inner" style={{ width: CARD_NATURAL_WIDTH, transform: `scale(${scale})` }}>
        <Card
          facing="front"
          rotateY={0}
          transition="none"
          imageUrl={imageUrl}
          commonName={commonName}
          scientificName={scientificName}
          rarityTier={rarityTier}
          fractaeChildName={fractaeChildName}
          lorePhrase={lorePhrase}
          glowColor={glowColor}
          auraOpacity={0.35}
        />
      </div>
    </div>
  );
}
