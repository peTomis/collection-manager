import { ChartLineIcon, InfoIcon } from "lucide-react";
import { ReactNode } from "react";

interface DataToViewSelectProps {
  showData: boolean;
  onToggle: () => void;
}

const DataToViewSelect = ({ showData, onToggle }: DataToViewSelectProps) => {
  const selected = true;
  return (
    <div className="flex flex-row h-full mx-auto overflow-hidden">
      <DataToViewSelectContainer selected={!showData} onToggle={onToggle}>
        <ChartLineIcon className="w-4 h-4 md:w-6 md:h-6" />
      </DataToViewSelectContainer>
      <DataToViewSelectContainer selected={showData} onToggle={onToggle} right>
        <InfoIcon className="w-4 h-4 md:w-6 md:h-6" />
      </DataToViewSelectContainer>
    </div>
  );
};

const DataToViewSelectContainer = ({ selected, children, onToggle, right }: { selected: boolean; children: ReactNode; onToggle: () => void; right?: boolean }) => {
  return (
    <div
      className={` relative border-y border-white p-3 bg-background mb-6 md:mb-0 select-none overflow-hidden flex w-[50px] md:w-[75px] h-[30px] md:h-[36px] justify-center items-center cursor-pointer ${
        selected ? "" : "grayscale opacity-30"
      } ${right ? "border-r border-l rounded-r-md" : "border-l border-r rounded-l-md"} hover:grayscale-0 hover:opacity-80 hover:bg-muted`}
      onClick={onToggle}
    >
      {children}
    </div>
  );
};

export default DataToViewSelect;
