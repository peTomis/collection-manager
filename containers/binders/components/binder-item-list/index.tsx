// Libraries
import { BinderItem, Card } from "@/types/mongodb";
import { useEffect, useState } from "react";

// Utils
import { getPrice } from "@/utils/utils";

// Store
import { useDispatch, useSelector } from "@/redux/store";

// Components
import { Card as CardUi } from "@/components/ui/card";

// Molecules
import { Input } from "@/components/ui/input";
import DialogDeleteItem from "./dialog-delete-item";
import { changeBinderItemQuantity, setBinder } from "@/redux/slices/binders";
import ListTable from "@/components/organisms/list-table";

const BinderItemList = () => {
  const [deleteItem, setDeleteItem] = useState<null | string>(null);
  const [search, setSearch] = useState("");

  const { binder, binders } = useSelector((state) => state.binders);
  const dispatch = useDispatch();

  const user = useSelector((state) => state.user.user) ?? "";

  const total = {
    price: (binder?.items ?? []).reduce((acc, item) => acc + (item.historicPrice ? getPrice(item.historicPrice) : 0) * item.quantity, 0) ?? 0,
    oneY: (binder?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1y?.[0] ?? 0) * item.quantity, 0) ?? 0,
    oneM: (binder?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1m?.[0] ?? 0) * item.quantity, 0) ?? 0,
    oneW: (binder?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1w?.[0] ?? 0) * item.quantity, 0) ?? 0,
    oneD: (binder?.items ?? []).reduce((acc, item) => acc + (item.historicPrice?.prices1d?.[0] ?? 0) * item.quantity, 0) ?? 0,
  };

  const sortBySetThanByNumber = (a: BinderItem, b: BinderItem) => {
    if (a.item.set === b.item.set) return (a.item as Card).number - (b.item as Card).number;
    return a.item.set.localeCompare(b.item.set);
  };

  const sortedItems = [...(binder?.items ?? [])].sort(sortBySetThanByNumber).filter((item) => {
    const card = item.item as Card;
    return card.name.toLowerCase().includes(search.toLowerCase());
  });

  const changeQuantity = (_id: string, quantity: number) => {
    if (quantity < 0) return;
    if (quantity === 0) setDeleteItem(_id);
    const item = binder?.items.find((i) => i._id === _id);
    if (!item || !user) return;
    dispatch(
      changeBinderItemQuantity(user, {
        ...item,
        quantity,
        item: item.item._id,
        historicPrice: item.historicPrice?._id,
      })
    );
  };

  useEffect(() => {
    const newBinder = binders.find((b) => b._id === binder?._id) || null;
    if (newBinder) {
      dispatch(setBinder(newBinder));
    }
  }, [binders]);

  return (
    <>
      <DialogDeleteItem
        binder={binder?._id ?? null}
        item={deleteItem}
        onClose={() => {
          setDeleteItem(null);
        }}
      />
      <CardUi className="flex flex-col min-h-0 p-4 md:h-full md:col-span-5">
        <Input className="flex-none mb-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search a card...`} />
        <ListTable type="binder" sortedItems={sortedItems} total={total} onChange={changeQuantity} />
      </CardUi>
    </>
  );
};

export default BinderItemList;
