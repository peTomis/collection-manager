// Libraries
import { useEffect, useState } from "react";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { deleteWishlist, getWishlists, setWishlist } from "@/redux/slices/wishlists";
import { getBinders } from "@/redux/slices/binders";
import { getSets } from "@/redux/slices/sets";

// Components
import Topbar from "@/components/organisms/topbar";
import { ConfirmModal } from "@/components/atoms/modal";
import NewListModal from "@/components/organisms/new-list-modal";
import WishlistRail from "./components/wishlist-rail";
import WishlistHeader from "./components/wishlist-header";
import WishlistItems from "./components/wishlist-items";

const WishlistsContainer = () => {
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);

  const { wishlist, wishlists, loaded } = useSelector((state) => state.wishlists);
  const { user } = useSelector((state) => state.user);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;
    dispatch(getWishlists(user));
    dispatch(getSets(user));
    // Binders are the destination of "Got it"
    dispatch(getBinders(user));
  }, [user]);

  // Keep the selected wishlist in sync with the latest fetch, falling back to the first one
  useEffect(() => {
    const current = wishlists.find((w) => w._id === wishlist?._id) ?? wishlists[0] ?? null;
    if (current !== wishlist) dispatch(setWishlist(current));
  }, [wishlists]);

  // Desktop: fixed to the viewport, only the items scroll. Mobile: a normal scrolling page.
  return (
    <main className="flex flex-col min-h-screen lg:w-screen lg:h-dvh lg:overflow-hidden font-geist text-ink">
      <Topbar />
      <div className="flex flex-col flex-1 w-full lg:min-h-0 max-w-[1440px] mx-auto lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <WishlistRail />
        <section className="flex flex-col flex-1 min-w-0 px-4 pt-4 lg:min-h-0 lg:px-9 lg:pt-7">
          {wishlist ? (
            <>
              <WishlistHeader wishlist={wishlist} onDelete={() => setDeleting(true)} />
              <WishlistItems wishlist={wishlist} />
            </>
          ) : (
            loaded && (
              <div className="flex flex-col items-center gap-3 py-24 text-center">
                <h1 className="font-display font-semibold text-[30px] tracking-[-0.03em]">No wishlists yet</h1>
                <p className="text-sm text-ink-muted">List the cards you want and set a target price for each.</p>
                <button type="button" onClick={() => setCreating(true)} className="h-[38px] px-4 mt-2 rounded-[9px] bg-ink text-paper text-sm font-medium cursor-pointer">
                  + New wishlist
                </button>
              </div>
            )
          )}
        </section>
      </div>

      <NewListModal type="wishlist" open={creating} onClose={() => setCreating(false)} />
      <ConfirmModal
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => user && wishlist && dispatch(deleteWishlist(user, wishlist._id))}
        title="Delete wishlist"
        description={`Delete ${wishlist?.name ?? "this wishlist"} and everything in it? This can't be undone.`}
        confirmLabel="Delete"
      />
    </main>
  );
};

export default WishlistsContainer;
