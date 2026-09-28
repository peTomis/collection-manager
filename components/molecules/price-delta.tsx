import { ArrowBigUp } from "lucide-react";

interface PriceDeltaProps {
  value: number;
  average: number;
  hideArrow?: boolean;
  altSize?: boolean;
}

const PriceDelta = ({ value, average, hideArrow = false, altSize = false }: PriceDeltaProps) => {
  const parseRatio = (now: number, average: number) => {
    const ratio = (now * 100) / average;
    const parsed = (ratio - 100).toFixed(2);
    const value = isNaN(parseFloat(parsed)) ? 0 : parseFloat(parsed);
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(0) + "k";
    }
    return value.toFixed(0);
  };

  return (
    <div
      className={`flex ${altSize ? "w-[24px] md:w-[30px]" : "w-[68px] md:w-[100px]"} flex-row items-center justify-end space-x-2 ${
        value > average ? "text-green-500" : value === average ? "" : "text-red-500"
      }`}
    >
      {!hideArrow && <ArrowBigUp className={`w-4 h-4 ${value > average ? "" : value === average ? "hidden" : "rotate-180"}`} />}
      {parseRatio(value, average) + (hideArrow ? "" : " %")}
    </div>
  );
};

export default PriceDelta;
