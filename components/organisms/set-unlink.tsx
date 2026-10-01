// Libraries
import { useState } from "react";

// Components
import { ConfirmModal } from "@/components/atoms/modal";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { removeBinderSet } from "@/redux/slices/binders";
import { Binder, Card, ItemType, Sealed } from "@/types/mongodb";
import { binderAccepts, binderSetId } from "@/lib/items";

// Adding to a set binder something outside its set: ask to remove the binder's set first, then add.
// guard runs add right away when the binder takes the item. Render modal next to the caller's UI.
export const useSetUnlink = () => {
  const [pending, setPending] = useState<{ binder: Binder; add: () => void } | null>(null);
  const { sets } = useSelector((state) => state.sets);
  const user = useSelector((state) => state.user.user) ?? "";
  const dispatch = useDispatch();

  const guard = (binder: Binder, type: ItemType, item: Card | Sealed, add: () => void) => {
    if (binderAccepts(binder, type, item)) add();
    else setPending({ binder, add });
  };

  const setName = pending && sets.find((s) => s._id === binderSetId(pending.binder))?.name;

  const modal = (
    <ConfirmModal
      open={!!pending}
      onClose={() => setPending(null)}
      onConfirm={async () => {
        if (!pending || !user) return;
        // The server refuses the item while the binder still has its set
        if (await dispatch(removeBinderSet(user, pending.binder._id))) pending.add();
      }}
      title="Remove set link"
      description={`${pending?.binder.name ?? "This binder"} only takes ${setName ? `${setName} cards` : "cards of its set"}. Remove its set link to add this item? Its cards will no longer be numbered against the set.`}
      confirmLabel="Remove link & add"
    />
  );

  return { guard, modal };
};
