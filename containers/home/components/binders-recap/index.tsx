import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrice } from "@/utils/utils";
import SetItem, { setColor, SetRecapItem } from "./components/item";
import { useSelector } from "@/redux/store";
import SetChart from "./components/set-chart";
import { useRef, useState } from "react";
import { useIs2xl, useIsLg } from "@/hooks/useScreenSizes";

interface SetRecapItemFull extends SetRecapItem {
  items: number;
}

const BindersRecap = () => {
  const { binders } = useSelector((state) => state.binders);

  function summarizeSets(): SetRecapItem[] {
    // Use a Map to efficiently group items by set.
    const bindersMap = new Map<string, SetRecapItemFull>();

    for (const binder of binders) {
      const price = (binder?.items ?? []).reduce((acc, item) => acc + (item.historicPrice ? getPrice(item.historicPrice) : 0), 0) ?? 0;
      const average1d = (binder?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1d?.[0] ?? 0), 0) ?? 0;
      const average1m = (binder?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1m?.[0] ?? 0), 0) ?? 0;
      const average1w = (binder?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1w?.[0] ?? 0), 0) ?? 0;
      const average1y = (binder?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1y?.[0] ?? 0), 0) ?? 0;

      bindersMap.set(binder._id, {
        name: binder.name,
        color: setColor[binder.name]?.color || "#000000",
        textColor: setColor[binder.name]?.textColor || "white",
        price,
        average1d,
        average1w,
        average1m,
        average1y,
        items: binder.items.length,
      });
    }

    return Array.from(bindersMap.values()).sort((a, b) => b.price - a.price);
  }

  const sets = summarizeSets();

  return (
    <Card className="col-span-1 lg:col-span-4 2xl:col-span-5">
      <CardHeader>
        <CardTitle>Binders Recap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col justify-between space-y-4 lg:space-y-0 h-full lg:h-[286px] 2xl:flex-row">
          <div className="flex items-center justify-center">
            <SetChart sets={sets} />
          </div>
          <ScrollContainer sets={sets} />
        </div>
      </CardContent>
    </Card>
  );
};

const ScrollContainer = ({ sets }: { sets: SetRecapItem[] }) => {
  const [showGradient, setShowGradient] = useState(true);
  const is2xl = useIs2xl();
  const isLg = useIsLg();
  const scrollRef = useRef(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (showGradient === false) return;
    const scrollTop = e.currentTarget.scrollTop;
    setShowGradient(scrollTop <= 4);
  };

  const dummyCount = Math.max(0, 6 - sets.length);
  const dummySets: number[] = Array.from({ length: dummyCount }, (_, i) => i + 1);

  return (
    <div className="relative max-h-[260px] lg:max-h-[120px] lg:h-[120px] xl:max-h-[260px] 2xl:h-[260px] w-full">
      {(sets.length >= 5 || (isLg && sets.length > 2) || is2xl) && showGradient && <LinearGradient />}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex flex-col justify-start space-y-2 max-h-[260px] lg:max-h-[120px] 2xl:max-h-[260px] w-full overflow-x-hidden overflow-y-auto"
      >
        {sets.map((set) => (
          <SetItem key={set.name + set.price} set={set} />
        ))}
        {is2xl && dummySets.map((set, index) => <DummySetItem key={"dummy-" + index} />)}
      </div>
    </div>
  );
};

const LinearGradient = () => (
  <div className="absolute bottom-0 z-10 w-full h-[200px] lg:h-[100px] 2xl:h-[200px] select-none bg-gradient-to-t from-muted to-transparent pointer-events-none"></div>
);

const DummySetItem = () => <div className="rounded-l-md rounded-r-lg h-[40px] bg-background"></div>;

export default BindersRecap;
