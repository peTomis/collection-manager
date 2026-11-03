// Libraries
import Link from "next/link";

// Components
import Logo from "@/components/atoms/logo";
import { useT } from "@/lib/i18n";

const Footer = () => {
  const t = useT();
  const links = [
    { href: "/binders", label: t.nav.binders },
    { href: "/wishlists", label: t.nav.wishlist },
    { href: "/database", label: t.nav.database },
  ];

  return (
    <footer className="mt-auto border-t border-line text-ink-muted">
      <div className="flex flex-col w-full max-w-[1440px] mx-auto gap-6 px-4 py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="flex flex-col gap-3">
            <Link href="/" className="self-start">
              <Logo size={26} />
            </Link>
            <p className="text-sm">{t.footer.tagline}</p>
          </div>
          <nav className="flex gap-6 text-sm font-medium">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2 pt-6 text-xs border-t border-line">
          <p>{t.footer.disclaimer}</p>
          <p>
            © {new Date().getFullYear()} Binderly ·{" "}
            <Link href="/privacy" className="transition-colors hover:text-ink">
              {t.footer.privacy}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
