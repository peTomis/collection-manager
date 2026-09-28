import { BoxIcon } from "lucide-react";

const ItemType = ({ type }: { type: string }) => {
  if (type === "card")
    return (
      <div className="flex items-center justify-center">
        <img src={"./assets/card_bg_logo.png"} width={18} height={18} alt="Card" />
      </div>
    );
  if (type === "sealed")
    return (
      <div className="flex items-center justify-center">
        <BoxIcon className="w-5 h-5" />
      </div>
    );
  return <></>;
};

export default ItemType;
