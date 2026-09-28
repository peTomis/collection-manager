// Libraries
import { CardHistoricPrice, Item, SealedHistoricPrice, ItemType as ItemTypeType, HistoricPrice } from "@/types/mongodb";
import { useState } from "react";
import { TrashIcon } from "lucide-react";

// Utils
import { getPrice, parseDate } from "@/utils/utils";

// Store
import { useSelector } from "@/redux/store";

// Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Molecules
import PriceDelta from "@/components/molecules/price-delta";
import ItemType from "@/components/molecules/item-type";
import Language from "@/components/molecules/language";
import MobileTableName from "@/components/molecules/mobile-table-name";
import MobileTableIcons from "@/components/molecules/mobile-table-icons";
import Variant from "@/components/molecules/variant";

interface TableItemsRecapProps {
  onItemRemoved: () => void;
}

const TableItemsRecap = ({ onItemRemoved }: TableItemsRecapProps) => {
  const [id, setId] = useState<string | undefined>(undefined);
  const [itemsToDisplay, setItemsToDisplay] = useState<Item[]>([]);

  const { historicPrices } = useSelector((state) => state.historicPrices);

  const deleteItem = async (id: string) => {
    try {
      const url = process.env.NEXT_PUBLIC_BACKEND_CLIENT;
      if (!url) return;

      await fetch(`${url}/data/item?id=${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      setId(undefined);
      onItemRemoved();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <Dialog
        open={!!id}
        onOpenChange={() => {
          setId(undefined);
        }}
      >
        <DialogContent className="sm:max-w-md lg:max-w-xl">
          <DialogHeader>
            <DialogTitle>Delete an item</DialogTitle>
            <DialogDescription>Are you sure you want to delete the item?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (id) deleteItem(id);
              }}
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col w-full col-span-1 lg:col-span-12 lg:h-[60vh]">
        <div className="sticky top-0 left-0 z-10 rounded-md bg-muted">
          <Input className="border-none" onChange={(event) => {}} placeholder="Search..." />
        </div>
        <TableItemsDesktop itemsToDisplay={itemsToDisplay} setId={setId} historicPrices={historicPrices} />
        <TableItemsMobile itemsToDisplay={itemsToDisplay} setId={setId} historicPrices={historicPrices} />
      </div>
    </>
  );
};

const TableItemsDesktop = ({ itemsToDisplay, setId, historicPrices }: { itemsToDisplay: Item[]; setId: (id: string) => void; historicPrices: HistoricPrice[] }) => {
  return (
    <div className="flex-1 hidden overflow-x-hidden overflow-y-auto lg:flex">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden text-center lg:table-cell">Type</TableHead>
            <TableHead className="hidden text-center lg:table-cell">Language</TableHead>
            <TableHead className="text-center lg:table-cell">Variant</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Update</TableHead>
            <TableHead className="hidden text-right lg:table-cell">1y</TableHead>
            <TableHead className="hidden text-right lg:table-cell">1m</TableHead>
            <TableHead className="hidden text-right lg:table-cell">1w</TableHead>
            <TableHead className="hidden text-right lg:table-cell">1d</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="hidden lg:table-cell"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itemsToDisplay.map((item) => {
            const historicPrice = historicPrices.find(
              (price) =>
                (item.type === ItemTypeType.CARD && (price as CardHistoricPrice).card === item.item) ||
                (item.type === ItemTypeType.SEALED && (price as SealedHistoricPrice).sealed === item.item)
            );
            if (!historicPrice) return null;
            const price = getPrice(historicPrice);
            return (
              <TableRow
                className="cursor-pointer"
                key={item._id.toString()}
                onClick={() => {
                  window.location.href = `/item?id=${item._id}`;
                }}
              >
                <MobileTableName item={item} />
                <TableCell className="hidden lg:font-medium lg:table-cell">{item.name}</TableCell>
                <MobileTableIcons item={item} historicPrice={historicPrice} full={false} />
                <TableCell className="hidden lg:table-cell">
                  <ItemType type={item.type} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">{item.language && <Language language={item.language} />}</TableCell>
                <TableCell className="hidden lg:table-cell">{item.variant && <Variant variant={item.variant} />}</TableCell>
                <TableCell className="hidden text-right lg:table-cell">{parseDate(historicPrice?.timestamp ?? 0)}</TableCell>
                <TableCell className="hidden text-right lg:table-cell">
                  <div className="flex justify-end w-full">
                    <PriceDelta value={price ?? 0} average={historicPrice?.prices1y?.[0] ?? price} />
                  </div>
                </TableCell>
                <TableCell className="hidden text-right lg:table-cell">
                  <div className="flex justify-end w-full">
                    <PriceDelta value={price ?? 0} average={historicPrice?.prices1m?.[0] ?? price} />
                  </div>
                </TableCell>
                <TableCell className="hidden text-right lg:table-cell">
                  <div className="flex justify-end w-full">
                    <PriceDelta value={price ?? 0} average={historicPrice?.prices1w?.[0] ?? price} />
                  </div>
                </TableCell>
                <TableCell className="hidden text-right lg:table-cell">
                  <div className="flex justify-end w-full">
                    <PriceDelta value={price ?? 0} average={historicPrice?.prices1d?.[0] ?? price} />
                  </div>
                </TableCell>
                <TableCell className="text-right align-top lg:align-middle mb-full">{price.toFixed(2) + " €"}</TableCell>
                <TableCell
                  className="hidden lg:table-cell"
                  onClick={(e) => {
                    e.stopPropagation();
                    setId(item?._id);
                  }}
                >
                  <TrashIcon className="w-5 h-5" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

const TableItemsMobile = ({ itemsToDisplay, setId, historicPrices }: { itemsToDisplay: Item[]; setId: (id: string) => void; historicPrices: HistoricPrice[] }) => {
  return (
    <div className="flex flex-1 overflow-x-hidden overflow-y-auto lg:hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden text-center lg:table-cell">Type</TableHead>
            <TableHead className="hidden text-center lg:table-cell">Language</TableHead>
            <TableHead className="text-center lg:table-cell">Variant</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Update</TableHead>
            <TableHead className="hidden text-right lg:table-cell">1y</TableHead>
            <TableHead className="hidden text-right lg:table-cell">1m</TableHead>
            <TableHead className="hidden text-right lg:table-cell">1w</TableHead>
            <TableHead className="hidden text-right lg:table-cell">1d</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="hidden lg:table-cell"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itemsToDisplay.map((item) => {
            const historicPrice = historicPrices.find(
              (price) =>
                (item.type === ItemTypeType.CARD && (price as CardHistoricPrice).card === item.item) ||
                (item.type === ItemTypeType.SEALED && (price as SealedHistoricPrice).sealed === item.item)
            );
            if (!historicPrice) return null;
            const price = getPrice(historicPrice);
            return (
              <TableRow
                className="cursor-pointer"
                key={item._id.toString()}
                onClick={() => {
                  window.location.href = `/item?id=${item._id}`;
                }}
              >
                <MobileTableName item={item} />
                <TableCell className="hidden lg:font-medium lg:table-cell">{item.name}</TableCell>
                <MobileTableIcons item={item} historicPrice={historicPrice} full={false} />
                <TableCell className="hidden lg:table-cell">
                  <ItemType type={item.type} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">{item.language && <Language language={item.language} />}</TableCell>
                <TableCell className="hidden lg:table-cell">{item.variant && <Variant variant={item.variant} />}</TableCell>
                <TableCell className="hidden text-right lg:table-cell">{parseDate(historicPrice?.timestamp ?? 0)}</TableCell>
                <TableCell className="hidden text-right lg:table-cell">
                  <div className="flex justify-end w-full">
                    <PriceDelta value={price ?? 0} average={historicPrice?.average1y ?? price} />
                  </div>
                </TableCell>
                <TableCell className="hidden text-right lg:table-cell">
                  <div className="flex justify-end w-full">
                    <PriceDelta value={price ?? 0} average={historicPrice?.average1m ?? price} />
                  </div>
                </TableCell>
                <TableCell className="hidden text-right lg:table-cell">
                  <div className="flex justify-end w-full">
                    <PriceDelta value={price ?? 0} average={historicPrice?.average1w ?? price} />
                  </div>
                </TableCell>
                <TableCell className="hidden text-right lg:table-cell">
                  <div className="flex justify-end w-full">
                    <PriceDelta value={price ?? 0} average={historicPrice?.average1d ?? price} />
                  </div>
                </TableCell>
                <TableCell className="text-right align-top lg:align-middle mb-full">{price.toFixed(2) + " €"}</TableCell>
                <TableCell
                  className="hidden lg:table-cell"
                  onClick={(e) => {
                    e.stopPropagation();
                    setId(item?._id);
                  }}
                >
                  <TrashIcon className="w-5 h-5" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default TableItemsRecap;
