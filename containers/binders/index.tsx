import EditButton from "@/components/atoms/edit-button";
// Libraries
import { useEffect, useState } from "react";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { deleteBinder, getBinders, setBinder } from "@/redux/slices/binders";
import { getSets } from "@/redux/slices/sets";
import { getWishlists } from "@/redux/slices/wishlists";

// Components
import Topbar from "@/components/organisms/topbar";
import { ConfirmModal } from "@/components/atoms/modal";
import NewListModal from "@/components/organisms/new-list-modal";
import BinderRail from "./components/binder-rail";
import BinderHeader from "./components/binder-header";
import BinderItems from "./components/binder-items";

const BindersContainer = () => {
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);

  const { binder, binders, loaded } = useSelector((state) => state.binders);
  const { user } = useSelector((state) => state.user);
  const linkedWishlist = useSelector((state) => state.wishlists.wishlists.find((w) => !!binder?.wishlist && w._id === binder.wishlist));

  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;
    dispatch(getBinders(user));
    dispatch(getSets(user));
    // The wishlist a binder is linked to
    dispatch(getWishlists(user));
  }, [user]);

  // Keep the selected binder in sync with the latest fetch, falling back to the first one
  useEffect(() => {
    const current = binders.find((b) => b._id === binder?._id) ?? binders[0] ?? null;
    if (current !== binder) dispatch(setBinder(current));
  }, [binders]);

  // Desktop: fixed to the viewport, only the list scrolls and the binder pages fit. Mobile: a normal scrolling page.
  return (
    <main className="flex flex-col min-h-screen lg:w-screen lg:h-dvh lg:overflow-hidden font-geist text-ink">
      <Topbar />
      <div className="flex flex-col flex-1 w-full lg:min-h-0 max-w-[1440px] mx-auto lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <BinderRail />
        <section className="flex flex-col flex-1 min-w-0 px-4 pt-4 lg:min-h-0 lg:px-9 lg:pt-7">
          {binder ? (
            <>
              <BinderHeader binder={binder} onDelete={() => setDeleting(true)} />
              <BinderItems binder={binder} />
            </>
          ) : (
            loaded && (
              <div className="flex flex-col items-center gap-3 py-24 text-center">
                <h1 className="font-display font-semibold text-[30px] tracking-[-0.03em]">No binders yet</h1>
                <p className="text-sm text-ink-muted">Group the cards you own into binders to track their value.</p>
                <EditButton type="button" onClick={() => setCreating(true)} className="h-[38px] px-4 mt-2 rounded-[9px] bg-ink text-paper text-sm font-medium cursor-pointer">
                  + New binder
                </EditButton>
              </div>
            )
          )}
        </section>
      </div>

      <NewListModal type="binder" open={creating} onClose={() => setCreating(false)} />
      <ConfirmModal
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => user && binder && dispatch(deleteBinder(user, binder._id))}
        title="Delete binder"
        description={`Delete ${binder?.name ?? "this binder"} and everything in it?${linkedWishlist ? ` Its linked wishlist ${linkedWishlist.name} is deleted too.` : ""} This can't be undone.`}
        confirmLabel="Delete"
      />
    </main>
  );
};

export default BindersContainer;
