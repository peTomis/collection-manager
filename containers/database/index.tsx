// Libraries
import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { getBinders } from "@/redux/slices/binders";
import { getWishlists } from "@/redux/slices/wishlists";
import { getSets, setSet } from "@/redux/slices/sets";
import { useSetCatalog } from "./use-set-catalog";
import { isOwned } from "@/lib/items";

// Components
import Topbar from "@/components/organisms/topbar";
import SetRail from "./components/set-rail";
import SetHeader from "./components/set-header";
import SetItems from "./components/set-items";

const DatabaseContainer = () => {
  const { user } = useSelector((state) => state.user);
  const { set, sets: setsByRelease, loaded } = useSelector((state) => state.sets);
  const { binders } = useSelector((state) => state.binders);

  const dispatch = useDispatch();
  const router = useRouter();
  // From the top bar search: the set to open, and a card or sealed product to show in it
  const querySet = typeof router.query.set === "string" ? router.query.set : undefined;
  const queryItem = typeof router.query.item === "string" ? router.query.item : undefined;

  useEffect(() => {
    if (!user) return;
    dispatch(getSets(user));
    // Destinations of "+ Binder" and "+ Wishlist", and what the user already owns
    dispatch(getBinders(user));
    dispatch(getWishlists(user));
  }, [user]);

  const sets = useMemo(() => [...setsByRelease].reverse(), [setsByRelease]);

  // Open the searched set, otherwise the newest one until the user picks one
  useEffect(() => {
    const searched = querySet && sets.find((s) => s._id === querySet);
    if (searched) dispatch(setSet(searched));
    else if (!set && sets.length) dispatch(setSet(sets[0]));
    // Only a set: nothing else to open, so the URL can go back to /database
    if (searched && !queryItem) router.replace("/database", undefined, { shallow: true });
  }, [sets, querySet]);

  const catalog = useSetCatalog(user, set?._id);

  // Quantity owned per item across all binders, for the "Owned ×N" badges
  const owned = useMemo(() => {
    const byItem = new Map<string, number>();
    for (const item of binders.flatMap((b) => b.items).filter(isOwned)) {
      const id = item.item?._id;
      if (id) byItem.set(id, (byItem.get(id) ?? 0) + item.quantity);
    }
    return byItem;
  }, [binders]);

  // Desktop: fixed to the viewport, only the rail and the products scroll. Mobile: a normal scrolling page.
  return (
    <main className="flex flex-col min-h-screen lg:w-screen lg:h-dvh lg:overflow-hidden font-geist text-ink">
      <Topbar />
      <div className="flex flex-col flex-1 w-full lg:min-h-0 max-w-[1440px] mx-auto lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <SetRail sets={sets} selected={set} onSelect={(s) => dispatch(setSet(s))} />
        <section className="flex flex-col flex-1 min-w-0 px-4 pt-4 lg:min-h-0 lg:px-9 lg:pt-7">
          {set ? (
            <>
              <SetHeader set={set} />
              <SetItems
                key={set._id}
                set={set}
                catalog={catalog}
                owned={owned}
                openItem={set._id === querySet ? queryItem : undefined}
                onOpened={() => router.replace("/database", undefined, { shallow: true })}
              />
            </>
          ) : (
            loaded && <div className="py-24 text-sm text-center text-ink-muted">No sets in the database yet.</div>
          )}
        </section>
      </div>
    </main>
  );
};

export default DatabaseContainer;
