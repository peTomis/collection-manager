// Libraries
import { useMemo } from "react";

// Components
import SetIcon from "./set-icon";

// Types
import { CardVariantType, Language, Set } from "@/types/mongodb";
import { setSize } from "./set-rail";
import { Catalog, priceKey } from "../use-set-catalog";
import { VARIANT_LABELS } from "@/lib/items";
import { eur } from "@/lib/format";
import { getPrice } from "@/utils/utils";

interface SetHeaderProps {
  set: Set;
  catalog: Catalog | null;
}

interface SetVersion {
  type: CardVariantType;
  language: Language;
  value: number;
  cards: number;
}

// Value of all the set's cards in each version (variant and language), most valuable first. Cards without a price in a version add nothing to it.
const setVersions = (catalog: Catalog) => {
  const versions = new Map<string, SetVersion>();
  for (const card of catalog.cards)
    for (const { type, language } of card.variants) {
      const price = catalog.prices.get(priceKey(card._id, language, type));
      const value = price ? getPrice(price) : 0;
      if (!value) continue;
      const key = `${type}|${language}`;
      const version = versions.get(key) ?? { type, language, value: 0, cards: 0 };
      versions.set(key, { ...version, value: version.value + value, cards: version.cards + 1 });
    }
  return [...versions.values()].sort((a, b) => b.value - a.value);
};

const releaseDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const SetHeader = ({ set, catalog }: SetHeaderProps) => {
  const size = setSize(set);
  const versions = useMemo(() => (catalog ? setVersions(catalog) : []), [catalog]);
  const released = set.releasedAt ? new Date(set.releasedAt) : null;
  const { cards, sealed } = set;
  const counts = [cards && `${cards} cards`, sealed && `${sealed} sealed`];

  return (
    <div className="flex items-center flex-none gap-5">
      <SetIcon set={set} className="hidden lg:grid w-[84px] h-12" />
      <div className="min-w-0">
        <h1 className="font-display font-semibold text-[30px] lg:text-[40px] leading-[1.05] tracking-[-0.03em] truncate" title={set.name}>
          {set.name}
        </h1>
        <div className="mt-1 lg:mt-1.5 text-[13px] lg:text-sm text-ink-muted">
          <span className="lg:hidden">{[released?.getFullYear(), ...counts].filter(Boolean).join(" · ")}</span>
          <span className="hidden lg:inline">
            {[released && `Released ${releaseDate.format(released)}`, cards && `${cards} cards`, sealed && `${sealed} sealed products`].filter(Boolean).join(" · ")}
          </span>
        </div>
        {versions.length > 0 && (
          <dl className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[13px] lg:text-sm" aria-label="Set value by version">
            {versions.map((v) => (
              <div key={`${v.type}|${v.language}`} className="flex items-baseline gap-1.5 whitespace-nowrap">
                <dt className="text-ink-muted">
                  {VARIANT_LABELS[v.type] ?? v.type} {v.language.toUpperCase()}
                </dt>
                <dd className="font-geist-mono font-medium">{eur(v.value)}</dd>
                {/* Not every card has a price in every version */}
                {v.cards < catalog!.cards.length && (
                  <dd className="text-xs text-ink-muted">
                    ({v.cards}/{catalog!.cards.length})
                  </dd>
                )}
              </div>
            ))}
          </dl>
        )}
      </div>
      {size > 0 && (
        <div className="hidden ml-auto text-right lg:block">
          <div className="text-xs font-medium text-ink-muted">In this set</div>
          <div className="font-display font-medium text-[22px] tracking-[-0.02em] mt-1 whitespace-nowrap">
            {size} {size === 1 ? "item" : "items"}
          </div>
        </div>
      )}
    </div>
  );
};

export default SetHeader;
