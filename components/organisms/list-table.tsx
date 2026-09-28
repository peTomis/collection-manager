import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSelector } from "@/redux/store";
import { BinderItem, WishlistItem } from "@/types/mongodb";
import PriceDelta from "../molecules/price-delta";
import { getPrice } from "@/utils";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";

interface ListTableProps {
  type: "binder" | "wishlist" | "list" | "sealed-list";
  sortedItems: (BinderItem | WishlistItem)[];
  total: {
    price: number;
    oneY: number;
    oneM: number;
    oneW: number;
    oneD: number;
  };
  onChange: (id: string, quantity: number) => void;
}

const ListTable = ({ sortedItems, type, total, onChange }: ListTableProps) => {
  return (
    <>
      <div className="hidden overflow-y-auto md:flex">
        <ListTableDesktop sortedItems={sortedItems} total={total} onChange={onChange} type={type} />
      </div>
      <div className="flex overflow-y-auto md:hidden">
        <ListTableMobile sortedItems={sortedItems} total={total} type={type} onChange={onChange} />
      </div>
    </>
  );
};

const ListTableDesktop = ({ sortedItems, total, onChange, type }: ListTableProps) => {
  const { sets } = useSelector((state) => state.sets);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="sticky top-0 z-20 bg-muted">Name</TableHead>
          <TableHead className="sticky top-0 z-20 bg-muted w-[40px]"></TableHead>
          <TableHead className="sticky top-0 z-20 bg-muted w-[40px]"></TableHead>
          <TableHead className={`sticky top-0 z-20 text-right bg-muted ${type === "sealed-list" ? "w-[10px]" : "w-[100px]"}`}>1y</TableHead>
          <TableHead className={`sticky top-0 z-20 text-right bg-muted ${type === "sealed-list" ? "w-[80px]" : "w-[100px]"}`}>1m</TableHead>
          <TableHead className={`sticky top-0 z-20 text-right bg-muted ${type === "sealed-list" ? "w-[80px]" : "w-[100px]"}`}>1w</TableHead>
          <TableHead className={`sticky top-0 z-20 text-right bg-muted ${type === "sealed-list" ? "w-[80px]" : "w-[100px]"}`}>1d</TableHead>
          <TableHead className="sticky top-0 z-20 text-right bg-muted w-[100px]">Price</TableHead>
          {type != "list" && type != "sealed-list" && <TableHead className="sticky top-0 z-20 bg-muted w-[90px]"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow key={"recap"}>
          <TableCell className="sticky z-20 top-10 bg-slate-800 hover:bg-slate-800">Total</TableCell>
          <TableCell className="sticky z-20 top-10 bg-slate-800 hover:bg-slate-800"></TableCell>
          <TableCell className="sticky z-20 top-10 bg-slate-800 hover:bg-slate-800"></TableCell>
          <TableCell className="sticky z-20 top-10 bg-slate-800 hover:bg-slate-800">
            <div className={`flex justify-end w-full ${type === "sealed-list" ? "w-[80px]" : "w-[100px]"}`}>
              <PriceDelta value={total.price} average={total.oneY} />
            </div>
          </TableCell>
          <TableCell className="sticky z-20 table-cell text-right top-10 bg-slate-800 hover:bg-slate-800">
            <div className={`flex justify-end w-full ${type === "sealed-list" ? "w-[80px]" : "w-[100px]"}`}>
              <PriceDelta value={total.price} average={total.oneM} />
            </div>
          </TableCell>
          <TableCell className="sticky z-20 table-cell text-right top-10 bg-slate-800 hover:bg-slate-800">
            <div className={`flex justify-end w-full ${type === "sealed-list" ? "w-[80px]" : "w-[100px]"}`}>
              <PriceDelta value={total.price} average={total.oneW} />
            </div>
          </TableCell>
          <TableCell className="sticky z-20 table-cell text-right top-10 bg-slate-800 hover:bg-slate-800 ">
            <div className={`flex justify-end w-full ${type === "sealed-list" ? "w-[80px]" : "w-[100px]"}`}>
              <PriceDelta value={total.price} average={total.oneD} />
            </div>
          </TableCell>
          <TableCell className="sticky z-20 text-right align-top lg:align-middle mb-full top-10 bg-slate-800 hover:bg-slate-800">{total.price.toFixed(2) + " €"}</TableCell>
          {type != "list" && type != "sealed-list" && <TableCell className="sticky z-20 top-10 bg-slate-800 hover:bg-slate-800"></TableCell>}
        </TableRow>
        {sortedItems.map((item) => {
          const historicPrice = item.historicPrice;
          if (!historicPrice) return null;
          const price = getPrice(historicPrice);

          const set = sets.find((s) => s._id === item.item.set);
          const src = set ? `./sets/${set.name.toLowerCase().replaceAll(" ", "_")}.png` : null;

          return (
            <TableRow
              className="cursor-pointer"
              key={(item.historicPrice?._id ?? item._id).toString()}
              onClick={() => {
                if (type === "sealed-list") {
                  onChange(item._id + "?" + item.historicPrice.language, 0);
                  return;
                }
                window.open(historicPrice.url);
              }}
            >
              <TableCell className="max-w-[30ch] truncate whitespace-nowrap overflow-hidden">{item.name}</TableCell>
              <TableCell>{src ? <img src={src} alt="set icon" className="inline w-5 h-4" /> : <div className="w-4 h-4"></div>}</TableCell>
              <TableCell>{historicPrice.language === "en" ? "🇬🇧" : "🇮🇹"}</TableCell>
              <TableCell>
                <div className={`flex justify-end w-full ${type === "sealed-list" ? "w-[80px]" : "w-[100px]"}`}>
                  <PriceDelta value={price ?? 0} average={(historicPrice?.prices1y?.[0] ?? price) * ((item as BinderItem).quantity ?? 1)} />
                </div>
              </TableCell>
              <TableCell className="table-cell text-right ">
                <div className={`flex justify-end w-full ${type === "sealed-list" ? "w-[80px]" : "w-[100px]"}`}>
                  <PriceDelta value={price ?? 0} average={(historicPrice?.prices1m?.[0] ?? price) * ((item as BinderItem).quantity ?? 1)} />
                </div>
              </TableCell>
              <TableCell className="table-cell text-right ">
                <div className={`flex justify-end w-full ${type === "sealed-list" ? "w-[80px]" : "w-[100px]"}`}>
                  <PriceDelta value={price ?? 0} average={(historicPrice?.prices1w?.[0] ?? price) * ((item as BinderItem).quantity ?? 1)} />
                </div>
              </TableCell>
              <TableCell className="table-cell text-right">
                <div className={`flex justify-end w-full ${type === "sealed-list" ? "w-[80px]" : "w-[100px]"}`}>
                  <PriceDelta value={price ?? 0} average={(historicPrice?.prices1d?.[0] ?? price) * ((item as BinderItem).quantity ?? 1)} />
                </div>
              </TableCell>
              <TableCell className="text-right align-top lg:align-middle mb-full">{(price * ((item as BinderItem).quantity ?? 1)).toFixed(2) + " €"}</TableCell>
              {type != "list" && type != "sealed-list" && (
                <TableCell className="flex items-end justify-end text-right">
                  <LastColumn item={item} type="binder" onChange={onChange} />
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

const LastColumn = ({ item, type, onChange }: { item: BinderItem | WishlistItem; type: "binder"; onChange: (id: string, quantity: number) => void }) => {
  if (type === "binder")
    return (
      <div className="flex flex-row space-x-2">
        <div
          className="flex items-center justify-center w-5 h-5 bg-black rounded-full cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onChange(item._id, (item as BinderItem).quantity - 1);
          }}
        >
          <MinusIcon className="w-4 h-4" />
        </div>
        <div>{(item as BinderItem).quantity}</div>
        <div
          className="flex items-center justify-center w-5 h-5 text-black bg-white rounded-full cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onChange(item._id, (item as BinderItem).quantity + 1);
          }}
        >
          <PlusIcon className="w-4 h-4" />
        </div>
      </div>
    );
  return (
    <div
      className="flex items-center justify-center w-5 h-5 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onChange(item._id, 0);
      }}
    >
      <Trash2Icon className="w-5 h-5" />
    </div>
  );
};

const ListTableMobile = ({ type, onChange, sortedItems, total }: ListTableProps) => {
  const { sets } = useSelector((state) => state.sets);

  return (
    <div className="flex flex-col w-full">
      <div className="bg-white/20 hover:bg-white/20">
        <ListTableMobileCell
          key={"Title"}
          name={"Total"}
          onClick={() => {}}
          language={""}
          src={null}
          price={total.price}
          price1d={total.oneD}
          price1w={total.oneW}
          price1m={total.oneM}
          price1y={total.oneY}
        />
      </div>
      {sortedItems.map((item, index) => {
        const historicPrice = item.historicPrice;
        if (!historicPrice) return null;
        const price = getPrice(historicPrice);

        const set = sets.find((s) => s._id === item.item.set);
        const src = set ? `./sets/${set.name.toLowerCase().replaceAll(" ", "_")}.png` : null;

        return (
          <ListTableMobileCell
            key={item._id + index}
            name={item.name}
            onClick={() => {
              if (type === "sealed-list") {
                onChange(item._id + "?" + item.historicPrice.language, 0);
                return;
              }
              window.open(historicPrice.url);
            }}
            language={historicPrice.language === "en" ? "🇬🇧" : "🇮🇹"}
            src={src}
            price={price * ((item as BinderItem).quantity ?? 1)}
            price1d={(historicPrice?.prices1d?.[0] ?? price) * ((item as BinderItem).quantity ?? 1)}
            price1w={(historicPrice?.prices1w?.[0] ?? price) * ((item as BinderItem).quantity ?? 1)}
            price1m={(historicPrice?.prices1m?.[0] ?? price) * ((item as BinderItem).quantity ?? 1)}
            price1y={(historicPrice?.prices1y?.[0] ?? price) * ((item as BinderItem).quantity ?? 1)}
          />
        );
      })}
    </div>
  );
};

const ListTableMobileCell = ({
  name,
  src,
  language,
  price,
  price1d,
  price1w,
  price1m,
  price1y,
  onClick,
}: {
  name: string;
  language: string;
  src: string | null;
  price: number;
  price1d: number;
  price1w: number;
  price1m: number;
  price1y: number;
  onClick: () => void;
}) => {
  return (
    <div className="flex flex-col p-2 border-b" onClick={onClick}>
      <div className="flex flex-row justify-between font-bold">
        <div>{name.length > 20 ? name.slice(0, 16) + "..." : name}</div>
        <div>{price.toFixed(2) + " €"}</div>
      </div>
      <div className="flex flex-row justify-between">
        <div className="flex flex-row items-center space-x-2">
          <div>{src ? <img src={src} alt="set icon" className="inline w-4 h-3" /> : <div className="w-4 h-4"></div>}</div>
          {name !== "Total" && <div className="mt-1">{language}</div>}
        </div>
        <div className="flex flex-row text-xs font-light opacity-70">
          <PriceDelta value={price ?? 0} average={price1d} />
          <PriceDelta value={price ?? 0} average={price1y} />
        </div>
      </div>
    </div>
  );
};

export default ListTable;
