// Libraries

// Components
import Topbar from "@/components/organisms/topbar";

export default function Home() {
  return (
    <main className="flex flex-col w-screen lg:h-screen">
      <Topbar />
      <div className="relative flex flex-col items-center justify-center w-screen h-[70vh] p-2 space-y-2 lg:h-auto lg:flex-1">
        <div className="md:pb-64">
          <img src={"./assets/404.png"} width={512} height={512} alt="Messi" />
        </div>
        <div className="absolute bottom-0 text-[180px] md:text-[512px]">404</div>
      </div>
    </main>
  );
}
