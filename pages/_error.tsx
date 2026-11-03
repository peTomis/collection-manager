// Libraries
import Link from "next/link";
import type { NextPageContext } from "next";
import * as Sentry from "@sentry/nextjs";

// Components
import Metadata from "@/components/metadata";
import Topbar from "@/components/organisms/topbar";
import Footer from "@/components/organisms/footer";
import { useT } from "@/lib/i18n";

interface ErrorProps {
  statusCode: number;
}

// Server errors and crashes while rendering a page (404s have their own page): reported to Sentry by getInitialProps
export default function ErrorPage({ statusCode }: ErrorProps) {
  const t = useT();
  return (
    <main className="flex flex-col min-h-screen font-geist text-ink">
      <Metadata title={t.errorPage.title} noindex />
      <Topbar />
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-[560px] mx-auto px-4 py-10 lg:py-16">
        <div className="font-geist-mono font-medium text-[11px] lg:text-xs tracking-[.08em] uppercase text-ink-muted">{t.errorPage.code(statusCode)}</div>
        <h1 className="mt-2 font-display font-semibold text-[32px] lg:text-[44px] leading-tight tracking-[-0.03em] text-center">{t.errorPage.title}</h1>
        <p className="mt-3 text-sm lg:text-[15px] text-center text-ink-muted max-w-[400px]">
          {t.errorPage.text}
        </p>
        <div className="flex flex-wrap justify-center gap-2.5 mt-6">
          <button type="button" onClick={() => window.location.reload()} className="px-4 py-2.5 text-sm font-medium rounded-lg bg-ink text-paper hover:bg-ink/85">
            {t.errorPage.tryAgain}
          </button>
          <Link href="/" className="px-4 py-2.5 text-sm font-medium border rounded-lg border-line bg-paper hover:bg-canvas">
            {t.notFound.backHome}
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}

ErrorPage.getInitialProps = async (context: NextPageContext): Promise<ErrorProps> => {
  await Sentry.captureUnderscoreErrorException(context);
  return { statusCode: context.res?.statusCode ?? context.err?.statusCode ?? 500 };
};
