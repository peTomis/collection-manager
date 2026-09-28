// Libraries
import { Item, ItemType as ItemTypeType, Sealed, Language, SealedHistoricPrice } from "@/types/mongodb";
import { useEffect, useState } from "react";

// Utils
import { getPrice } from "@/utils/utils";

// Store
import { dispatch, useSelector } from "@/redux/store";

// Components
import { Card as CardUi } from "@/components/ui/card";

// Molecules
import { Input } from "@/components/ui/input";
import { ItemSpecificType } from "@/types/constants";
import { getHistoricPricesBySealed } from "@/redux/slices/historic-prices";
import ListTable from "@/components/organisms/list-table";

interface DatabaseSealedListProps {
  type: ItemSpecificType | null;
  onSealedSelect: (item: string, language: Language) => void;
}

const DatabaseSealedList = ({ onSealedSelect, type }: DatabaseSealedListProps) => {
  const [search, setSearch] = useState("");

  const { historicPrices } = useSelector((state) => state.historicPrices);

  const { sealed } = useSelector((state) => state.sealed);

  const user = useSelector((state) => state.user.user) ?? "";

  const itemsToDisplay: (Sealed & {
    historicPrice?: SealedHistoricPrice;
  })[] = !sealed?.length
    ? []
    : historicPrices
        .map((c) => {
          const sealedItem = sealed.find((s) => s._id === (c as SealedHistoricPrice).sealed) ?? sealed[0];

          return {
            ...sealedItem,
            historicPrice: c as SealedHistoricPrice,
          };
        })
        .filter((h) => h.name.toLowerCase().includes(search.toLowerCase()));

  const total = {
    price: itemsToDisplay.reduce((acc, item) => acc + (item.historicPrice ? getPrice(item.historicPrice) : 0), 0) ?? 0,
    oneY: itemsToDisplay.reduce((acc, item) => acc + (item.historicPrice?.prices1y?.[0] ?? 0), 0) ?? 0,
    oneM: itemsToDisplay.reduce((acc, item) => acc + (item.historicPrice?.prices1m?.[0] ?? 0), 0) ?? 0,
    oneW: itemsToDisplay.reduce((acc, item) => acc + (item.historicPrice?.prices1w?.[0] ?? 0), 0) ?? 0,
    oneD: itemsToDisplay.reduce((acc, item) => acc + (item.historicPrice?.prices1d?.[0] ?? 0), 0) ?? 0,
  };

  useEffect(() => {
    if (!user) return;

    const sealedToFetch: Item[] = [];

    for (const s of sealed) {
      for (const variant of s.variants) {
        sealedToFetch.push({
          _id: "",
          name: "",
          type: ItemTypeType.SEALED,
          item: s._id,
          historicPrice: s._id,
          user: "",
          language: variant.language,
        });
      }
    }

    dispatch(getHistoricPricesBySealed(user, sealedToFetch));
  }, [sealed, user]);

  if (type === null) {
    return <CardUi className="flex flex-col justify-between h-full min-h-0 p-4 md:col-span-4"></CardUi>;
  }

  return (
    <CardUi className="flex flex-col max-h-[512px] md:max-h-screen h-full min-h-0 p-4 md:col-span-4">
      <Input className="flex-none mb-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search a card...`} />
      <ListTable
        type="sealed-list"
        sortedItems={itemsToDisplay.map((item) => ({
          _id: item._id,
          name: item.name,
          type: ItemTypeType.SEALED,
          user: "",
          item: item as unknown as Sealed,
          historicPrice: item.historicPrice!,
          wishlist: "",
        }))}
        total={total}
        onChange={(_id) => {
          const [id, language] = _id.split("?");
          const item = itemsToDisplay.find((it) => it._id === id);
          if (!item) return;
          onSealedSelect(id, language as Language);
        }}
      />
    </CardUi>
  );
};

export default DatabaseSealedList;
