// Libraries
import { useState } from "react";

// Utils
import { cn } from "@/lib/utils";

// Local product image (public/sets/<set>/…), fitted whole (never cropped) on a plain background since shapes and transparency vary.
// Covers its (relative) placeholder once loaded; removes itself if the file is missing.
const SealedArt = ({ path, alt, className }: { path: string; alt: string; className?: string }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // Positioned on the slot itself: sized by a grid cell, h-full doesn't resolve and the image overflows (and gets cropped)
    <img src={path} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn("absolute inset-0 w-full h-full object-contain bg-paper", className)} />
  );
};

export default SealedArt;
