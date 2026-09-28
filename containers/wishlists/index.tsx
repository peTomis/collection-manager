// Components
import Topbar from "@/components/organisms/topbar";
import { useDispatch, useSelector } from "@/redux/store";
import WishlistItemList from "./components/wishlist-item-list";
import { use, useEffect, useState } from "react";
import SearchTab from "@/components/organisms/search-tab";
import DialogAddWishlist from "./components/dialog-add-wishlist";
import DialogDeleteWishlist from "./components/dialog-delete-wishlist";
import { getWishlists, setWishlist } from "@/redux/slices/wishlists";
import { getSets } from "@/redux/slices/sets";

const WishlistsContainer = () => {
  const [wishlistToDelete, setWishlistToDelete] = useState<null | string>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const { wishlist, wishlists } = useSelector((state) => state.wishlists);
  const { user } = useSelector((state) => state.user);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;
    dispatch(getWishlists(user));
    dispatch(getSets(user));
  }, [user]);

  return (
    <main className="relative flex flex-col w-screen min-h-screen overflow-clip md:h-screen">
      <Topbar />
      <DialogAddWishlist
        open={dialogOpen}
        close={() => setDialogOpen(false)}
        onItemAdded={() => {
          setDialogOpen(false);
        }}
      />
      <DialogDeleteWishlist
        wishlist={wishlistToDelete}
        onClose={() => {
          setWishlistToDelete(null);
        }}
      />
      <div className="flex flex-col w-full min-h-0 grid-cols-1 p-2 space-y-2 md:space-y-0 md:gap-2 md:grid md:flex-1 md:grid-cols-6">
        <div className="min-h-0 col-span-1">
          <SearchTab
            placeholder="wishlist"
            selected={wishlist?._id ?? ""}
            list={wishlists.map((t) => ({ label: t.name, value: t._id }))}
            onChange={(value) => {
              const wishlistFound = wishlists.find((b) => b._id === value);
              if (!wishlistFound) return;
              dispatch(setWishlist(wishlistFound));
            }}
            onAdd={() => setDialogOpen(true)}
            onDelete={(id: string) => {
              setWishlistToDelete(id);
            }}
          />
        </div>
        <WishlistItemList />
      </div>
    </main>
  );
};

export default WishlistsContainer;
