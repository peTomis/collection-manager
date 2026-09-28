import { PlusIcon } from "lucide-react";

interface ButtonAddProps {
  onClick: () => void;
}

export default function ButtonAdd({ onClick }: ButtonAddProps) {
  return (
    <div onClick={onClick} className="hidden cursor-pointer absolute w-[60px] h-[60px] lg:flex justify-center items-center bg-blue-900 rounded-full bottom-4 right-4">
      <PlusIcon />
    </div>
  );
}
