import AddTo from "@/components/molecules/add-to";
import ItemPriceChart from "@/components/molecules/item-price-chart";
import TypeSelect from "@/components/molecules/type-select";
import { useSelector } from "@/redux/store";
import { EMPTY_ITEM } from "@/types/constants";
import { CardVariant, HistoricPrice, ItemType, SealedVariant } from "@/types/mongodb";
import { getPrice } from "@/utils";
import { Card as TCGdexCard } from "@tcgdex/sdk";
import DialogAddItem from "./dialog-add-item";
import { useState } from "react";

const DatabaseChartPreview = ({
  data,
  onClick,
  historicPrice,
  filteredPrices,
  variant,
  variants,
}: {
  data: TCGdexCard | null;
  historicPrice: HistoricPrice | undefined;
  filteredPrices: number[];
  onClick: (variant: CardVariant | SealedVariant) => void;
  variant: CardVariant | SealedVariant | null;
  variants: CardVariant[];
}) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<"binder" | "wishlist">("binder");

  const { binders } = useSelector((state) => state.binders);
  const { card } = useSelector((state) => state.cards);
  const { singleSealed } = useSelector((state) => state.sealed);
  const { wishlists } = useSelector((state) => state.wishlists);

  const now = new Date().getTime();

  const srcPath = data ? `${data?.image}/high.png` : "";

  const isOnABinder = binders.some((binder) =>
    binder.items.some(
      (item) =>
        ((item.item._id === card?._id && item.type === ItemType.CARD) || (item.item._id === singleSealed?._id && item.type === ItemType.SEALED)) &&
        item.historicPrice._id === historicPrice?._id
    )
  );

  const isOnAWishlist = wishlists.some((wishlist) =>
    wishlist.items.some(
      (item) =>
        ((item.item._id === card?._id && item.type === ItemType.CARD) || (item.item._id === singleSealed?._id && item.type === ItemType.SEALED)) &&
        item.historicPrice._id === historicPrice?._id
    )
  );

  return (
    <>
      <DialogAddItem
        open={dialogOpen}
        type={dialogType}
        variant={variant}
        close={() => setDialogOpen(false)}
        onItemAdded={() => {
          setDialogOpen(false);
        }}
      />
      <div className="flex justify-center p-8 text-3xl font-light md:text-4xl md:pt-16 mt:pb-0">{historicPrice?.price ?? 0}€</div>
      <div className="flex flex-col items-center justify-center flex-1 space-y-8 md:space-y-0 md:space-x-8 md:flex-row">
        <div className="overflow-hidden rounded-lg">
          {card?.number && data ? (
            <img src={srcPath} width={256} height={256} alt="Back Card Image" />
          ) : (
            <img src={"./assets/card_bg.png"} width={256} height={256} alt="Back Card Image" />
          )}
        </div>
        <div className="flex flex-col justify-end w-[80vw] border rounded-lg overflow-hidden h-[352px] lg:w-[400px]">
          {historicPrice && (
            <ItemPriceChart
              withPriceHeader={false}
              price={getPrice(historicPrice ?? EMPTY_ITEM)}
              data={filteredPrices.map((p, index) => ({ price: p, timestamp: new Date(now - (filteredPrices.length - index) * 24 * 60 * 60 * 1000).getTime() }))}
            />
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <TypeSelect variant={variant} onClick={onClick} variants={variants} />
        <AddTo
          isInWishlist={isOnAWishlist}
          isInCollection={isOnABinder}
          onWishlistToggle={() => {
            setDialogType("wishlist");
            setDialogOpen(true);
          }}
          onCollectionToggle={() => {
            setDialogType("binder");
            setDialogOpen(true);
          }}
        />
      </div>
    </>
  );
};

export default DatabaseChartPreview;
