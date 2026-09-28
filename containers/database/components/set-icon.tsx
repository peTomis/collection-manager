// Libraries
import { useState } from "react";

// Types
import { Set } from "@/types/mongodb";
import { cn } from "@/lib/utils";

// Folders of sets that have no logo, so it isn't requested
const WITHOUT_LOGO = new globalThis.Set(["base_set"]);

// Set logos live in public/sets/<set>/logo.png, the folder named after the set ("Base Set" → base_set). Not every set has one.
const SetIcon = ({ set, className }: { set: Set; className?: string }) => {
  const [missing, setMissing] = useState<string | null>(null);
  const folder = set.name.toLowerCase().replaceAll(" ", "_");
  const src = WITHOUT_LOGO.has(folder) ? null : `/sets/${folder}/logo.png`;

  return (
    <span className={cn("relative flex-none", className)}>
      {src && missing !== src && <img src={src} alt="" className="absolute inset-0 object-contain w-full h-full" onError={() => setMissing(src)} />}
    </span>
  );
};

export default SetIcon;
