// Components
import Topbar from "@/components/organisms/topbar";
import { useDispatch, useSelector } from "@/redux/store";
import BinderItemList from "./components/binder-item-list";
import { useEffect, useState } from "react";
import SearchTab from "@/components/organisms/search-tab";
import DialogAddBinder from "./components/dialog-add-binder";
import DialogDeleteBinder from "./components/dialog-delete-binder";
import { getBinders, setBinder } from "@/redux/slices/binders";
import { getSets } from "@/redux/slices/sets";

const BindersContainer = () => {
  const [binderToDelete, setBinderToDelete] = useState<null | string>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const { binder, binders } = useSelector((state) => state.binders);
  const { user } = useSelector((state) => state.user);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;
    dispatch(getBinders(user));
    dispatch(getSets(user));
  }, [user]);

  return (
    <main className="relative flex flex-col w-screen min-h-screen overflow-hidden md:h-screen">
      <div className="absolute top-0 left-0 w-screen h-screen bg-[url('/assets/bg.jpg')] bg-cover bg-center -z-10 opacity-10" />
      <Topbar />
      <DialogAddBinder
        open={dialogOpen}
        close={() => setDialogOpen(false)}
        onItemAdded={() => {
          setDialogOpen(false);
        }}
      />
      <DialogDeleteBinder
        binder={binderToDelete}
        onClose={() => {
          setBinderToDelete(null);
        }}
      />
      <div className="flex flex-col w-full min-h-0 grid-cols-1 p-2 space-y-2 md:space-y-0 md:gap-2 md:grid md:flex-1 md:grid-cols-6">
        <div className="min-h-0 col-span-1">
          <SearchTab
            placeholder="binder"
            selected={binder?._id ?? ""}
            list={binders.map((t) => ({ label: t.name, value: t._id }))}
            onChange={(value) => {
              const binderFound = binders.find((b) => b._id === value);
              if (!binderFound) return;
              dispatch(setBinder(binderFound));
            }}
            onAdd={() => setDialogOpen(true)}
            onDelete={(id: string) => {
              setBinderToDelete(id);
            }}
          />
        </div>
        <BinderItemList />
      </div>
    </main>
  );
};

export default BindersContainer;
