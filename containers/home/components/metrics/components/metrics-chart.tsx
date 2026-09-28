import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useSelector } from "@/redux/store";
import { Area, AreaChart } from "recharts";

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
};

const MetricChart = () => {
  const { portfolio } = useSelector((state) => state.portfolio);

  return (
    <ChartContainer config={chartConfig}>
      <AreaChart
        accessibilityLayer
        data={portfolio?.historicValue}
        margin={{
          left: 0,
          right: 0,
        }}
      >
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
        <Area dataKey="value" type="natural" fill="#00ff00" fillOpacity={0.05} stroke="#007000FF" strokeWidth={3} />
      </AreaChart>
    </ChartContainer>
  );
};

export default MetricChart;
