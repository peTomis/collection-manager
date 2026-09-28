import RecapText from "@/components/atoms/recap-text";
import { getPrice, titleCaseWord } from "@/utils/utils";
import { CardVariantType, HistoricPrice, Item, Price } from "@/types/mongodb";
import { Card, CardContent } from "@/components/ui/card";
import Variant from "../molecules/variant";
import ItemPriceChart from "../molecules/item-price-chart";

interface ItemRecapProps {
  item: Item;
  image: string | undefined;
  historicPrice: HistoricPrice;
  prices: Price[];
}

const ItemRecap = ({ item, image, historicPrice, prices }: ItemRecapProps) => {
  return (
    <Card className="w-[90vw] lg:w-full p-4 flex justify-center items-center">
      <CardContent>
        <div className="flex lg:h-[300px] flex-col lg:flex-row w-[90vw] pt-6 space-y-8 lg:space-y-0 lg:space-x-4">
          <div className="flex items-center flex-none h-full mx-auto lg:pr-8">
            {image ? (
              <img src={image} width={200} height={280} className="rounded-md" alt="Card" />
            ) : (
              <img src={"./assets/card_bg.png"} width={200} height={280} className="rounded-md" alt="Card" />
            )}
          </div>
          <div className="flex flex-col flex-none mx-auto space-y-4">
            <div className="flex flex-col w-full mx-auto">
              <RecapText label="Name" value={item.name} />
              <RecapText label="Type" value={titleCaseWord(item.type)} />
            </div>
            {item.variant && item.variant !== CardVariantType.REGULAR && <Variant variant={item.variant} />}
            <div className="flex flex-col w-full mx-auto">
              <RecapText label="Average 1D" value={historicPrice?.average1d?.toFixed(2) + " €"} />
              <RecapText label="Average 1W" value={historicPrice?.average1w?.toFixed(2) + " €"} />
              <RecapText label="Average 1M" value={historicPrice?.average1m?.toFixed(2) + " €"} />
              <RecapText label="Average 1Y" value={historicPrice?.average1y?.toFixed(2) + " €"} />
            </div>
          </div>
          <div className="flex flex-row flex-1 mx-auto lg:justify-end">
            <ItemPriceChart price={getPrice(historicPrice)} data={prices} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ItemRecap;
