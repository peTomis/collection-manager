// Libraries
import { useState } from "react";
import { HistoricPrice, Item } from "@/types/mongodb";

// Utils
import { parseRatio } from "@/utils/utils";

// Components
import TopTitle from "./components/title";
import TopTabs, { TopTabsFilter } from "./components/tabs";
import { useSelector } from "@/redux/store";
import { Card } from "@/components/ui/card";

const Top = () => {
  const [filter, setFilter] = useState<TopTabsFilter>(TopTabsFilter.VALUE);

  const { historicPrices } = useSelector((state) => state.historicPrices);

  const getItemToDisplay = () => {
    const sortFunction = () => {
      switch (filter) {
        case TopTabsFilter.GAINERS:
          return (a: HistoricPrice, b: HistoricPrice) => {
            const aDelta = parseRatio(a.price, a.prices1d?.[0] ?? a.price);
            const bDelta = parseRatio(b.price, b.prices1d?.[0] ?? b.price);
            return Number(bDelta) - Number(aDelta);
          };
        case TopTabsFilter.LOSERS:
          return (a: HistoricPrice, b: HistoricPrice) => {
            const aDelta = parseRatio(a.price, a.prices1d?.[0] ?? a.price);
            const bDelta = parseRatio(b.price, b.prices1d?.[0] ?? b.price);
            return Number(aDelta) - Number(bDelta);
          };
        default:
          return (a: HistoricPrice, b: HistoricPrice) => {
            return b.price - a.price;
          };
      }
    };

    return [...historicPrices].sort(sortFunction()).slice(0, 3);
  };
  const pricesToDisplay = getItemToDisplay();

  return (
    <Card className="w-full col-span-1 lg:col-span-5 2xl:col-span-4">
      <TopTitle />
      <TopTabs prices={pricesToDisplay} filter={filter} setFilter={setFilter} />
    </Card>
  );
};

export default Top;
