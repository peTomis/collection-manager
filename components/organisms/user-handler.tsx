// Libraries
import { signIn } from "next-auth/react";

// Components
import { Button } from "@/components/ui/button";
import { useSelector } from "@/redux/store";
import { DEMO_USER } from "@/types/constants";
import { resetDemoCollection } from "@/lib/demo-collection";

const UserHandler = () => {
  const { user } = useSelector((state) => state.user);

  if (user !== DEMO_USER) return null;

  return (
    <div className="fixed z-50 flex flex-col items-center gap-2 p-3 text-sm -translate-x-1/2 border rounded-lg shadow-lg sm:flex-row sm:gap-4 bottom-[92px] md:bottom-4 left-1/2 w-[calc(100vw-2rem)] sm:w-auto bg-background/90 backdrop-blur">
      <span className="text-center">Demo collection: your changes are saved in this browser only. Sign in to start your own.</span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            resetDemoCollection();
            window.location.reload();
          }}
        >
          Reset demo
        </Button>
        <Button type="button" onClick={() => signIn("google")}>
          Sign in with Google
        </Button>
      </div>
    </div>
  );
};

export default UserHandler;
