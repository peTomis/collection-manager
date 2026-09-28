// Libraries
import { useEffect, useMemo } from "react";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { getBinders } from "@/redux/slices/binders";
import { getWishlists } from "@/redux/slices/wishlists";
import { getSets, setSet } from "@/redux/slices/sets";
import { useSetCatalog } from "./use-set-catalog";

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

  useEffect(() => {
    if (!user) return;
    dispatch(getSets(user));
    // Destinations of "+ Binder" and "+ Wishlist", and what the user already owns
    dispatch(getBinders(user));
    dispatch(getWishlists(user));
  }, [user]);

  const sets = useMemo(() => [...setsByRelease].reverse(), [setsByRelease]);

  // Open the newest set until the user picks one
  useEffect(() => {
    if (!set && sets.length) dispatch(setSet(sets[0]));
  }, [sets]);

  const catalog = useSetCatalog(user, set?._id);

  // Quantity owned per item across all binders, for the "Owned ×N" badges
  const owned = useMemo(() => {
    const byItem = new Map<string, number>();
    for (const item of binders.flatMap((b) => b.items)) {
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
              <SetItems key={set._id} set={set} catalog={catalog} owned={owned} />
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
