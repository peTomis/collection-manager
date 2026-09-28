// Components
import Sidebar from "../../components/organisms/sidebar";
import { useDispatch, useSelector } from "@/redux/store";
import WishlistItemList from "./components/wishlist-item-list";
import { use, useEffect, useState } from "react";
import SearchTab from "@/components/organisms/search-tab";
import DialogAddWishlist from "./components/dialog-add-wishlist";
import DialogDeleteWishlist from "./components/dialog-delete-wishlist";
import { getWishlists, setWishlist } from "@/redux/slices/wishlists";
import UserHandler from "@/components/organisms/user-handler";
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
    <main className="relative flex flex-col w-screen min-h-screen overflow-hidden md:h-screen lg:flex-row">
      <div className="absolute top-0 left-0 w-screen h-screen bg-[url('/assets/bg.jpg')] bg-cover bg-center -z-10 opacity-10" />
      <Sidebar />
      <UserHandler />
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
      <div className="flex flex-col w-full min-h-0 grid-cols-1 p-2 space-y-2 md:space-y-0 md:gap-2 md:grid md:h-screen md:grid-cols-6">
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
