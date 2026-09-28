// Libraries
import { useState } from "react";

// Components
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "@/redux/store";
import { deleteWishlist } from "@/redux/slices/wishlists";

interface DialogDeleteWishlistProps {
  wishlist: string | null;
  onClose: () => void;
}

export default function DialogDeleteWishlist({ wishlist, onClose }: DialogDeleteWishlistProps) {
  const [name, setName] = useState("");

  const user = useSelector((state) => state.user.user) ?? "";

  const { wishlists } = useSelector((state) => state.wishlists);

  const wishlistData = wishlists.find((b) => b._id === wishlist) || null;

  const dispatch = useDispatch();

  const dispatchDeleteWishlist = async () => {
    if (!wishlistData || !user) return;
    dispatch(deleteWishlist(user, wishlistData._id));
    onClose();
  };

  return (
    <Dialog
      open={!!wishlist}
      onOpenChange={() => {
        setName("");
        onClose();
      }}
    >
      <DialogContent className="flex flex-col max-w-[300px] sm:max-w-md lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Delete wishlist</DialogTitle>
          <DialogDescription>Are you sure you want to delete this wishlist?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 md:gap-0 sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onClose()}>
            No
          </Button>
          <Button type="button" onClick={() => dispatchDeleteWishlist()}>
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
