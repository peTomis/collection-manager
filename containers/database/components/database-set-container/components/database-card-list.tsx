// Libraries
import { CardHistoricPrice, Item, ItemType as ItemTypeType, Language as CardLanguage, CardVariantType, Card, CardVariant, SealedVariant, Language } from "@/types/mongodb";
import { useEffect, useState } from "react";

// Utils
import { getPrice } from "@/utils/utils";

// Store
import { dispatch, useSelector } from "@/redux/store";

// Components
import { Card as CardUi } from "@/components/ui/card";

// Molecules
import TypeSelect from "@/components/molecules/type-select";
import { Input } from "@/components/ui/input";
import { getHistoricPricesByCards } from "@/redux/slices/historic-prices";
import ListTable from "@/components/organisms/list-table";

interface DatabaseCardListProps {
  variant: CardVariant | SealedVariant | null;
  setVariant: (variant: CardVariant | SealedVariant | null) => void;
}

const DatabaseCardList = ({ variant, setVariant }: DatabaseCardListProps) => {
  const [search, setSearch] = useState("");

  const { cards } = useSelector((state) => state.cards);
  const { historicPrices } = useSelector((state) => state.historicPrices);

  const user = useSelector((state) => state.user.user) ?? "";

  const itemsToDisplay: (Omit<Item, "historicPrice"> & {
    historicPrice?: CardHistoricPrice;
  })[] = cards
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .map((c) => {
      const historicPrice = historicPrices.find((price) => (price as CardHistoricPrice).card === c._id);
      return {
        ...c,
        type: ItemTypeType.CARD,
        user,
        item: c._id,
        language: Language.ITALIAN,
        historicPrice: historicPrice as CardHistoricPrice,
      };
    });

  const variants = cards?.[0]?.variants ?? [];

  const total = {
    price: itemsToDisplay.reduce((acc, item) => acc + (item.historicPrice ? getPrice(item.historicPrice) : 0), 0) ?? 0,
    oneY: itemsToDisplay.reduce((acc, item) => acc + (item.historicPrice?.prices1y?.[0] ?? 0), 0) ?? 0,
    oneM: itemsToDisplay.reduce((acc, item) => acc + (item.historicPrice?.prices1m?.[0] ?? 0), 0) ?? 0,
    oneW: itemsToDisplay.reduce((acc, item) => acc + (item.historicPrice?.prices1w?.[0] ?? 0), 0) ?? 0,
    oneD: itemsToDisplay.reduce((acc, item) => acc + (item.historicPrice?.prices1d?.[0] ?? 0), 0) ?? 0,
  };

  useEffect(() => {
    if (!user) return;

    const cardVariant = cards?.[0]?.variants?.find((v) => v.language === variant?.language && v.type === (variant as CardVariant)?.type);
    if (cardVariant) {
      dispatch(getHistoricPricesByCards(user, cards, cardVariant.language, cardVariant.type));
      return;
    }
    const defaultVariant = cards?.[0]?.variants?.[0];
    if (!defaultVariant) return;
    setVariant(defaultVariant);
    dispatch(getHistoricPricesByCards(user, cards, defaultVariant.language, defaultVariant.type));
  }, [cards, user]);

  return (
    <CardUi className="flex flex-col h-full min-h-0 col-span-1 p-4 md:col-span-4">
      <Input className="flex-none mb-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search a card...`} />
      <ListTable
        type="list"
        sortedItems={itemsToDisplay.map((item) => ({
          _id: item._id,
          name: item.name,
          type: item.type,
          user: item.user,
          item: item as unknown as Card,
          historicPrice: item.historicPrice!,
          wishlist: "",
        }))}
        total={total}
        onChange={() => {}}
      />
      <div className="flex flex-row mt-auto">
        <TypeSelect
          onClick={function (variant: CardVariant | SealedVariant | null): void {
            setVariant(variant);
            if (!variant) return;
            dispatch(getHistoricPricesByCards(user, cards, variant?.language, (variant as CardVariant)?.type));
          }}
          variant={variant}
          variants={variants}
        />
      </div>
    </CardUi>
  );
};

export default DatabaseCardList;
