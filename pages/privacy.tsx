// Libraries
import Link from "next/link";
import type { ReactNode } from "react";

// Components
import Metadata, { SITE_NAME } from "@/components/metadata";
import Topbar from "@/components/organisms/topbar";
import Footer from "@/components/organisms/footer";
import { intlLocale, Locale, useI18n } from "@/lib/i18n";

// Where privacy requests go, and when this policy last changed: update both with the text, in every language
const CONTACT_EMAIL = "me@petomis.com";
const UPDATED = Date.UTC(2026, 10, 3);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-9">
    <h2 className="font-display font-semibold text-xl lg:text-2xl tracking-[-0.02em] text-ink">{title}</h2>
    <div className="mt-3 space-y-3">{children}</div>
  </section>
);

const Email = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className="underline text-ink">
    {CONTACT_EMAIL}
  </a>
);

// The policy in each language: the same facts, kept in step with each other
const POLICY: Record<Locale, { updated: string; body: ReactNode }> = {
  en: {
    updated: "Last updated",
    body: (
      <>
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
            necessary, which is why there is no cookie banner. The browser&apos;s local storage keeps your theme, your language, the demo collection and the offline mode settings, and offline
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
            <Email />.
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
      </>
    ),
  },
  it: {
    updated: "Ultimo aggiornamento",
    body: (
      <>
        <p className="mt-4">
          {SITE_NAME} è un progetto amatoriale per seguire il valore di una collezione del TCG Pokémon. Conserva di te il meno possibile: quello che serve per accedere e la
          collezione che costruisci. Non mostra pubblicità, non usa analisi né cookie di tracciamento e non vende né condivide mai i tuoi dati.
        </p>

        <Section title="Senza un account">
          <p>
            La collezione demo vive solo nella memoria del tuo browser e non raggiunge mai i nostri server. Come ogni sito, il server vede il tuo indirizzo IP a ogni richiesta:
            alcune pagine contano le richieste per indirizzo per un minuto, per fermare gli abusi, e quei conteggi vengono eliminati allo scadere del minuto (al massimo entro
            un&apos;ora).
          </p>
        </Section>

        <Section title="Cosa conserviamo quando accedi">
          <ul className="pl-5 space-y-2 list-disc">
            <li>
              <strong className="text-ink">Il tuo profilo Google</strong>: nome, indirizzo email e immagine del profilo, come li condivide Google quando accedi, con le date del
              primo e dell&apos;ultimo accesso. Non vediamo mai la tua password di Google.
            </li>
            <li>
              <strong className="text-ink">La tua collezione</strong>: i binder e le wishlist che crei, i loro elementi, quantità e prezzi obiettivo, e lo storico del
              valore del tuo portafoglio.
            </li>
          </ul>
          <p>Li usiamo solo per far funzionare l&apos;app per te: per farti accedere, mostrarti la collezione e calcolare quanto vale.</p>
        </Section>

        <Section title="Cookie e memoria del browser">
          <p>
            L&apos;accesso imposta i cookie che gli servono (un cookie di sessione, valido 7 giorni, e cookie di sicurezza di breve durata contro le richieste contraffatte). Sono
            strettamente necessari, per questo non c&apos;è un banner dei cookie. La memoria locale del browser conserva il tuo tema, la tua lingua, la collezione demo e le
            impostazioni della modalità offline, e la modalità offline salva il suo download nel database del browser. Tutto resta sul tuo dispositivo; uscire dall&apos;account
            rimuove il download offline.
          </p>
        </Section>

        <Section title="Segnalazioni di errore">
          <p>
            Quando qualcosa si rompe, l&apos;app può inviare una segnalazione di errore a Sentry perché possiamo correggerlo: cosa è andato storto, in quale punto del codice, il
            percorso della pagina, il tuo browser e il sistema operativo. Le segnalazioni non contengono nome, email, cookie né dati della collezione, e vengono eliminate al
            massimo dopo 90 giorni.
          </p>
        </Section>

        <Section title="Chi li tratta">
          <ul className="pl-5 space-y-2 list-disc">
            <li>
              <strong className="text-ink">Google</strong>, per l&apos;accesso.
            </li>
            <li>
              <strong className="text-ink">Vercel</strong>, che ospita l&apos;app, e <strong className="text-ink">MongoDB Atlas</strong>, che ospita il database.
            </li>
            <li>
              <strong className="text-ink">Sentry</strong>, per le segnalazioni di errore.
            </li>
            <li>
              <strong className="text-ink">TCGdex</strong> e <strong className="text-ink">Google</strong> forniscono le immagini delle carte e dei profili direttamente al tuo
              browser, quindi vedono il tuo indirizzo IP quando le carica.
            </li>
          </ul>
          <p>
            Alcuni di loro possono trattare dati fuori dall&apos;Unione europea, con le garanzie che offrono, come le clausole contrattuali tipo della Commissione europea.
          </p>
        </Section>

        <Section title="Per quanto tempo li conserviamo">
          <p>
            Il profilo e la collezione restano finché hai un account. Quando lo elimini vengono eliminati subito, tutto in una volta. Le copie nei backup del fornitore del
            database scadono secondo i suoi tempi.
          </p>
        </Section>

        <Section title="I tuoi diritti">
          <p>
            In <strong className="text-ink">Impostazioni → I tuoi dati</strong> puoi scaricare tutto ciò che conserviamo su di te in un file JSON, ed eliminare il tuo account con
            binder, wishlist, portafoglio e profilo. L&apos;eliminazione non si può annullare.
          </p>
          <p>
            Puoi anche chiederci di correggere i tuoi dati o di smettere di trattarli, e puoi presentare reclamo all&apos;autorità per la protezione dei dati. Per qualsiasi
            cosa sui tuoi dati, scrivi a <Email />.
          </p>
        </Section>

        <Section title="Minori">
          <p>{SITE_NAME} non è pensato per i minori di 16 anni. L&apos;accesso segue anche le regole di età di Google.</p>
        </Section>

        <Section title="Modifiche">
          <p>
            Se questa informativa cambia, la nuova versione viene pubblicata in questa pagina con la sua data. Domande?{" "}
            <Link href="/" className="underline text-ink">
              Torna a {SITE_NAME}
            </Link>{" "}
            oppure scrivici all&apos;indirizzo qui sopra.
          </p>
        </Section>
      </>
    ),
  },
};

// What the app stores and sends, kept in step with the code: users (lib/auth.ts), the collection (lib/db/), rate limits (lib/rate-limit.ts),
// error reports (lib/monitoring.ts), browser storage (theme, language, demo, offline mode), and the account download and deletion (pages/api/account.ts)
export default function Privacy() {
  const { t, locale } = useI18n();
  const policy = POLICY[locale];
  const updated = new Date(UPDATED).toLocaleDateString(intlLocale(), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <main className="flex flex-col min-h-screen font-geist text-ink">
      <Metadata title={t.privacy.title} path="/privacy" description={t.privacy.description(SITE_NAME)} />
      <Topbar />
      <article className="w-full max-w-[720px] mx-auto px-4 py-10 lg:py-16 text-sm lg:text-[15px] leading-relaxed text-ink-muted">
        <div className="font-geist-mono font-medium text-[11px] lg:text-xs tracking-[.08em] uppercase">
          {policy.updated} {updated}
        </div>
        <h1 className="mt-2 font-display font-semibold text-[32px] lg:text-[44px] leading-tight tracking-[-0.03em] text-ink">{t.privacy.title}</h1>
        {policy.body}
      </article>
      <Footer />
    </main>
  );
}
