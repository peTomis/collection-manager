// Libraries
import { useEffect, useState } from "react";

// Types
import { CardHistoricPrice, HistoricPrice, Item, ItemType as ItemTypeType, SealedHistoricPrice } from "@/types/mongodb";

// Components
import { CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TopItem from "./item";
import { useSelector } from "@/redux/store";

export enum TopTabsFilter {
  VALUE = "value",
  GAINERS = "gainers",
  LOSERS = "losers",
}

interface TopTabsProps {
  prices: HistoricPrice[];
  filter: TopTabsFilter;
  setFilter: (value: TopTabsFilter) => void;
}

const TopTabs = ({ filter, setFilter, prices }: TopTabsProps) => {
  const [images, setImages] = useState<{ [key: string]: string }>({});

  // const { items } = useSelector((state) => state.items);

  const items: Item[] = [];

  // useEffect(() => {
  //   for (const price of prices) {
  //     const item =
  //       items.find(
  //         (item) =>
  //           (item?.type === ItemTypeType.CARD && (price as CardHistoricPrice).card === item?.item) ||
  //           (item?.type === ItemTypeType.SEALED && (price as SealedHistoricPrice).sealed === item?.item)
  //       ) ?? items[0];

  //     if (images[item?.item]) continue;

  //     fetch(`/api/images?user=${item?.user}&item=${item?.item}&type=${item?.type}`)
  //       .then((response) => response.json())
  //       .then((data) => {
  //         setImages((prev) => ({ ...prev, [item?.item]: data.image }));
  //       });
  //   }
  // }, [prices]);
  return (
    <CardContent className="lg:h-[310px]">
      <Tabs
        value={filter}
        onValueChange={(value) => {
          if (value !== "value" && value !== "gainers" && value !== "losers") return;
          setFilter(value as TopTabsFilter);
        }}
        className="flex flex-col flex-1 w-full space-y-8"
      >
        <TabsList>
          <TabsTrigger value="value">Value</TabsTrigger>
          <TabsTrigger value="gainers">Gainers</TabsTrigger>
          <TabsTrigger value="losers">Losers</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-row space-x-2 space-y-0 lg:space-y-2 lg:space-x-0 lg:flex-col xl:space-y-0 xl:space-x-2 xl:flex-row">
        {prices.map((price) => {
          const item =
            items.find(
              (item) =>
                (item?.type === ItemTypeType.CARD && (price as CardHistoricPrice).card === item?.item) ||
                (item?.type === ItemTypeType.SEALED && (price as SealedHistoricPrice).sealed === item?.item)
            ) ?? items[0];
          return <TopItem key={price._id} item={item} image={images[item?.item]} price={price} />;
        })}
      </div>
    </CardContent>
  );
};

export default TopTabs;
