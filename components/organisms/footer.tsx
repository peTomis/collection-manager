// Libraries
import Link from "next/link";

// Components
import Logo from "@/components/atoms/logo";

const LINKS = [
  { href: "/binders", label: "Binders" },
  { href: "/wishlists", label: "Wishlist" },
  { href: "/database", label: "Database" },
];

const Footer = () => (
  <footer className="mt-auto border-t border-line text-ink-muted">
    <div className="flex flex-col w-full max-w-[1440px] mx-auto gap-6 px-4 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
        <div className="flex flex-col gap-3">
          <Link href="/" className="self-start">
            <Logo size={26} />
          </Link>
          <p className="text-sm">Know what your Pokémon cards are worth.</p>
        </div>
        <nav className="flex gap-6 text-sm font-medium">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex flex-col gap-2 pt-6 text-xs border-t border-line">
        <p>
          Prices from{" "}
          <a href="https://www.cardmarket.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
            Cardmarket
          </a>
          , card details from{" "}
          <a href="https://tcgdex.dev" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
            TCGdex
          </a>
          .
        </p>
        <p>Binderly is an unofficial fan project, not affiliated with Nintendo, The Pokémon Company or Cardmarket. Pokémon and its trademarks belong to their respective owners.</p>
        <p>© {new Date().getFullYear()} Binderly</p>
      </div>
    </div>
  </footer>
);

export default Footer;
