// Components
import SetIcon from "./set-icon";

// Types
import { Set } from "@/types/mongodb";
import { setSize } from "./set-rail";

interface SetHeaderProps {
  set: Set;
}

const releaseDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const SetHeader = ({ set }: SetHeaderProps) => {
  const size = setSize(set);
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
