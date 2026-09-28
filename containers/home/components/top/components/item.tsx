import ItemType from "@/components/molecules/item-type";
import Language from "@/components/molecules/language";
import OutOfStock from "@/components/molecules/out-of-stock";
import PriceDelta from "@/components/molecules/price-delta";
import Variant from "@/components/molecules/variant";
import { HistoricPrice, Item } from "@/types/mongodb";
import { getPrice } from "@/utils/utils";

interface TopItemProps {
  price: HistoricPrice;
  item: Item;
  image: string;
}

const TopItem = ({ item, image, price }: TopItemProps) => {
  const Image = () => {
    if (!image) return <></>;
    if (item?.type === "card") return <img src={image} width={60} className="rounded-sm" alt="Card" />;
    return <img src={image} width={80} className="rounded-sm" alt="Card" />;
  };

  return (
    <a title="item" href={`/item?id=${item?._id}`} className="flex w-full cursor-pointer">
      <div className="flex flex-col w-full p-2 mt-2 rounded-sm lg:p-2 xl:p-4 lg:flex-row xl:flex-col bg-background" key={price._id}>
        <div className="w-full">
          <div className="text-xs font-light text-center lg:text-start xl:text-center line-clamp-1">{item?.name}</div>
          <div className="flex flex-row items-center justify-center lg:pt-4 xl:pt-2 lg:justify-start xl:justify-center py-2 h-[41px] lg:h-[20px] xl:h-[41px] space-x-2">
            <ItemType type={item?.type} />
            {item?.language && <Language language={item?.language} />}
            {item?.variant && <Variant variant={item?.variant} />}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center lg:justify-start xl:justify-center xl:w-full">
          <div className="flex lg:hidden xl:flex items-center justify-center h-[92px]">
            <Image />
          </div>
          <div className="flex flex-row items-center justify-center py-2 space-x-2 text-xl font-bold text-center lg:py-0 xl:py-2">
            <div className="text-xl font-bold text-center">{getPrice(price).toFixed(2)}</div>
            <div className="hidden text-xl font-bold text-center lg:flex">{"€"}</div>
          </div>
          <div className="text-xs">{price.price === -1 ? <OutOfStock /> : <PriceDelta value={price.price} average={price.prices1d?.[0] ?? price.price} />}</div>
        </div>
      </div>
    </a>
  );
};

export default TopItem;
