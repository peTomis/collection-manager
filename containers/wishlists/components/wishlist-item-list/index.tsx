// Libraries
import { WishlistItem, Card } from "@/types/mongodb";
import { useEffect, useState } from "react";

// Utils
import { getPrice } from "@/utils/utils";

// Store
import { useDispatch, useSelector } from "@/redux/store";

// Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card as CardUi } from "@/components/ui/card";

// Molecules
import PriceDelta from "@/components/molecules/price-delta";
import { Input } from "@/components/ui/input";
import { Trash2Icon } from "lucide-react";
import DialogDeleteItem from "./dialog-delete-item";
import { setWishlist } from "@/redux/slices/wishlists";
import ListTable from "@/components/organisms/list-table";

const WishlistItemList = () => {
  const [deleteItem, setDeleteItem] = useState<null | string>(null);
  const [search, setSearch] = useState("");

  const { wishlist, wishlists } = useSelector((state) => state.wishlists);
  const dispatch = useDispatch();

  const total = {
    price: (wishlist?.items ?? []).reduce((acc, item) => acc + (item.historicPrice ? getPrice(item.historicPrice) : 0), 0) ?? 0,
    oneY: (wishlist?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1y?.[0] ?? 0), 0) ?? 0,
    oneM: (wishlist?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1m?.[0] ?? 0), 0) ?? 0,
    oneW: (wishlist?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1w?.[0] ?? 0), 0) ?? 0,
    oneD: (wishlist?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1d?.[0] ?? 0), 0) ?? 0,
  };

  const sortBySetThanByNumber = (a: WishlistItem, b: WishlistItem) => {
    if (a.item.set === b.item.set) return (a.item as Card).number - (b.item as Card).number;
    return a.item.set.localeCompare(b.item.set);
  };

  const sortedItems = [...(wishlist?.items ?? [])].sort(sortBySetThanByNumber).filter((item) => {
    const card = item.item as Card;
    return card.name.toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    const newWishlist = wishlists.find((b) => b._id === wishlist?._id) || null;
    if (newWishlist) {
      dispatch(setWishlist(newWishlist));
    }
  }, [wishlists]);

  return (
    <>
      <DialogDeleteItem
        wishlist={wishlist?._id ?? null}
        item={deleteItem}
        onClose={() => {
          setDeleteItem(null);
        }}
      />
      <CardUi className="flex flex-col h-full min-h-0 col-span-5 p-4">
        <Input className="flex-none mb-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search a card...`} />
        <ListTable
          type="wishlist"
          sortedItems={sortedItems}
          total={total}
          onChange={(_id) => {
            setDeleteItem(_id);
          }}
        />
      </CardUi>
    </>
  );
};

export default WishlistItemList;
