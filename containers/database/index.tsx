// Components
import Topbar from "@/components/organisms/topbar";
import { useEffect, useState } from "react";
import DatabaseMainSwitch from "./components/database-main-switch";
import DatabaseSetContainer from "./components/database-set-container";
import DatabaseTypeContainer from "./components/database-type-container";
import { getBinders } from "@/redux/slices/binders";
import { useDispatch, useSelector } from "@/redux/store";
import { getWishlists } from "@/redux/slices/wishlists";

enum DatabaseCategory {
  SET = "SET",
  TYPE = "TYPE",
}

const DatabaseContainer = () => {
  const [category, setCategory] = useState<DatabaseCategory>(DatabaseCategory.SET);
  const { user } = useSelector((state) => state.user);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;
    dispatch(getBinders(user));
    dispatch(getWishlists(user));
  }, [user]);
  return (
    <main className="relative flex flex-col w-screen min-h-screen overflow-hidden md:h-screen">
      <div className="absolute top-0 left-0 w-screen h-screen bg-[url('/assets/bg.jpg')] bg-cover bg-center -z-10 opacity-10" />
      <Topbar />
      <div className="grid flex-1 w-full p-4 gap-4 grid-rows-[auto,1fr] min-h-0">
        <div className="flex flex-row items-center justify-center space-x-2">
          <DatabaseMainSwitch
            name={DatabaseCategory.SET}
            onClick={function (): void {
              setCategory(DatabaseCategory.SET);
            }}
            selected={category === DatabaseCategory.SET}
          />
          <DatabaseMainSwitch
            name={DatabaseCategory.TYPE}
            onClick={function (): void {
              setCategory(DatabaseCategory.TYPE);
            }}
            selected={category === DatabaseCategory.TYPE}
          />
        </div>
        {category === DatabaseCategory.SET && <DatabaseSetContainer />}
        {category === DatabaseCategory.TYPE && <DatabaseTypeContainer />}
      </div>
    </main>
  );
};

export default DatabaseContainer;
