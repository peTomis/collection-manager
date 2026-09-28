// Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PriceDelta from "@/components/molecules/price-delta";
import MetricChart from "./components/metrics-chart";
import { useSelector } from "@/redux/store";

const Metrics = () => {
  return (
    <Card className="relative flex flex-col justify-between flex-none col-span-1 overflow-hidden lg:col-span-3">
      <Title />
      <Delta />
      <div className="absolute bottom-0 right-0 select-none lg:select-auto w-[400px]">
        <LinearGradient />
        <MetricChart />
      </div>
    </Card>
  );
};

const Title = () => {
  const { portfolio } = useSelector((state) => state.portfolio);

  const value = portfolio?.value ? portfolio?.value.toFixed(2) + " €" : "";

  return (
    <div className="z-20">
      <CardHeader>
        <CardTitle>Net Worth</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl">{value}</p>
      </CardContent>
    </div>
  );
};

const LinearGradient = () => <div className="absolute bottom-0 z-10 w-full h-screen select-none bg-gradient-to-r from-20% from-muted to-transparent lg:select-auto"></div>;

const Delta = () => {
  const { portfolio } = useSelector((state) => state.portfolio);

  const getNetWorth = (days: number) => {
    const max = portfolio?.historicValue?.length ?? 0;
    if (max < days) return portfolio?.historicValue[0]?.value ?? 0;
    return portfolio?.historicValue[max - days - 1]?.value ?? 0;
  };

  const value = portfolio?.value ?? 0;

  const netWorth1D = getNetWorth(1);
  const netWorth1W = getNetWorth(7);
  const netWorth1M = getNetWorth(30);
  const netWorth1Y = getNetWorth(365);

  return (
    <div className="z-20 p-6">
      <div className="flex flex-row space-x-2">
        <div className="w-[74px]">DAILY</div>
        <div className="mr-auto">
          <PriceDelta value={value} average={netWorth1D} />
        </div>
      </div>
      <div className="flex flex-row space-x-2">
        <div className="w-[74px]">WEEKLY</div>
        <div className="mr-auto">
          <PriceDelta value={value} average={netWorth1W} />
        </div>
      </div>
      <div className="flex flex-row space-x-2">
        <div className="w-[74px]">MONTHLY</div>
        <div className="mr-auto">
          <PriceDelta value={value} average={netWorth1M} />
        </div>
      </div>
      <div className="flex flex-row space-x-2">
        <div className="w-[74px]">YEARLY</div>
        <div className="mr-auto">
          <PriceDelta value={value} average={netWorth1Y} />
        </div>
      </div>
    </div>
  );
};

export default Metrics;
