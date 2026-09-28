"use client";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ItemData {
  timestamp: number;
  price: number;
}

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
};

interface ItemPriceChartProps {
  price: number;
  data: ItemData[];
  withPriceHeader?: boolean;
}

const ItemPriceChart = ({ data, price, withPriceHeader = true }: ItemPriceChartProps) => {
  const maximum = Math.max(...data.map((d) => d.price));
  return (
    <div>
      {withPriceHeader && (
        <div className="w-[90vw] lg:w-full lg:pl-8">
          <CardHeader>
            <CardTitle>Price: {price} €</CardTitle>
          </CardHeader>
        </div>
      )}
      <div className={`select-none lg:select-auto w-[80vw] lg:w-[400px]`}>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 0,
              right: 0,
            }}
          >
            {withPriceHeader && <CartesianGrid vertical={false} />}
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
            <Area isAnimationActive={false} dataKey="price" type="monotone" fill="#ffffff" fillOpacity={0.3} stroke="#aaaaaa" />
            <YAxis
              domain={[0, maximum * 1.2]}
              hide={withPriceHeader ? false : true}
              dataKey="price"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value + "€"}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
};

export default ItemPriceChart;
