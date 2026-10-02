import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy · Tablist",
  description:
    "How Tablist collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "2 October 2026";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Who we are">
        <p>
          Tablist (&quot;we&quot;, &quot;us&quot;, or &quot;the Service&quot;) is
          operated by <strong>Diogo Mendinhas Carlos</strong>, based in
          Portugal. You can reach us about privacy matters at{" "}
          <a
            href="mailto:digasmc@gmail.com"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            digasmc@gmail.com
          </a>
          . The Service is available at{" "}
          <a
            href="https://tablist.app"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            https://tablist.app
          </a>
          .
        </p>
        <p>
          For the purposes of the EU General Data Protection Regulation (GDPR),
          Diogo Mendinhas Carlos is the data controller of personal data
          processed through Tablist.
        </p>
      </LegalSection>

      <LegalSection title="2. What this policy covers">
        <p>
          This Privacy Policy explains what personal data we collect when you
          use Tablist, why we collect it, how we share it with service
          providers, and the rights you have. Tablist helps you manage a board
          game collection, track game-night sessions and scores, connect with
          friends, and optionally share a public profile.
        </p>
      </LegalSection>

      <LegalSection title="3. Data we collect">
        <p>Depending on how you use Tablist, we may process:</p>
        <ul className="list-disc space-y-2 pl-5 text-on-surface">
          <li>
            <strong>Account data:</strong> email address; password (stored as a
            hash by our auth provider, never in plain text by us); Google
            account identifiers and basic profile fields if you sign in with
            Google.
          </li>
          <li>
            <strong>Profile data:</strong> display name, username, avatar URL
            (often from Google), optional BoardGameGeek username, and whether
            your profile is marked public.
          </li>
          <li>
            <strong>Collection and preferences:</strong> games you add or
            import, notes, wishlist flags, and saved filter presets.
          </li>
          <li>
            <strong>Sessions and scores:</strong> session titles, dates,
            locations, notes, scoring mode, players (linked accounts or guest
            display names), teams, and scores.
          </li>
          <li>
            <strong>Social graph:</strong> friend requests and friendships
            between accounts.
          </li>
          <li>
            <strong>On-device data:</strong> when you use Tablist as an
            installable app or offline, copies of your collection and sessions
            may be stored in IndexedDB on your device, along with a service
            worker cache of app assets and BoardGameGeek images.
          </li>
          <li>
            <strong>Technical cookies:</strong> essential session cookies used
            to keep you signed in. We do not use advertising cookies.
          </li>
        </ul>
        <p>
          We also cache <strong>BoardGameGeek game metadata</strong> (titles,
          descriptions, images, ratings, and related community file metadata)
          in our database so the Service can work reliably. That cache is
          shared across users and is not treated as your personal profile data.
        </p>
      </LegalSection>

      <LegalSection title="4. How we obtain data">
        <ul className="list-disc space-y-2 pl-5">
          <li>Directly from you when you register, edit your profile, or log sessions.</li>
          <li>
            From Google when you choose Google Sign-In (subject to Google&apos;s
            policies and the permissions you grant).
          </li>
          <li>
            From the BoardGameGeek APIs when you search, view games, or import a
            public BGG collection using a BGG username you provide.
          </li>
          <li>
            Automatically as essential cookies and on-device offline storage
            when you use the Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Why we process data (legal bases)">
        <p>We process personal data to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Provide and operate the Service (performance of a contract):
            authentication, collections, sessions, friends, and sync.
          </li>
          <li>
            Secure the Service and prevent abuse (legitimate interests).
          </li>
          <li>
            Comply with legal obligations when they apply.
          </li>
        </ul>
        <p>
          Where we rely on consent (for example, making a profile public), you
          can withdraw it in your profile settings.
        </p>
      </LegalSection>

      <LegalSection title="6. Visibility and sharing with other users">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Signed-in users may see basic profile identity (username, display
            name, avatar) for discoverability (for example, adding friends or
            players).
          </li>
          <li>
            If you turn on a <strong>public profile</strong>, other signed-in
            users can also see your collection and play statistics on your
            profile page.
          </li>
          <li>
            Friend search may match against username, display name, or email
            address on our servers. Search results do not return email
            addresses.
          </li>
          <li>
            Session hosts and participants linked to a session can see that
            session&apos;s roster and scores. Guest players are stored as
            display names you enter.
          </li>
        </ul>
        <p>
          We do not sell your personal data. We do not show ads and we do not
          process payments.
        </p>
      </LegalSection>

      <LegalSection title="7. Service providers (processors)">
        <p>We use trusted providers to run Tablist:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Supabase</strong> — authentication and database hosting.
          </li>
          <li>
            <strong>Vercel</strong> — application hosting and delivery.
          </li>
          <li>
            <strong>Google</strong> — optional OAuth sign-in and (when
            provided) avatar hosting.
          </li>
          <li>
            <strong>BoardGameGeek</strong> — game metadata and related CDN
            images/files you choose to access through the Service.
          </li>
        </ul>
        <p>
          These providers process data on our instructions and under their own
          privacy terms. We do not currently use third-party advertising or
          product-analytics SDKs.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies and similar technologies">
        <p>
          Tablist uses essential cookies (and similar browser storage) to
          maintain your authenticated session. Offline and PWA features may
          store data locally on your device. You can clear site data in your
          browser or uninstall the app to remove local caches; that does not
          by itself delete your server-side account.
        </p>
      </LegalSection>

      <LegalSection title="9. Retention">
        <p>
          We keep your account and related data while your account remains
          open. If you delete your account, we remove your authentication
          record and associated profile data from our database, subject to
          technical cascade rules (for example, sessions you hosted are
          removed; your player link on someone else&apos;s session may be
          unlinked while a guest display name you left may remain). Shared
          BoardGameGeek game cache entries are retained for the Service.
        </p>
        <p>
          Backups and logs held by our providers may persist for a limited
          period before automatic expiry.
        </p>
      </LegalSection>

      <LegalSection title="10. Your rights">
        <p>
          If you are in the European Economic Area (including Portugal), you
          may have the right to access, rectify, erase, restrict, or object to
          certain processing, and to data portability, subject to legal limits.
          You can update much of your profile in the app, and you can delete
          your account from Profile settings.
        </p>
        <p>
          To exercise rights or ask questions, email{" "}
          <a
            href="mailto:digasmc@gmail.com"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            digasmc@gmail.com
          </a>
          . You may also lodge a complaint with the Portuguese data protection
          authority (
          <a
            href="https://www.cnpd.pt"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            CNPD
          </a>
          ) or another competent supervisory authority.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>
          Tablist is not directed at children under 13. If you believe a child
          under 13 has created an account, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="12. International transfers">
        <p>
          Our providers may process data in the EU and other countries. Where
          transfers outside the EEA occur, they rely on appropriate safeguards
          offered by those providers (such as Standard Contractual Clauses),
          where required.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes">
        <p>
          We may update this policy from time to time. We will revise the
          &quot;Last updated&quot; date above. Continued use of Tablist after
          changes means you accept the updated policy. Material changes may
          also be highlighted in the Service when practical.
        </p>
      </LegalSection>

      <LegalSection title="14. Related">
        <p>
          See also our{" "}
          <Link
            href="/terms"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
