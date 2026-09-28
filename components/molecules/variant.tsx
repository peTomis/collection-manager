import { CardVariantType } from "@/types/mongodb";

const Variant = ({ variant }: { variant: CardVariantType }) => {
  if (variant === CardVariantType.FIRST_EDITION)
    return (
      <div className="flex items-center justify-center w-full">
        <img src={"./assets/first_edition.png"} width={18} height={18} className="rounded-md" alt="Card" />
      </div>
    );
  if (variant === CardVariantType.ONE_STAR) return <div>One Star</div>;
  if (variant === CardVariantType.REVERSE_HOLO)
    return (
      <div className="flex items-center justify-center w-full">
        <div className="h-[18px] flex justify-center items-center w-[18px] bg-pink-800 font-thin">HR</div>
      </div>
    );
  if (variant === CardVariantType.SHADOWLESS)
    return (
      <div className="flex items-center justify-center w-full">
        <div className="h-[18px] flex justify-center items-center w-[18px] bg-yellow-800 rounded-full">S</div>
      </div>
    );
  if (variant === CardVariantType.TWO_STAR) return <div>Two Star</div>;
  return <></>;
};

export default Variant;
