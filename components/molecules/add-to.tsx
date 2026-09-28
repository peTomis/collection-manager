/* eslint-disable @next/next/no-img-element */
import { CardVariant, CardVariantType, Language, SealedVariant } from "@/types/mongodb";
import { BookIcon, HeartIcon } from "lucide-react";

const AddTo = ({
  isInWishlist,
  isInCollection,
  onWishlistToggle,
  onCollectionToggle,
}: {
  isInWishlist: boolean;
  isInCollection: boolean;
  onWishlistToggle: () => void;
  onCollectionToggle: () => void;
}) => {
  return (
    <div className="flex flex-row mx-auto my-2 space-x-[2px] overflow-hidden rounded-lg bg-muted">
      <TypeSelectBarItem
        selected={isInCollection}
        language={Language.ENGLISH}
        type={CardVariantType.REGULAR}
        onClick={onCollectionToggle}
        icon={<BookIcon className="w-5 h-5" />}
      />
      <TypeSelectBarItem
        selected={isInWishlist}
        language={Language.ENGLISH}
        type={CardVariantType.REGULAR}
        onClick={onWishlistToggle}
        icon={<HeartIcon className="w-5 h-5" />}
        red
      />
    </div>
  );
};

const TypeSelectBarItem = ({
  language,
  type,
  selected,
  onClick,
  icon,
  red = false,
}: {
  language: string;
  type: string;
  selected: boolean;
  icon: React.ReactNode;
  onClick: (language: Language, type: CardVariantType) => void;
  red?: boolean;
}) => {
  return (
    <div
      className={`select-none overflow-hidden flex w-[75px] h-[30px] justify-center items-center cursor-pointer ${
        selected ? (red ? "text-red-600 bg-red-900" : "bg-yellow-400 text-yellow-200") : "grayscale bg-black opacity-50"
      } hover:grayscale-0 hover:opacity-80 ${red ? "hover:text-red-800 hover:bg-red-200" : "hover:text-yellow-700 hover:bg-yellow-100"}`}
      onClick={() => onClick(language as Language, type as CardVariantType)}
    >
      {icon}
    </div>
  );
};

export default AddTo;
