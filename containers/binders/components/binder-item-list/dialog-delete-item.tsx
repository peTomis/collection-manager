// Libraries
import { useState } from "react";

// Components
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "@/redux/store";
import { deleteBinder, deleteBinderItem, setBinder } from "@/redux/slices/binders";

interface DialogDeleteBinderProps {
  binder: string | null;
  item: string | null;
  onClose: () => void;
}

export default function DialogDeleteItem({ binder, item, onClose }: DialogDeleteBinderProps) {
  const [name, setName] = useState("");

  const user = useSelector((state) => state.user.user) ?? "";

  const { binders } = useSelector((state) => state.binders);

  const binderData = binders.find((b) => b._id === binder) || null;

  const dispatch = useDispatch();

  const dispatchDeleteBinderItem = async () => {
    if (!binderData || !user || !item) return;
    dispatch(deleteBinderItem(user, binderData._id, item));
    onClose();
  };

  return (
    <Dialog
      open={!!item}
      onOpenChange={() => {
        setName("");
        onClose();
      }}
    >
      <DialogContent className="flex flex-col max-w-[300px] sm:max-w-md lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Delete binder's item</DialogTitle>
          <DialogDescription>Are you sure you want to delete this item?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onClose()}>
            No
          </Button>
          <Button type="button" onClick={() => dispatchDeleteBinderItem()}>
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
