// Libraries
import { useEffect, useState } from "react";

// Redux
import { useDispatch, useSelector } from "@/redux/store";
import { addBinderItem, getBinders, setBinder } from "@/redux/slices/binders";

// Components
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ComboBox from "@/components/atoms/Combobox";
import { CardVariant, ItemType, SealedVariant } from "@/types/mongodb";
import { Input } from "@/components/ui/input";
import { addWishlistItem, setWishlist } from "@/redux/slices/wishlists";

interface DialogAddItemProps {
  open: boolean;
  type: "binder" | "wishlist";
  variant: CardVariant | SealedVariant | null;
  close: () => void;
  onItemAdded: () => void;
}

export default function DialogAddItem({ open, variant, type, close, onItemAdded }: DialogAddItemProps) {
  const [quantity, setQuantity] = useState(1);
  const user = useSelector((state) => state.user.user) ?? "";
  const { card } = useSelector((state) => state.cards);
  const { singleSealed } = useSelector((state) => state.sealed);
  const { binder, binders, loading: binderLoading } = useSelector((state) => state.binders);
  const { wishlist, wishlists, loading: wishlistLoading } = useSelector((state) => state.wishlists);
  const [binderSelected, setBinderSelected] = useState<boolean>(true);
  const [wishlistSelected, setWishlistSelected] = useState<boolean>(true);

  const { historicPrice } = useSelector((state) => state.historicPrices);

  const dispatch = useDispatch();

  const saveBinder = async () => {
    if (!binder) {
      setBinderSelected(false);
      return;
    }

    if (!variant || (!card && !singleSealed) || !historicPrice || binderLoading) return;

    const item = card?._id ?? singleSealed?._id;

    if (!item) return;

    const itemToAdd = {
      name: card?.name ?? singleSealed?.name ?? "",
      item,
      historicPrice: historicPrice._id,
      type: card ? ItemType.CARD : ItemType.SEALED,
      binder: binder?._id,
      quantity,
    };

    dispatch(addBinderItem(user, itemToAdd, { item: (card ?? singleSealed)!, historicPrice }));
  };

  const saveWishlist = async () => {
    if (!wishlist) {
      setWishlistSelected(false);
      return;
    }

    if (!variant || (!card && !singleSealed) || !historicPrice || wishlistLoading) return;

    const item = card?._id ?? singleSealed?._id;

    if (!item) return;

    const itemToAdd = {
      name: card?.name ?? singleSealed?.name ?? "",
      item,
      historicPrice: historicPrice._id,
      type: card ? ItemType.CARD : ItemType.SEALED,
      wishlist: wishlist?._id,
    };

    dispatch(addWishlistItem(user, itemToAdd, { item: (card ?? singleSealed)!, historicPrice }));
  };

  useEffect(() => {
    onItemAdded();
  }, [binders, wishlists]);

  const itemsToShow =
    type === "binder"
      ? binders.map((b) => ({
          value: b?._id,
          label: b?.name,
        }))
      : wishlists.map((b) => ({
          value: b?._id,
          label: b?.name,
        }));

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex flex-col sm:max-w-md lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add an item to your {type}</DialogTitle>
          <DialogDescription>Choose a {type} where to add this item.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-start w-full h-full py-8 space-y-2">
          <div className={`w-[524px] rounded-md ${binderSelected || wishlistSelected ? "" : "bg-red-500 bg-opacity-50"} `}>
            <ComboBox
              width="w-[524px]"
              items={itemsToShow}
              label={type}
              value={type === "binder" ? binder?._id ?? "" : wishlist?._id ?? ""}
              setValue={(value) => {
                if (type === "binder") {
                  setBinderSelected(true);
                  const binder = binders.find((b) => b?._id === value);
                  if (!binder) return;
                  dispatch(setBinder(binder));
                } else {
                  setWishlistSelected(true);
                  const wishlist = wishlists.find((b) => b?._id === value);
                  if (!wishlist) return;
                  dispatch(setWishlist(wishlist));
                }
              }}
            />
          </div>
          {type === "binder" && (
            <div className="flex flex-row items-center w-full space-x-2">
              <div className="w-full pl-2 text-end">Quantity:</div>
              <Input
                className="w-12"
                value={quantity}
                onChange={(e) => {
                  if (!e.target.value) return;
                  if (isNaN(Number(e.target.value))) return;
                  setQuantity(Number(e.target.value));
                }}
                placeholder={`Type a quantity...`}
              />
            </div>
          )}
        </div>
        <DialogFooter className="flex sm:justify-end">
          <Button
            type="button"
            onClick={() => {
              if (type === "binder") {
                saveBinder();
              } else {
                saveWishlist();
              }
            }}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
