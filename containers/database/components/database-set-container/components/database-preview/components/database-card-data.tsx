import { Card } from "@tcgdex/sdk";

interface DatabaseCardDataProps {
  data: Card | null;
}

const DatabaseCardData = ({ data }: DatabaseCardDataProps) => {
  return (
    <div className="flex flex-col h-full px-4 pt-8 space-y-4">
      <DataItem title="Name" value={data?.name ?? null} />
      <DataItem title="Set" value={data?.set?.name ?? null} />
      <DataItem title="Rarity" value={data?.rarity ?? null} />
      <DataItem title="Type" value={data?.types?.[0] ?? null} />
      <DataItem title="Illustrator" value={data?.illustrator ?? null} />
    </div>
  );
};

const DataItem = ({ title, value }: { title: string; value: string | number | null }) => (
  <div className="flex justify-between space-x-2">
    <span className="font-medium text-white opacity-50">{title}</span>
    <span className="font-semibold text-white">{value ?? "-"}</span>
  </div>
);

export default DatabaseCardData;
