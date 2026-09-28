// Libraries
import { signIn } from "next-auth/react";

// Components
import { Button } from "@/components/ui/button";
import { useSelector } from "@/redux/store";
import { DEMO_USER } from "@/types/constants";

const UserHandler = () => {
  const { user } = useSelector((state) => state.user);

  if (user !== DEMO_USER) return null;

  return (
    <div className="fixed z-50 flex flex-col items-center gap-2 p-3 text-sm -translate-x-1/2 border rounded-lg shadow-lg sm:flex-row sm:gap-4 bottom-4 left-1/2 w-[calc(100vw-2rem)] sm:w-auto bg-background/90 backdrop-blur">
      <span className="text-center">You are viewing a demo collection. Sign in to start your own.</span>
      <Button type="button" onClick={() => signIn("google")}>
        Sign in with Google
      </Button>
    </div>
  );
};

export default UserHandler;
