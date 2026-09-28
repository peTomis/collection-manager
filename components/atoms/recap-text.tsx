interface RecapTextProps {
  label: string;
  value: string;
}

const RecapText = ({ label, value }: RecapTextProps) => {
  return (
    <div className="flex flex-row space-x-4">
      <div className="flex font-bold w-[120px]">{label}</div>
      <div className="flex max-w-[360px] truncate">{value}</div>
    </div>
  );
};

export default RecapText;
