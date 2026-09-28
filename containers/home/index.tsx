// Libraries
import { useEffect } from "react";

// State
import { useDispatch, useSelector } from "@/redux/store";
import { getPortfolio } from "@/redux/slices/portfolio";
import { getBinders } from "@/redux/slices/binders";
import { getWishlists } from "@/redux/slices/wishlists";

// Components
import Metrics from "./components/metrics";
import BindersRecap from "./components/binders-recap";
import Top from "./components/top";
import Sidebar from "../../components/organisms/sidebar";
import TableItemsRecap from "./components/table-items-recap";
import UserHandler from "@/components/organisms/user-handler";

const HomeContainer = () => {
  const { user } = useSelector((state) => state.user);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) return;
    dispatch(getPortfolio(user));
    dispatch(getBinders(user));
    dispatch(getWishlists(user));
  }, [user]);

  return (
    <main className="relative flex flex-col w-screen lg:flex-row lg:h-screen">
      <div className="absolute top-0 left-0 w-screen h-screen bg-[url('/assets/bg.jpg')] bg-cover bg-center -z-10 opacity-10" />
      <Sidebar />
      <UserHandler />
      <div className="grid w-screen grid-cols-1 gap-4 p-2 lg:grid-cols-12 lg:h-screen">
        <Metrics />
        <BindersRecap />
        <Top />
        <TableItemsRecap onItemRemoved={() => {}} />
      </div>
    </main>
  );
};

export default HomeContainer;
