// Libraries
import { useState } from "react";

// Components
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "@/redux/store";
import { deleteWishlistItem } from "@/redux/slices/wishlists";

interface DialogDeleteWishlistProps {
  wishlist: string | null;
  item: string | null;
  onClose: () => void;
}

export default function DialogDeleteItem({ wishlist, item, onClose }: DialogDeleteWishlistProps) {
  const user = useSelector((state) => state.user.user) ?? "";

  const { wishlists } = useSelector((state) => state.wishlists);

  const wishlistData = wishlists.find((b) => b._id === wishlist) || null;

  const dispatch = useDispatch();

  const dispatchDeleteWishlistItem = async () => {
    if (!wishlistData || !user || !item) return;
    dispatch(deleteWishlistItem(user, wishlistData._id, item));
    onClose();
  };

  return (
    <Dialog
      open={!!item}
      onOpenChange={() => {
        onClose();
      }}
    >
      <DialogContent className="flex flex-col sm:max-w-md lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Delete wishlist's item</DialogTitle>
          <DialogDescription>Are you sure you want to delete this item?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onClose()}>
            No
          </Button>
          <Button type="button" onClick={() => dispatchDeleteWishlistItem()}>
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
