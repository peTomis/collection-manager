import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const DatabaseSelect = ({
  selected,
  onChange,
  list,
  placeholder,
  active = true,
  set = false,
}: {
  list: { label: string; value: string }[];
  selected: string;
  onChange: (value: string) => void;
  placeholder: string;
  active?: boolean;
  set?: boolean;
}) => {
  const [search, setSearch] = useState("");

  const filteredList = list.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card className="flex flex-col max-h-[256px] min-h-[256px] md:max-h-full md:h-full p-4">
      {active && (
        <>
          <Input className="mb-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${placeholder}...`} />
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filteredList.map((item, index) => {
              const src = `./sets/${item.label.toLowerCase().replaceAll(" ", "_")}.png`;

              return (
                <div
                  key={index + item.value}
                  className={`p-2 cursor-pointer rounded-md space-x-2 flex flex-row items-center hover:bg-white hover:bg-opacity-10 ${
                    selected === item.value ? "font-bold" : selected !== "" ? "opacity-40" : ""
                  }`}
                  onClick={() => {
                    onChange(item.value);
                  }}
                >
                  {set ? src ? <img src={src} alt="set icon" className="inline w-5 h-4" /> : <div className="w-4 h-4"></div> : null}
                  <div>{item.label}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
};

export default DatabaseSelect;
