// Libraries
import { useState } from "react";

// Components
import { useSetUnlink } from "@/components/organisms/set-unlink";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { acquireWishlistItem } from "@/redux/slices/wishlists";
import { BinderWithItems, WishlistItem } from "@/types/mongodb";
import { binderAccepts, intoBinderError } from "@/lib/items";

// "Got it" for a wishlist item, as the detail panel and the wishlist's dialog offer it: into a binder of the user's choice.
// Render modal next to the caller's UI (it asks to remove a set binder's set when the binder can't take the item).
export const useAcquire = (item: WishlistItem | null) => {
  const [binderId, setBinderId] = useState("");
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { binders } = useSelector((state) => state.binders);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();
  const setUnlink = useSetUnlink();

  // The linked binder comes first. A copy: the store's array is frozen, and sort works in place
  const choices = [...binders].sort((a, b) => Number(b.wishlist === item?.wishlist) - Number(a.wishlist === item?.wishlist));
  const selected = choices.find((b) => b._id === binderId) ?? choices[0];
  // The linked binder, when it can take the item: a linked wishlist's items can go there without asking
  const linked = item ? choices.find((b) => b.wishlist === item.wishlist && binderAccepts(b, item.type, item.item)) : undefined;

  // onDone runs once the item is in the binder; otherwise error says why it isn't
  const acquire = (binder: BinderWithItems, onDone: () => void) => {
    if (!item || !user || moving) return;
    // Set binders only take cards of their set: anything else asks to remove the set first
    setUnlink.guard(binder, item.type, item.item, async () => {
      setMoving(true);
      setError(null);
      const result = await dispatch(acquireWishlistItem(user, item, binder));
      setMoving(false);
      if (result === "acquired") return onDone();
      setError(intoBinderError(result, binder.name));
    });
  };

  // Back to the first choice, e.g. when a dialog closes
  const reset = () => {
    setBinderId("");
    setError(null);
  };

  return { choices, selected, linked, setBinderId, acquire, moving, error, reset, modal: setUnlink.modal };
};
