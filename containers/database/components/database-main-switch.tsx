const DatabaseMainSwitch = ({ name, onClick, selected = false }: { name: string; onClick: () => void; selected?: boolean }) => {
  return (
    <div
      className={`font-bold py-2 w-[100px] text-center text-lg border rounded-lg cursor-pointer ${selected ? "bg-white text-background" : " hover:bg-white hover:bg-opacity-10"}`}
      onClick={onClick}
    >
      {name}
    </div>
  );
};

export default DatabaseMainSwitch;
