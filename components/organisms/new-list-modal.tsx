import EditButton from "@/components/atoms/edit-button";
// Libraries
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Components
import SetIcon from "@/containers/database/components/set-icon";
import SetPicker from "@/components/organisms/set-picker";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { createBinder } from "@/redux/slices/binders";
import { createWishlist } from "@/redux/slices/wishlists";
import { CardVariantType, Language, Set } from "@/types/mongodb";
import { useSetCatalog } from "@/containers/database/use-set-catalog";
import { setCardCount, setSealedCount } from "@/containers/database/components/set-rail";
import { setEra } from "@/lib/sets";
import { VARIANT_LABELS } from "@/lib/items";
import {
  ListType,
  Scope,
  availableLanguages as languagesOf,
  availableVersions as versionsOf,
  candidatesOf,
  listItems,
  newListSummary,
  ownedCountBySet,
  ownedPriceIds,
  parseDiscount,
  pickAvailable,
  selectCandidates,
  setBinderOf,
  toggle,
  wishlistGetsItems as getsItems,
} from "@/lib/new-list";
import { LIMITS } from "@/lib/limits";
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type Source = "empty" | "set";
type AddAs = "missing" | "owned";

interface NewListModalProps {
  open: boolean;
  onClose: () => void;
  type: ListType;
  // Shows the Binder / Wishlist switch: off on the binders and wishlists pages, where the type is the page's
  switchable?: boolean;
  // Opens on "From a set" with this set picked, e.g. from the Database
  set?: Set;
}

// New binder or wishlist, started empty or pre-filled with a whole set. Full screen on mobile, a dialog on desktop.
const NewListModal = ({ open, onClose, type: initialType, switchable, set: initialSet }: NewListModalProps) => {
  const [shown, setShown] = useState(false);
  const [type, setType] = useState<ListType>(initialType);
  const [source, setSource] = useState<Source>("empty");
  const [name, setName] = useState<string | null>(null);
  const [setId, setSetId] = useState<string | undefined>();
  const [scope, setScope] = useState<Scope>("cards");
  const [languages, setLanguages] = useState<Language[]>([Language.ENGLISH]);
  const [versions, setVersions] = useState<CardVariantType[]>([CardVariantType.REGULAR]);
  const [addAs, setAddAs] = useState<AddAs>("missing");
  const [targetPercent, setTargetPercent] = useState("10");
  const [skipOwned, setSkipOwned] = useState(false);
  const [saving, setSaving] = useState(false);
  // Also create the other kind of list, linked to this one
  const [linked, setLinked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The set picker is open on top of the modal
  const [picking, setPicking] = useState(false);
  const changeSet = useRef<HTMLButtonElement>(null);

  const user = useSelector((state) => state.user.user) ?? "";
  const { sets: setsByRelease } = useSelector((state) => state.sets);
  const { binders } = useSelector((state) => state.binders);
  const dispatch = useDispatch();
  const router = useRouter();

  // Start from the button the user pressed each time the modal opens
  if (open && !shown) {
    setShown(true);
    setType(initialType);
    setSource(initialSet ? "set" : "empty");
    setSetId(initialSet?._id);
    setName(null);
    setScope("cards");
    setLanguages([Language.ENGLISH]);
    setVersions([CardVariantType.REGULAR]);
    setAddAs("missing");
    setTargetPercent("10");
    setSkipOwned(false);
    setLinked(false);
    setError(null);
    setPicking(false);
  }

  const close = () => {
    setShown(false);
    onClose();
  };

  // Newest first, as in the Database; the newest set until the user picks one
  const sets = useMemo(() => [...setsByRelease].reverse(), [setsByRelease]);
  const set = sets.find((s) => s._id === setId) ?? initialSet ?? sets[0];
  const fromSet = source === "set" && !!set;
  const isBinder = type === "binder";
  const missing = isBinder && addAs === "missing";
  const other = isBinder ? "wishlist" : "binder";
  const wishlistGetsItems = getsItems({ type, linked, missing });

  const catalog = useSetCatalog(user || null, open && fromSet ? set._id : undefined);

  // What the set has to offer, and what of it is chosen (the first option when nothing chosen is on offer)
  const availableLanguages = useMemo(() => (catalog ? languagesOf(catalog, scope) : []), [catalog, scope]);
  const langs = pickAvailable(languages, availableLanguages.map((l) => l.value));
  const availableVersions = useMemo(() => (catalog ? versionsOf(catalog, langs) : []), [catalog, langs.join()]);
  const vers = pickAvailable(versions, availableVersions);

  const ownedBySet = useMemo(() => ownedCountBySet(binders), [binders]);
  const ownedIds = useMemo(() => ownedPriceIds(binders), [binders]);
  const { toAdd, ownedCount, withoutPrice, total } = selectCandidates(catalog && fromSet ? candidatesOf(catalog, scope, langs, vers) : [], ownedIds, skipOwned);
  const discount = parseDiscount(targetPercent);

  // A list made from a set is named after it
  const suggestedName = fromSet ? set.name : "";
  const finalName = (name ?? suggestedName).trim();
  const loading = fromSet && !catalog;
  const tooMany = toAdd.length > LIMITS.ITEMS_PER_LIST;
  const valid = !!finalName && !loading && !tooMany && discount !== null && (!fromSet || toAdd.length > 0);

  const summary = newListSummary({ type, missing, linked, set: fromSet ? set : undefined, loading, toAdd: toAdd.length, total, withoutPrice });

  const save = async () => {
    if (!valid || !user || saving) return;
    setSaving(true);
    setError(null);
    const { binderItems, wishlistItems } = listItems(toAdd, { type, missing, linked, discount: discount ?? 0 });
    const setBinder = fromSet ? setBinderOf(set._id, scope) : undefined;

    const id = await dispatch(isBinder ? createBinder(user, finalName, setBinder, binderItems) : createWishlist(user, finalName, wishlistItems));
    // The linked list comes second, pointing at the first
    const mirrored = !id || !linked || !!(await dispatch(isBinder ? createWishlist(user, finalName, wishlistItems, id) : createBinder(user, finalName, setBinder, binderItems, id)));
    setSaving(false);
    if (!id) return setError(`Couldn't create the ${type}. Try again in a moment.`);
    if (!mirrored) return setError(`The ${type} was created, but not its linked ${other}.`);
    close();
    const page = isBinder ? "/binders" : "/wishlists";
    if (router.pathname !== page) router.push(page);
  };

  const cta = saving ? "Creating…" : isBinder ? "Create binder" : "Create wishlist";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(29,27,24,.4)] dark:bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            fontVariables,
            "fixed inset-0 z-50 flex flex-col overflow-hidden bg-paper font-geist text-ink pt-[env(safe-area-inset-top)]",
            "lg:inset-auto lg:top-20 lg:left-1/2 lg:-translate-x-1/2 lg:w-[640px] lg:max-h-[calc(100dvh-120px)] lg:pt-0 lg:rounded-[18px] lg:border lg:border-line lg:shadow-[0_40px_80px_-20px_rgba(29,27,24,.5)]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-center justify-between flex-none h-[60px] pl-4 pr-2 border-b border-line lg:h-auto lg:py-5 lg:pl-7 lg:pr-5">
            <DialogPrimitive.Title className="font-display font-semibold text-xl lg:text-[22px] tracking-[-0.02em]">{isBinder ? "New binder" : "New wishlist"}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="grid w-11 h-11 place-items-center text-[22px] cursor-pointer lg:w-9 lg:h-9 lg:text-lg lg:border lg:border-line lg:rounded-lg hover:bg-chip"
            >
              ×
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col flex-1 min-h-0 gap-[18px] p-4 overflow-y-auto lg:gap-[22px] lg:px-7 lg:py-6">
            {switchable && (
              <div className="grid grid-cols-2 gap-0.5 p-[3px] border border-line rounded-[10px] bg-canvas">
                {(["binder", "wishlist"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn("h-10 lg:h-9 rounded-[7px] text-sm font-medium cursor-pointer", t === type ? "bg-fill text-on-fill" : "text-ink-muted hover:text-ink")}
                  >
                    {t === "binder" ? "Binder" : "Wishlist"}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-[18px] lg:grid-cols-[minmax(0,1fr)_180px] lg:gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium">
                Name
                <input
                  autoFocus
                  value={name ?? suggestedName}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                  maxLength={LIMITS.NAME_LENGTH}
                  placeholder={isBinder ? "e.g. Base Set 1999" : "e.g. Chase list"}
                  className="h-12 lg:h-[42px] px-3.5 lg:px-3 rounded-[10px] lg:rounded-[9px] border-[1.5px] border-line bg-paper text-base lg:text-[15px] font-normal text-ink placeholder:text-ink-muted outline-none focus:border-ink"
                />
              </label>
              <div className="flex flex-col gap-1.5 text-[13px] font-medium">
                Game
                <span className="flex items-center gap-2 h-12 lg:h-[42px] px-3.5 lg:px-3 rounded-[10px] lg:rounded-[9px] border border-line text-base lg:text-[15px] font-normal">
                  <span className="w-2 h-2 rounded-full bg-gold" />
                  Pokémon
                </span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-[13px] font-medium">Start with</div>
              <div className="grid gap-2 lg:grid-cols-2 lg:gap-2.5">
                {(
                  [
                    ["empty", "Empty", "Add items one by one"],
                    ["set", "From a set", "Pre-fill with a whole set"],
                  ] as const
                ).map(([value, label, sub]) => {
                  const active = value === source;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSource(value)}
                      className={cn(
                        "flex items-center gap-3 min-h-14 px-3.5 text-left rounded-[11px] border-[1.5px] cursor-pointer lg:items-start lg:gap-2.5 lg:px-4 lg:py-3.5",
                        active ? "border-ink bg-paper" : "border-line",
                      )}
                    >
                      <span className={cn("grid flex-none w-[18px] h-[18px] lg:w-4 lg:h-4 lg:mt-0.5 rounded-full border-[1.5px] place-items-center", active ? "border-ink" : "border-line")}>
                        <span className={cn("w-[9px] h-[9px] lg:w-2 lg:h-2 rounded-full", active && "bg-ink")} />
                      </span>
                      <span>
                        <span className="block text-[15px] font-medium">{label}</span>
                        <span className="block text-xs lg:text-[13px] text-ink-muted lg:mt-1">{sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="button" onClick={() => setLinked((l) => !l)} className="flex items-start gap-3 text-left cursor-pointer">
              <span
                className={cn(
                  "grid flex-none w-5 h-5 lg:w-[18px] lg:h-[18px] mt-px rounded-[5px] border-[1.5px] border-ink place-items-center text-paper text-xs font-semibold",
                  linked && "bg-ink",
                )}
              >
                {linked && "✓"}
              </span>
              <span>
                <span className="block text-sm lg:text-[15px] font-medium">Also create a linked {other}</span>
                <span className="block mt-0.5 text-xs lg:text-[13px] text-ink-muted">
                  {isBinder
                    ? "It holds this binder's missing items: mark one owned and it leaves the wishlist, remove it from the wishlist and the binder stops tracking it."
                    : "It tracks these items as missing: remove one here and it leaves the binder, mark it owned there and it leaves this wishlist."}
                </span>
              </span>
            </button>

            {fromSet && (
              <div className="flex flex-col gap-3.5 p-3.5 border lg:gap-4 lg:p-[18px] rounded-xl bg-canvas border-line">
                <div className="flex items-center gap-2.5 min-h-11 lg:gap-3">
                  <SetIcon set={set} className="w-11 h-[26px] lg:w-[52px] lg:h-[30px]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium truncate">{set.name}</div>
                    <div className="text-xs text-ink-muted">
                      <span className="hidden lg:inline">{[setEra(set), set.releasedAt && new Date(set.releasedAt).getFullYear()].filter(Boolean).join(" · ")} · </span>
                      {`${setCardCount(set)} cards · ${setSealedCount(set)} sealed`}
                    </div>
                  </div>
                  <button
                    ref={changeSet}
                    type="button"
                    onClick={() => setPicking(true)}
                    className={cn(
                      "flex-none h-11 px-1 text-[13px] font-medium whitespace-nowrap cursor-pointer lg:h-8 lg:px-3 lg:border lg:rounded-lg",
                      picking ? "lg:bg-fill lg:text-on-fill lg:border-fill" : "lg:bg-paper lg:border-line lg:hover:bg-chip",
                    )}
                  >
                    <span className="hidden lg:inline">Change set ▾</span>
                    <span className="lg:hidden">Change ›</span>
                  </button>
                </div>

                <div className="flex flex-col gap-3.5 lg:gap-2.5">
                  {isBinder && (
                    <Row label="Add items as">
                      <Pills
                        options={[
                          { value: "missing", label: "Missing" },
                          { value: "owned", label: "Owned" },
                        ]}
                        value={addAs}
                        onChange={setAddAs}
                      />
                    </Row>
                  )}
                  <Row label="Include">
                    <Pills
                      options={[
                        { value: "cards", label: `Cards (${setCardCount(set)})` },
                        { value: "sealed", label: `Sealed (${setSealedCount(set)})` },
                        { value: "both", label: "Both" },
                      ]}
                      value={scope}
                      onChange={setScope}
                    />
                  </Row>
                  <Row label="Language">
                    {catalog ? (
                      availableLanguages.length ? (
                        <Pills multiple options={availableLanguages} value={langs} onChange={(l) => setLanguages(toggle(langs, l))} />
                      ) : (
                        <span className="text-[13px] text-ink-muted">Nothing in this set yet</span>
                      )
                    ) : (
                      <span className="text-[13px] text-ink-muted">Loading…</span>
                    )}
                  </Row>
                  {scope !== "sealed" && availableVersions.length > 0 && (
                    <Row label="Version">
                      <Pills multiple options={availableVersions.map((v) => ({ value: v, label: VARIANT_LABELS[v] }))} value={vers} onChange={(v) => setVersions(toggle(vers, v))} />
                    </Row>
                  )}
                  {wishlistGetsItems && (
                    <Row label="Targets">
                      <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="flex items-center h-10 lg:h-[34px] px-3 border rounded-lg border-line bg-paper font-geist-mono font-medium focus-within:border-ink">
                          −
                          <input
                            aria-label="Target discount"
                            inputMode="decimal"
                            value={targetPercent}
                            onChange={(e) => setTargetPercent(e.target.value)}
                            className="w-6 text-right bg-transparent outline-none"
                          />
                          %
                        </span>
                        below current price, editable per item
                      </div>
                    </Row>
                  )}
                  <Row label="Skip" labelClassName="hidden lg:block">
                    <button type="button" onClick={() => setSkipOwned((s) => !s)} className="flex items-center gap-2.5 min-h-11 lg:min-h-[34px] text-left cursor-pointer">
                      <span
                        className={cn(
                          "grid flex-none w-5 h-5 lg:w-[18px] lg:h-[18px] rounded-[5px] border-[1.5px] border-ink place-items-center text-paper text-xs font-semibold",
                          skipOwned && "bg-ink",
                        )}
                      >
                        {skipOwned && "✓"}
                      </span>
                      <span className="text-sm lg:text-[13px]">
                        <span className="lg:hidden">Skip items I already own</span>
                        <span className="hidden lg:inline">Items I already own in other binders</span> <span className="text-ink-muted">({catalog ? ownedCount : "…"})</span>
                      </span>
                    </button>
                  </Row>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col flex-none gap-2.5 px-4 pt-3.5 pb-[max(28px,env(safe-area-inset-bottom))] border-t border-line lg:flex-row lg:items-center lg:gap-3 lg:py-4 lg:pl-7 lg:pr-5 lg:bg-canvas">
            <p className={cn("text-[13px]", error ? "text-loss" : "text-ink-muted")}>{error ?? summary}</p>
            <div className="flex gap-2 lg:ml-auto">
              <button type="button" onClick={close} className="hidden h-10 px-3.5 text-sm font-medium cursor-pointer lg:block">
                Cancel
              </button>
              <EditButton
                type="button"
                disabled={!valid || saving}
                onClick={save}
                className="flex-1 lg:flex-none h-[50px] lg:h-10 px-[18px] rounded-[11px] lg:rounded-[9px] bg-fill text-on-fill text-[15px] lg:text-sm font-medium whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                {cta}
              </EditButton>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
      <SetPicker open={picking} onClose={() => setPicking(false)} anchor={changeSet} sets={sets} selected={set?._id} owned={ownedBySet} onSelect={(s) => setSetId(s._id)} />
    </DialogPrimitive.Root>
  );
};

// Label above on mobile, in a column on its left on desktop
const Row = ({ label, labelClassName, children }: { label: string; labelClassName?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5 lg:grid lg:grid-cols-[90px_minmax(0,1fr)] lg:gap-3.5 lg:items-center">
    <span className={cn("text-xs lg:text-[13px] text-ink-muted", labelClassName)}>{label}</span>
    {children}
  </div>
);

// One choice, or several with `multiple` (then value is the list of chosen ones)
const Pills = <T extends string>({ options, value, onChange, multiple }: { options: { value: T; label: string }[]; value: T | T[]; onChange: (value: T) => void; multiple?: boolean }) => (
  <div className={cn("gap-1.5 lg:flex lg:flex-wrap", multiple ? "flex flex-wrap" : "grid grid-flow-col auto-cols-fr")}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        aria-pressed={multiple ? value.includes(o.value) : undefined}
        onClick={() => onChange(o.value)}
        className={cn(
          "h-10 lg:h-[34px] px-3 rounded-full border text-[13px] font-medium whitespace-nowrap cursor-pointer",
          (multiple ? value.includes(o.value) : o.value === value) ? "bg-fill text-on-fill border-fill" : "bg-paper text-ink border-line hover:bg-chip",
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export default NewListModal;
