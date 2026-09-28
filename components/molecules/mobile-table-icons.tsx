import { HistoricPrice, Item } from "@/types/mongodb";
import { TableCell } from "../ui/table";
import ItemType from "./item-type";
import PriceDelta from "./price-delta";
import Language from "./language";
import Variant from "./variant";
import { getPrice } from "@/utils/utils";

interface MobileTableIconsProps {
  item: Item;
  historicPrice: HistoricPrice;
  full?: boolean;
}

const MobileTableIcons = ({ item, historicPrice, full = true }: MobileTableIconsProps) => {
  const price = getPrice(historicPrice);
  return (
    <TableCell className="table-cell lg:font-medium lg:hidden">
      <div className="flex flex-col items-center justify-start space-y-2">
        <div className="flex flex-row space-x-2">
          <ItemType type={item.type} />
          {item.language && <Language language={item.language} />}
          {item.variant && <Variant variant={item.variant} />}
        </div>
        <div className="flex flex-row space-x-2 opacity-50 font-extralight">
          <PriceDelta value={price} average={historicPrice.average1d ?? price} />
        </div>
      </div>
    </TableCell>
  );
};

export default MobileTableIcons;
