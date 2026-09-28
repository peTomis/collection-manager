// Libraries
import { useState } from "react";

// Utils
import { cardImage } from "@/lib/tcgdex";

// TCGdex card image covering its (relative) placeholder once loaded; removes itself if TCGdex has no image for the card
const CardArt = ({ image, alt }: { image: string; alt: string }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={cardImage(image, "low")}
      srcSet={`${cardImage(image, "low")} 1x, ${cardImage(image, "high")} 2x`}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="absolute inset-0 object-cover w-full h-full"
    />
  );
};

export default CardArt;
