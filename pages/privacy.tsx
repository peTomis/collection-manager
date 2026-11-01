// Libraries
import Link from "next/link";
import type { ReactNode } from "react";

// Components
import Metadata, { SITE_NAME } from "@/components/metadata";
import Topbar from "@/components/organisms/topbar";
import Footer from "@/components/organisms/footer";

// Where privacy requests go, and when this policy last changed: update both with the text
const CONTACT_EMAIL = "me@petomis.com";
const UPDATED = "1 November 2026";

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-9">
    <h2 className="font-display font-semibold text-xl lg:text-2xl tracking-[-0.02em] text-ink">{title}</h2>
    <div className="mt-3 space-y-3">{children}</div>
  </section>
);

// What the app stores and sends, kept in step with the code: users (lib/auth.ts), the collection (lib/db/), rate limits (lib/rate-limit.ts),
// error reports (lib/monitoring.ts), browser storage (theme, demo, offline mode), and the account download and deletion (pages/api/account.ts)
export default function Privacy() {
  return (
    <main className="flex flex-col min-h-screen font-geist text-ink">
      <Metadata title="Privacy policy" path="/privacy" description={`What ${SITE_NAME} stores about you, why, and how to download or delete it.`} />
      <Topbar />
      <article className="w-full max-w-[720px] mx-auto px-4 py-10 lg:py-16 text-sm lg:text-[15px] leading-relaxed text-ink-muted">
        <div className="font-geist-mono font-medium text-[11px] lg:text-xs tracking-[.08em] uppercase">Last updated {UPDATED}</div>
        <h1 className="mt-2 font-display font-semibold text-[32px] lg:text-[44px] leading-tight tracking-[-0.03em] text-ink">Privacy policy</h1>
        <p className="mt-4">
          {SITE_NAME} is a fan project to track the value of a Pokémon TCG collection. It keeps as little about you as it can: what you need to sign in and the collection you
          build. It shows no ads, uses no analytics or tracking cookies, and never sells or shares your data.
        </p>

        <Section title="Without an account">
          <p>
            The demo collection lives in your browser&apos;s storage only and never reaches our servers. Like any website, the server sees your IP address with each request: a few
            routes count requests per address for one minute to stop abuse, and those counts are deleted when the minute is over (within an hour at most).
          </p>
        </Section>

        <Section title="What we store when you sign in">
          <ul className="pl-5 space-y-2 list-disc">
            <li>
              <strong className="text-ink">Your Google profile</strong>: your name, email address and profile picture, as Google shares them when you sign in, with the dates of
              your first and last sign-in. We never see your Google password.
            </li>
            <li>
              <strong className="text-ink">Your collection</strong>: the binders and wishlists you create, their items, quantities and target prices, and the history of your
              portfolio value.
            </li>
          </ul>
          <p>We use them only to run the app for you: to sign you in, show your collection and work out what it&apos;s worth.</p>
        </Section>

        <Section title="Cookies and browser storage">
          <p>
            Signing in sets the cookies the sign-in needs (a session cookie, valid for 7 days, and short-lived security cookies against forged requests). They are strictly
            necessary, which is why there is no cookie banner. The browser&apos;s local storage keeps your theme, the demo collection and the offline mode settings, and offline
            mode saves its download in the browser&apos;s database. All of it stays on your device; signing out removes the offline download.
          </p>
        </Section>

        <Section title="Error reports">
          <p>
            When something breaks, the app may send an error report to Sentry so we can fix it: what went wrong, where in the code, the page path, and your browser and operating
            system. Reports carry no name, email, cookies or collection data, and are deleted after at most 90 days.
          </p>
        </Section>

        <Section title="Who processes it">
          <ul className="pl-5 space-y-2 list-disc">
            <li>
              <strong className="text-ink">Google</strong>, for signing in.
            </li>
            <li>
              <strong className="text-ink">Vercel</strong>, which hosts the app, and <strong className="text-ink">MongoDB Atlas</strong>, which hosts the database.
            </li>
            <li>
              <strong className="text-ink">Sentry</strong>, for error reports.
            </li>
            <li>
              <strong className="text-ink">TCGdex</strong> and <strong className="text-ink">Google</strong> serve card images and profile pictures straight to your browser, so they
              see your IP address when it loads them.
            </li>
          </ul>
          <p>Some of them may process data outside the European Union, under the safeguards they provide, such as the European Commission&apos;s standard contractual clauses.</p>
        </Section>

        <Section title="How long we keep it">
          <p>
            Your profile and collection stay as long as you have an account. When you delete it, they are deleted at once, everything in one go. Copies in the database
            provider&apos;s backups expire on their own schedule.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            In <strong className="text-ink">Settings → Your data</strong> you can download everything we store about you as a JSON file, and delete your account with its binders,
            wishlists, portfolio and profile. Deletion can&apos;t be undone.
          </p>
          <p>
            You can also ask us to correct your data or to stop processing it, and you can complain to your data protection authority. For anything about your data, write to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline text-ink">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="Children">
          <p>{SITE_NAME} is not meant for children under 16. Signing in also follows Google&apos;s own age rules.</p>
        </Section>

        <Section title="Changes">
          <p>
            If this policy changes, the new version is published on this page with its date. Questions?{" "}
            <Link href="/" className="underline text-ink">
              Back to {SITE_NAME}
            </Link>{" "}
            or write to us at the address above.
          </p>
        </Section>
      </article>
      <Footer />
    </main>
  );
}
