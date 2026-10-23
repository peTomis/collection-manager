// Libraries
import Link from "next/link";
import { useRouter } from "next/router";

// Components
import Metadata from "@/components/metadata";
import Topbar from "@/components/organisms/topbar";
import Footer from "@/components/organisms/footer";
import { cn } from "@/lib/utils";

// A binder page as in the logo: its middle row spells 404, with the 0 missing from its pocket
const POCKETS: ("card" | "empty" | "4" | "0")[] = ["card", "card", "empty", "4", "0", "4", "card", "empty", "empty"];

const LINKS = [
  { href: "/binders", label: "Binders", text: "Your collection" },
  { href: "/wishlists", label: "Wishlist", text: "Cards to buy" },
  { href: "/database", label: "Database", text: "Every set and price" },
];

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="flex flex-col min-h-screen font-geist text-ink">
      <Metadata title="Page not found" noindex />
      <Topbar />
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-[560px] mx-auto px-4 py-10 lg:py-16">
        <div className="grid grid-cols-3 gap-2 lg:gap-2.5 w-[216px] lg:w-[264px] p-3 lg:p-3.5 bg-paper border border-line rounded-xl lg:rounded-[14px]" aria-hidden>
          {POCKETS.map((pocket, i) => (
            <div
              key={i}
              className={cn(
                "grid aspect-[10/12] place-items-center rounded-md font-display font-semibold text-[40px] lg:text-[48px] leading-none tracking-[-0.04em]",
                pocket === "card" && "bg-ink/80",
                pocket === "empty" && "bg-ink/10",
                pocket === "4" && "bg-ink text-paper",
                pocket === "0" && "border-2 border-dashed border-gold text-gold"
              )}
            >
              {(pocket === "4" || pocket === "0") && pocket}
            </div>
          ))}
        </div>

        <div className="mt-8 font-geist-mono font-medium text-[11px] lg:text-xs tracking-[.08em] uppercase text-ink-muted">Error 404</div>
        <h1 className="mt-2 font-display font-semibold text-[32px] lg:text-[44px] leading-tight tracking-[-0.03em] text-center">This pocket is empty</h1>
        <p className="mt-3 text-sm lg:text-[15px] text-center text-ink-muted max-w-[400px]">
          The page you're looking for was moved, removed or never made it into the binder.
        </p>

        <div className="flex flex-wrap justify-center gap-2.5 mt-6">
          <Link href="/" className="px-4 py-2.5 text-sm font-medium rounded-lg bg-ink text-paper hover:bg-ink/85">
            Back to home
          </Link>
          <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-sm font-medium border rounded-lg border-line bg-paper hover:bg-canvas">
            Go back
          </button>
        </div>

        <div className="grid w-full grid-cols-1 mt-10 overflow-hidden border sm:grid-cols-3 border-line rounded-xl bg-paper">
          {LINKS.map((l, i) => (
            <Link key={l.href} href={l.href} className={cn("px-4 py-3.5 hover:bg-canvas border-line", i > 0 && "border-t sm:border-t-0 sm:border-l")}>
              <div className="text-sm font-medium">{l.label} →</div>
              <div className="text-xs text-ink-muted mt-0.5">{l.text}</div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
