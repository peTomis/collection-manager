// Components
import SetIcon from "./set-icon";

// Types
import { Set } from "@/types/mongodb";
import { eur } from "@/lib/format";

interface SetHeaderProps {
  set: Set;
  owned: { count: number; value: number };
}

const releaseDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const SetHeader = ({ set, owned }: SetHeaderProps) => {
  const released = set.releasedAt ? new Date(set.releasedAt) : null;
  const counts = [set.cards && `${set.cards} cards`, set.sealed && `${set.sealed} sealed`];

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
            {[released && `Released ${releaseDate.format(released)}`, set.cards && `${set.cards} cards`, set.sealed && `${set.sealed} sealed products`].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>
      {owned.count > 0 && (
        <div className="hidden ml-auto text-right lg:block">
          <div className="text-xs font-medium text-ink-muted">You own from this set</div>
          <div className="font-display font-medium text-[22px] tracking-[-0.02em] mt-1 whitespace-nowrap">
            {owned.count} {owned.count === 1 ? "item" : "items"} · {eur(owned.value)}
          </div>
        </div>
      )}
    </div>
  );
};

export default SetHeader;
