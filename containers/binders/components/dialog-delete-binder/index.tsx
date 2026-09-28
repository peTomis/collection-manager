// Libraries
import { useState } from "react";

// Components
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "@/redux/store";
import { deleteBinder, setBinder } from "@/redux/slices/binders";

interface DialogDeleteBinderProps {
  binder: string | null;
  onClose: () => void;
}

export default function DialogDeleteBinder({ binder, onClose }: DialogDeleteBinderProps) {
  const [name, setName] = useState("");

  const user = useSelector((state) => state.user.user) ?? "";

  const { binders } = useSelector((state) => state.binders);

  const binderData = binders.find((b) => b._id === binder) || null;

  const dispatch = useDispatch();

  const dispatchDeleteBinder = async () => {
    if (!binderData || !user) return;
    dispatch(deleteBinder(user, binderData._id));
    onClose();
  };

  return (
    <Dialog
      open={!!binder}
      onOpenChange={() => {
        setName("");
        onClose();
      }}
    >
      <DialogContent className="flex flex-col max-w-[300px] sm:max-w-md lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Delete binder</DialogTitle>
          <DialogDescription>Are you sure you want to delete this binder?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 md:gap-0 sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onClose()}>
            No
          </Button>
          <Button type="button" onClick={() => dispatchDeleteBinder()}>
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
