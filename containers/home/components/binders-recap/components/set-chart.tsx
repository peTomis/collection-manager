import { PieChart, Pie, Cell } from "recharts";
import { SetRecapItem } from "./item";
import { useSelector } from "@/redux/store";

interface SetChart {
  sets: SetRecapItem[];
}

const SetChart = ({ sets }: SetChart) => {
  const { portfolio } = useSelector((state) => state.portfolio);

  return (
    <div className="relative flex justify-center items-center w-[200px] h-[200px] lg:w-[140px] lg:h-[140px] 2xl:w-[200px] 2xl:h-[200px]">
      <div className="absolute text-lg font-bold">{(portfolio?.value ?? 0).toFixed(2) + " €"}</div>
      <div className="absolute">
        <PieChart width={200} height={200}>
          <Pie data={sets} cx={100} cy={100} innerRadius={60} outerRadius={80} stroke="none" paddingAngle={5} dataKey="price">
            {sets.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </div>
    </div>
  );
};

export default SetChart;
