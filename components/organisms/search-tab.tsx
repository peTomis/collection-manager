import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSelector } from "@/redux/store";
import { PlusIcon, RecycleIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

const SearchTab = ({
  selected,
  onChange,
  list,
  placeholder,
  active = true,
  set = false,
  onAdd,
  onDelete,
}: {
  list: { label: string; value: string }[];
  selected: string;
  onChange: (value: string) => void;
  placeholder: string;
  active?: boolean;
  set?: boolean;
  onAdd?: () => void;
  onDelete?: (id: string) => void;
}) => {
  const [search, setSearch] = useState("");

  const { sets, tcgSets } = useSelector((state) => state.sets);

  const filteredList = list.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card className="flex flex-col min-h-0 p-4 max-h-[256px] md:max-h-full md:h-full">
      {active && (
        <>
          <div className="flex flex-row">
            <Input className="mb-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${placeholder}...`} />
            {onAdd && (
              <div className="flex items-center justify-center border h-[36px] w-[38px] ml-2 rounded-md cursor-pointer hover:bg-white hover:bg-opacity-10" onClick={onAdd}>
                <PlusIcon className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filteredList.map((item, index) => {
              const getSetIcon = () => {
                if (!set) return null;
                const _set = sets.find((s) => s._id === item.value) ?? null;
                if (!_set) return null;
                const tcgdexSet = tcgSets.find((ts) => ts.id === _set.tcgdex) ?? null;
                if (tcgdexSet) return tcgdexSet.images.symbol;
              };

              const setData = getSetIcon();

              return (
                <div
                  key={index + item.value}
                  className={`group p-2 cursor-pointer rounded-md space-x-2 flex flex-row items-center hover:bg-white hover:bg-opacity-10 ${
                    selected === item.value ? "font-bold" : selected !== "" ? "opacity-40" : ""
                  }`}
                  onClick={() => onChange(item.value)}
                >
                  {set ? setData ? <img src={setData} alt="set icon" className="inline w-4 h-4" /> : <div className="w-4 h-4"></div> : null}

                  <div className="w-full">{item.label}</div>

                  {onDelete && (
                    <div
                      className="p-1 ml-auto transition-opacity opacity-0 cursor-pointer group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.value);
                      }}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
};

export default SearchTab;
