/* eslint-disable @next/next/no-img-element */
import { CardVariant, CardVariantType, Language, SealedVariant } from "@/types/mongodb";

const TypeSelect = ({
  variant,
  onClick,
  variants,
}: {
  variants: (CardVariant | SealedVariant)[];
  onClick: (variant: CardVariant | SealedVariant) => void;
  variant: CardVariant | SealedVariant | null;
}) => {
  return (
    <div className="flex flex-row mx-auto my-2 space-x-[2px] overflow-hidden rounded-lg bg-muted">
      {(variants ?? []).map((cardVariant) => {
        const type = (cardVariant as CardVariant).type;
        if (!type)
          return (
            <TypeSelectBarItem
              key={`${cardVariant.language}-${CardVariantType.REGULAR}`}
              selected={cardVariant.language === variant?.language}
              language={cardVariant.language}
              type={CardVariantType.REGULAR}
              onClick={onClick}
              url={cardVariant.url}
            />
          );
        return (
          <TypeSelectBarItem
            key={`${cardVariant.language}-${type}`}
            selected={cardVariant.language === variant?.language && type === (variant as CardVariant)?.type}
            language={cardVariant.language}
            type={type}
            onClick={onClick}
            url={cardVariant.url}
          />
        );
      })}
    </div>
  );
};

const TypeSelectBarItem = ({
  language,
  type,
  selected,
  onClick,
  url,
}: {
  language: string;
  type: string;
  selected: boolean;
  onClick: (variant: CardVariant | SealedVariant) => void;
  url: string;
}) => {
  const LanguageSection =
    language === Language.ITALIAN ? (
      <div className="absolute pointer-events-none flex w-[100px] h-[60px] items-center justify-center rotate-[30deg]">
        <img src={"./assets/italy.svg"} width={200} height={80} alt="Not Found Image" />
      </div>
    ) : (
      <div className="absolute pointer-events-none flex w-[130px] h-[60px] items-center justify-center rotate-[30deg]">
        <img src={"./assets/uk.svg"} width={200} height={80} alt="Not Found Image" />
      </div>
    );

  const FirstEditionSection =
    type === CardVariantType.FIRST_EDITION || type === CardVariantType.SHADOWLESS ? (
      <div className="z-10 pointer-events-none invert">
        <img src={"./assets/first_edition.png"} width={30} height={30} alt="Not Found Image" />
      </div>
    ) : (
      <></>
    );

  return (
    <div
      className={`relative  select-none overflow-hidden flex w-[75px] h-[30px] justify-center items-center cursor-pointer ${
        selected ? "" : "grayscale opacity-50"
      } hover:grayscale-0 hover:opacity-80`}
      onClick={() =>
        onClick({
          language: language as Language,
          type: type as CardVariantType,
          url,
        })
      }
    >
      {LanguageSection}
      {FirstEditionSection}
    </div>
  );
};

export default TypeSelect;
