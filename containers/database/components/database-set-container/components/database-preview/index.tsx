import { Card as CardUi } from "@/components/ui/card";
import { getHistoricPrice } from "@/redux/slices/historic-prices";
import { useDispatch, useSelector } from "@/redux/store";
import { CardVariant, CardVariantType, ItemType, Language, Sealed, SealedVariant, Set } from "@/types/mongodb";
import { fetchCardDataFromTCGdex } from "@/utils/tcgdex";
import { Card as TCGdexCard } from "@tcgdex/sdk";
import { useEffect, useState } from "react";
import DataToViewSelect from "./components/data-to-view-select";
import DatabaseChartPreview from "./components/database-chart-preview";
import DatabaseCardData from "./components/database-card-data";

interface DatabasePreviewProps {
  set: null | Set;
  variant: CardVariant | SealedVariant | null;
  setVariant: (type: CardVariant | SealedVariant) => void;
}

const DatabasePreview = ({ set, variant, setVariant }: DatabasePreviewProps) => {
  const [data, setData] = useState<TCGdexCard | null>(null);
  const [showData, setShowData] = useState<boolean>(false);

  const user = useSelector((state) => state.user.user) ?? "";

  const { historicPrice } = useSelector((state) => state.historicPrices);
  const { card } = useSelector((state) => state.cards);
  const { singleSealed } = useSelector((state) => state.sealed);

  const dispatch = useDispatch();

  const fetchCardData = async () => {
    const cardData = await fetchCardDataFromTCGdex(set?.tcgdex ?? "", String(card?.number ?? ""));
    setData(cardData);
  };

  useEffect(() => {
    if (!user) return;
    if (card) {
      setData(null);
      fetchCardData();
      const cardVariant = card.variants?.find((v) => v.language === variant?.language && v.type === (variant as CardVariant)?.type);
      if (cardVariant) {
        dispatch(getHistoricPrice(user, card?._id ?? "", ItemType.CARD, cardVariant.language, cardVariant.type));
        return;
      }
      if (card?.variants?.length) {
        setVariant(card.variants[0]);
        dispatch(getHistoricPrice(user, card?._id ?? "", ItemType.CARD, card.variants[0].language, card.variants[0].type));
      }
    } else if (singleSealed) {
      const sealedVariant = singleSealed.variants?.find((v) => v.language === variant?.language);
      if (sealedVariant) {
        dispatch(getHistoricPrice(user, singleSealed?._id ?? "", ItemType.SEALED, sealedVariant.language));
        return;
      }
      if (singleSealed?.variants?.length) {
        setVariant(singleSealed.variants[0]);
        dispatch(getHistoricPrice(user, singleSealed?._id ?? "", ItemType.SEALED, singleSealed.variants[0].language));
      }
    }
  }, [card, singleSealed, user]);

  const variants = card?.variants ?? singleSealed?.variants ?? [];

  const filteredPrices = (historicPrice?.prices1y ?? []).filter((p) => p != -1);

  return (
    <CardUi className="flex flex-col justify-between h-full min-h-0 p-4 md:col-span-3">
      {(card || singleSealed) && (
        <>
          <div className="">
            <div className="flex flex-col-reverse w-full pt-4 text-5xl font-bold text-center md:flex-row">
              <div className="w-[122.44px]"></div>
              <div
                className="w-full pt-4 text-4xl font-bold text-center cursor-pointer md:text-5xl"
                onClick={() => {
                  if (card) {
                    const cardVariant = card.variants?.find((v) => v.language === variant?.language && v.type === (variant as CardVariant)?.type);
                    if (cardVariant) window.open(cardVariant.url);
                    return;
                  } else {
                    const sealedVariant = singleSealed?.variants?.find((v) => v.language === variant?.language);
                    if (sealedVariant) window.open(sealedVariant.url);
                    return;
                  }
                }}
              >
                {card?.name ?? singleSealed?.name}
              </div>
              <DataToViewSelect
                showData={showData}
                onToggle={() => {
                  setShowData(!showData);
                }}
              />
            </div>
          </div>
          {showData ? (
            <DatabaseCardData data={data} />
          ) : (
            <DatabaseChartPreview
              data={data}
              historicPrice={historicPrice}
              filteredPrices={filteredPrices}
              variant={variant}
              variants={variants as CardVariant[]}
              onClick={function (variant: CardVariant | SealedVariant): void {
                setVariant(variant);
                dispatch(
                  getHistoricPrice(
                    user,
                    card?._id ?? singleSealed?._id ?? "",
                    card ? ItemType.CARD : ItemType.SEALED,
                    variant?.language,
                    (variant as CardVariant)?.type ? (variant as CardVariant).type : undefined
                  )
                );
              }}
            />
          )}
        </>
      )}
    </CardUi>
  );
};

export default DatabasePreview;
