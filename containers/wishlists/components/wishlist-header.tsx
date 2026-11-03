import EditButton from "@/components/atoms/edit-button";
// Components
import LinkedList from "@/components/organisms/linked-list";
import ListName from "@/components/organisms/list-name";

// State
import { WishlistWithItems } from "@/types/mongodb";
import { summarizeWishlist } from "@/lib/items";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface WishlistHeaderProps {
  wishlist: WishlistWithItems;
  onDelete: () => void;
}

const WishlistHeader = ({ wishlist, onDelete }: WishlistHeaderProps) => {
  const t = useT();
  const summary = summarizeWishlist(wishlist);

  const stats = [
    { label: t.wishlists.costToComplete, value: eur(summary.value) },
    { label: t.wishlists.atTargets, value: eur(summary.targetValue), muted: true },
    { label: t.common.items, value: String(summary.count) },
  ];

  return (
    <div className="flex-none">
      <div className="items-center justify-between hidden lg:flex text-[13px] text-ink-muted">
        <span className="min-w-0 truncate">
          {t.nav.wishlist} / {wishlist.name}
        </span>
        <EditButton type="button" onClick={onDelete} className="flex-none ml-4 font-medium cursor-pointer hover:text-loss">
          {t.wishlists.deleteWishlist}
        </EditButton>
      </div>

      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:mt-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between min-w-0 gap-3">
            <ListName key={wishlist._id} kind="wishlist" list={wishlist} />
            <EditButton type="button" onClick={onDelete} className="flex-none mt-2 text-[13px] font-medium text-ink-muted lg:hidden">
              {t.common.delete}
            </EditButton>
          </div>
          <LinkedList kind="wishlist" list={wishlist} />
        </div>

        {/* Mobile: one card with the cost to complete */}
        <div className="flex items-end justify-between p-3.5 border lg:hidden border-line rounded-xl bg-paper">
          <div>
            <div className="text-xs font-medium text-ink-muted">{t.wishlists.costToComplete}</div>
            <div className="font-display font-medium text-[26px] tracking-[-0.02em] mt-[3px]">{eur(summary.value)}</div>
          </div>
          <div className="text-xs text-right text-ink-muted">
            {summary.label}
            <br />
            {t.wishlists.targets(eur(summary.targetValue))}
          </div>
        </div>

        {/* Desktop: a row of right-aligned figures */}
        <div className="hidden gap-8 lg:flex">
          {stats.map((s) => (
            <div key={s.label} className="text-right">
              <div className="text-xs font-medium text-ink-muted">{s.label}</div>
              <div className={cn("font-display font-medium text-[28px] tracking-[-0.02em] mt-1 whitespace-nowrap", s.muted && "text-ink-muted")}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistHeader;
