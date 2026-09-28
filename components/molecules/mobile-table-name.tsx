import { Item } from "@/types/mongodb";
import { TableCell } from "../ui/table";

const MobileTableName = ({ item }: { item: Item }) => {
  const splitted = item.name.split(" ");
  const set = splitted[splitted.length - 1];
  const name = splitted.slice(0, splitted.length - 1).join(" ");
  return (
    <TableCell className="table-cell lg:font-medium lg:hidden">
      <div className="flex flex-col">
        <div className="flex flex-col max-w-[28vw]">{name}</div>
        <div className="flex flex-row items-center justify-start flex-none space-x-2 font-thin opacity-50">
          <div>{set}</div>
        </div>
      </div>
    </TableCell>
  );
};

export default MobileTableName;
