// Utils
import { parseDate } from "@/utils/utils";

// Types
import { Item, Price } from "@/types/mongodb";

// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PriceHistoryProps {
  item: Item;
  prices: Price[];
}

const PriceHistory = ({ item, prices }: PriceHistoryProps) => {
  const pricesToShow = [...prices].reverse();

  return (
    <Card className="w-[90vw] h-full lg:w-full p-4 flex flex-col">
      <CardHeader>
        <CardTitle>Price History</CardTitle>
      </CardHeader>

      <CardContent className="overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pricesToShow.map((price: Price) => (
              <TableRow key={price._id}>
                <TableCell>{parseDate(price.timestamp ?? new Date().getTime())}</TableCell>
                <TableCell className="text-center">{price.items ? (price.items === 50 ? "50+" : price.items) : ""}</TableCell>
                <TableCell>{price.price.toFixed(2)} €</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PriceHistory;
