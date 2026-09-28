import { BookIcon, HeartIcon, HomeIcon, ListIcon, LogInIcon, LogOutIcon } from "lucide-react";
import Pokeball from "@/components/icons/pokeball";
import React from "react";
import { signIn, signOut } from "next-auth/react";
import { useSelector } from "@/redux/store";
import { DEMO_USER } from "@/types/constants";
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "../ui/button";

const Sidebar = () => {
  const [open, setOpen] = React.useState(false);
  const { user } = useSelector((state) => state.user);

  return (
    <>
      <div className="flex flex-row items-center justify-between flex-none h-full px-2 py-2 lg:flex-col">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer lg:h-12 lg:w-12">
          <Pokeball />
        </div>
        <div className="flex flex-row items-center justify-start space-x-2 lg:space-x-0 lg:flex-col lg:space-y-2">
          <SidebarButton href="/" title="home" icon={<HomeIcon />} />
          <SidebarButton href="/binders" title="binders" icon={<BookIcon />} />
          <SidebarButton href="/wishlists" title="wishlists" icon={<HeartIcon />} />
          <SidebarButton href="/database" title="database" icon={<ListIcon />} />
        </div>
        {user === DEMO_USER ? (
          <div title="sign in" className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer lg:h-12 lg:w-12" onClick={() => signIn("google")}>
            <LogInIcon />
          </div>
        ) : (
          <div
            title="logout"
            className="flex items-center justify-center w-8 h-8 transform rotate-180 rounded-lg cursor-pointer lg:h-12 lg:w-12"
            onClick={() => {
              setOpen(true);
            }}
          >
            <LogOutIcon />
          </div>
        )}
      </div>
      <DialogLogout open={open} close={() => setOpen(false)} />
    </>
  );
};

function DialogLogout({ open, close }: { open: boolean; close: () => void }) {
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex flex-col max-w-[300px] sm:max-w-md lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Logout</DialogTitle>
          <DialogDescription>Are you sure you want to logout?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex sm:justify-end">
          <Button type="button" variant="secondary" onClick={close}>
            No
          </Button>
          <Button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SidebarButtonProps {
  href: string;
  title: string;
  icon: React.ReactNode;
}

const SidebarButton = ({ href, title, icon }: SidebarButtonProps) => {
  return (
    <a href={href} title={title} className="cursor-pointer">
      <div className={`flex items-center justify-center w-12 h-12 rounded-lg cursor-pointer hover:bg-white/20`}>{icon}</div>
    </a>
  );
};

export default Sidebar;
