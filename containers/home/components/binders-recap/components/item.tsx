import PriceDelta from "@/components/molecules/price-delta";

export const setColor: {
  [key: string]: { color: string; textColor: string };
} = {
  "Set Base": { color: "#1158FFFF", textColor: "white" },
  "Base Set": { color: "#1158FFFF", textColor: "white" },
  Jungle: { color: "#009B00FF", textColor: "white" },
  Fossil: { color: "#CB661FFF", textColor: "white" },
  "Team Rocket": { color: "#282828FF", textColor: "white" },
  "Gym Heroes": { color: "#1E90FF", textColor: "white" },
  "Gym Challenge": { color: "#FFD700", textColor: "black" },
  "Southern Island": { color: "#00CED1", textColor: "black" },
  "151": { color: "#FF88F7FF", textColor: "white" },
  "Wizards Black Star Promo": { color: "#CDDE1CFF", textColor: "black" },
};

export interface SetRecapItem {
  name: string;
  color: string;
  textColor: string;
  price: number;
  average1d: number;
  average1w: number;
  average1m: number;
  average1y: number;
}

interface SetItemProps {
  set: SetRecapItem;
}

const SetItem = ({ set }: SetItemProps) => {
  const src = `./sets/${set.name.toLowerCase().replaceAll(" ", "_")}.png`;

  return (
    <div className="flex flex-row select-none cursor-pointer items-center rounded-lg h-[40px]" style={{ backgroundColor: set.color, color: set.textColor }}>
      <div className="pl-2 block lg:hidden xl:block w-[120px] xl:w-[40px] xl:pt-[2px] justify-center items-center">
        <img src={src} width={50} height={50} alt="Card" />
      </div>
      <div className="flex flex-col justify-between w-full">
        <div className="flex  font-bold text-sm flex-row h-[25px] items-center">
          <div className="pl-2 hidden lg:block xl:hidden w-[120px] lg:w-[80px] lg:pt-[2px] justify-center items-center">
            <img src={src} width={50} height={50} alt="Card" />
          </div>
          <div className="flex justify-start w-full pl-4 line-clamp-1 text-ellipsis">{set.name.length > 20 ? set.name.slice(0, 15) + "..." : set.name}</div>
          <div className="flex justify-end w-full pr-4">{set.price.toFixed(2) + " €"}</div>
        </div>
        <div className="flex justify-end overflow-hidden rounded-br-lg">
          <div className="flex flex-row h-[15px] bg-black pr-2 pl-8 space-x-4 rounded-tl-full text-xs opacity-60">
            <SetDeltaItem label={"Y"} value={set.price} average={set.average1y ?? set.price} />
            <SetDeltaItem label={"M"} value={set.price} average={set.average1m ?? set.price} />
            <SetDeltaItem label={"W"} value={set.price} average={set.average1w ?? set.price} />
            <SetDeltaItem label={"D"} value={set.price} average={set.average1d ?? set.price} />
          </div>
        </div>
      </div>
    </div>
  );
};

const SetDeltaItem = ({ label, value, average }: { label: string; value: number; average: number }) => (
  <div className="flex flex-row space-x-2 text-white">
    <div>{label}: </div>
    <PriceDelta altSize value={value} hideArrow average={average} />
  </div>
);

export default SetItem;
