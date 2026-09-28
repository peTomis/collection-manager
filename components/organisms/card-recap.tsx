// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RecapText from "@/components/atoms/recap-text";
import { Card as CardType, Set, Sealed, Item, CardVariantType } from "@/types/mongodb";
import Language from "../molecules/language";

interface CardRecapProps {
  item: Item | undefined;
  card: CardType | undefined;
  sealed: Sealed | undefined;
  set: Set | undefined;
}

const CardRecap = ({ item, card, sealed, set }: CardRecapProps) => {
  return (
    <Card className="w-[90vw] lg:w-full p-4 h-full flex flex-col">
      <CardHeader>
        <CardTitle>{card ? "Card Data" : "Sealed Data"}</CardTitle>
      </CardHeader>
      {card && (
        <CardContent>
          <div className="flex flex-col w-full p-2 space-y-2">
            <RecapText label="Name" value={card?.name} />
            {set && <RecapText label="Set" value={set?.name} />}
            <RecapText label="Number" value={String(card?.number)} />
            <div className="flex flex-row space-x-4">
              <div className="flex font-bold w-[120px]">{"Language"}</div>
              {item && (
                <div className="flex max-w-[360px] truncate">
                  <Language language={item.language} />
                </div>
              )}
            </div>
            {item?.variant && item?.variant !== CardVariantType.REGULAR && <RecapText label="Variant" value={item?.variant} />}
          </div>
        </CardContent>
      )}
      {sealed && (
        <CardContent>
          <div className="flex flex-col w-full p-2 space-y-2">
            <RecapText label="Name" value={sealed?.name} />
            {set && <RecapText label="Set" value={set?.name} />}
            <div className="flex flex-row space-x-4">
              <div className="flex font-bold w-[120px]">{"Language"}</div>
              {item && (
                <div className="flex max-w-[360px] truncate">
                  <Language language={item.language} />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default CardRecap;
