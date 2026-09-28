// Libraries
import { useState } from "react";

// Components
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "@/redux/store";
import { Input } from "@/components/ui/input";
import { createWishlist } from "@/redux/slices/wishlists";

interface DialogAddWishlistProps {
  open: boolean;
  close: () => void;
  onItemAdded: () => void;
}

export default function DialogAddWishlist({ open, close, onItemAdded }: DialogAddWishlistProps) {
  const [name, setName] = useState("");

  const user = useSelector((state) => state.user.user) ?? "";

  const dispatch = useDispatch();

  const saveWishlist = async () => {
    dispatch(createWishlist(user, name));
    onItemAdded();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setName("");
        close();
      }}
    >
      <DialogContent className="flex flex-col max-w-[300px] sm:max-w-md lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a wishlist</DialogTitle>
          <DialogDescription>Choose a name for your wishlist.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-start w-full h-full py-8 space-y-2">
          <Input className="mb-2" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Type a name...`} />
        </div>
        <DialogFooter className="flex sm:justify-end">
          <Button type="button" onClick={() => saveWishlist()}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
