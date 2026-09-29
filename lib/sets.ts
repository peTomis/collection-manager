import { Set } from "@/types/mongodb";

// Eras of the (English) Pokémon TCG, each starting with the release of its first set, oldest first.
// Wizards of the Coast published every set until Skyridge (12 May 2003); EX Ruby & Sapphire (18 June 2003) was the first one after Nintendo took over.
export const SET_ERAS: { name: string; from: string }[] = [
  { name: "Wizards of the Coast", from: "1999-01-09" },
  { name: "EX", from: "2003-06-18" },
  { name: "Diamond & Pearl", from: "2007-05-23" },
  { name: "Platinum", from: "2009-02-11" },
  { name: "HeartGold & SoulSilver", from: "2010-02-10" },
  { name: "Black & White", from: "2011-04-25" },
  { name: "XY", from: "2014-02-05" },
  { name: "Sun & Moon", from: "2017-02-03" },
  { name: "Sword & Shield", from: "2020-02-07" },
  { name: "Scarlet & Violet", from: "2023-03-31" },
  { name: "Mega Evolution", from: "2025-09-26" },
];

const ERA_STARTS = SET_ERAS.map((era) => ({ ...era, start: Date.parse(era.from) }));

// Era of a set from its release date; sets without one are grouped as "Other"
export const setEra = (set: Set) => {
  if (!set.releasedAt) return "Other";
  return [...ERA_STARTS].reverse().find((era) => set.releasedAt >= era.start)?.name ?? SET_ERAS[0].name;
};

// Consecutive runs of sets from the same era, keeping the order of `sets`
export const groupByEra = (sets: Set[]) => {
  const groups: { era: string; sets: Set[] }[] = [];
  for (const set of sets) {
    const era = setEra(set);
    const last = groups[groups.length - 1];
    if (last?.era === era) last.sets.push(set);
    else groups.push({ era, sets: [set] });
  }
  return groups;
};
