// Libraries
import { useState } from "react";

// Types
import { Set } from "@/types/mongodb";
import { cn } from "@/lib/utils";

// Set logos live in public/sets, named after the set ("Base Set" → base_set.png). Not every set has one.
const SetIcon = ({ set, className }: { set: Set; className?: string }) => {
  const [missing, setMissing] = useState<string | null>(null);
  const src = `/sets/${set.name.toLowerCase().replaceAll(" ", "_")}.png`;

  return (
    <span className={cn("flex-none grid place-items-center", className)}>
      {missing !== src && <img src={src} alt="" className="object-contain w-full h-full" onError={() => setMissing(src)} />}
    </span>
  );
};

export default SetIcon;
