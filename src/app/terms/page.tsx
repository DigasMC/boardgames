import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service · Tablist",
  description: "Terms that govern your use of Tablist.",
};

const LAST_UPDATED = "2 October 2026";

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Agreement">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and
          use of Tablist at{" "}
          <a
            href="https://tablist.app"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            https://tablist.app
          </a>{" "}
          (the &quot;Service&quot;), operated by{" "}
          <strong>Diogo Mendinhas Carlos</strong> (&quot;we&quot;,
          &quot;us&quot;), based in Portugal. Contact:{" "}
          <a
            href="mailto:digasmc@gmail.com"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            digasmc@gmail.com
          </a>
          .
        </p>
        <p>
          By creating an account or using the Service, you agree to these
          Terms and to our{" "}
          <Link
            href="/privacy"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          . If you do not agree, do not use Tablist.
        </p>
      </LegalSection>

      <LegalSection title="2. The Service">
        <p>
          Tablist is a personal tool for tracking board game collections,
          filtering and picking games, logging game-night sessions and scores,
          and managing friends and optional public profiles. Game catalog data
          is powered in part by BoardGameGeek (BGG). Tablist is provided free
          of charge and does not process payments or display advertisements.
        </p>
        <p>
          Features may change, be limited, or be discontinued. We aim to keep
          the Service available but do not guarantee uninterrupted or
          error-free operation.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility">
        <p>
          You must be at least 13 years old to use Tablist. By using the
          Service, you represent that you meet this requirement and that the
          information you provide is accurate.
        </p>
      </LegalSection>

      <LegalSection title="4. Accounts">
        <p>
          You are responsible for your account credentials and for activity
          under your account. Keep your password confidential. Notify us
          promptly if you suspect unauthorized access.
        </p>
        <p>
          You may sign up with email and password or with Google Sign-In. You
          may delete your account from Profile settings; deletion removes your
          account and associated data as described in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use the Service for unlawful, harmful, or abusive purposes.</li>
          <li>
            Attempt to gain unauthorized access to accounts, systems, or data.
          </li>
          <li>
            Interfere with or disrupt the Service, including by excessive
            automated requests beyond normal personal use.
          </li>
          <li>
            Impersonate others or misrepresent your affiliation when using
            social or session features.
          </li>
          <li>
            Upload or store content that you do not have the right to use, or
            that infringes others&apos; rights.
          </li>
          <li>
            Scrape, resell, or redistribute BoardGameGeek or Tablist data in
            ways that violate BGG&apos;s or our terms.
          </li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these Terms.
        </p>
      </LegalSection>

      <LegalSection title="6. Your content">
        <p>
          You retain ownership of content you submit (such as display names,
          notes, guest player names, and session details). You grant us a
          worldwide, non-exclusive license to host, store, display, and
          process that content solely to operate and improve the Service,
          including showing it to other users as the features require (for
          example, friends, session participants, or public profiles you
          enable).
        </p>
        <p>
          You are responsible for guest names and other personal data you
          enter about third parties, and for having a lawful basis to do so.
        </p>
      </LegalSection>

      <LegalSection title="7. BoardGameGeek and third-party services">
        <p>
          Tablist uses BoardGameGeek APIs and may display BGG-sourced metadata
          and images. BGG content remains subject to BoardGameGeek&apos;s
          terms and policies. Tablist is not affiliated with or endorsed by
          BoardGameGeek except as a consumer of its APIs and &quot;Powered by
          BGG&quot; attribution.
        </p>
        <p>
          Google Sign-In and hosting providers are subject to their own terms.
          We are not responsible for third-party services outside our
          reasonable control.
        </p>
      </LegalSection>

      <LegalSection title="8. Intellectual property">
        <p>
          The Tablist name, branding, and software (excluding your content and
          third-party materials) are owned by Diogo Mendinhas Carlos. You may
          not copy, modify, or distribute the Service except as allowed by
          these Terms or applicable law.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimer of warranties">
        <p>
          The Service is provided &quot;as is&quot; and &quot;as
          available&quot; without warranties of any kind, whether express or
          implied, including merchantability, fitness for a particular
          purpose, and non-infringement, to the fullest extent permitted by
          law. We do not warrant that data (including BGG-sourced metadata or
          offline sync) will be complete, current, or free of errors.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          To the fullest extent permitted by applicable law, we are not liable
          for indirect, incidental, special, consequential, or punitive
          damages, or for loss of data, profits, or goodwill, arising from
          your use of the Service. Our aggregate liability for claims relating
          to the Service shall not exceed the greater of (a) the amounts you
          paid us for the Service in the twelve months before the claim (if
          any) or (b) fifty euros (€50).
        </p>
        <p>
          Nothing in these Terms excludes or limits liability that cannot be
          excluded or limited under Portuguese law (including liability for
          death or personal injury caused by negligence, or for fraud).
        </p>
      </LegalSection>

      <LegalSection title="11. Termination">
        <p>
          You may stop using Tablist and delete your account at any time. We
          may suspend or terminate access if you breach these Terms, if
          required by law, or if we discontinue the Service. Provisions that
          by nature should survive (including disclaimers, limitations, and
          governing law) will survive termination.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to the Terms">
        <p>
          We may update these Terms from time to time. The &quot;Last
          updated&quot; date will change accordingly. Continued use after
          changes constitutes acceptance. If you do not agree, stop using the
          Service and delete your account.
        </p>
      </LegalSection>

      <LegalSection title="13. Governing law">
        <p>
          These Terms are governed by the laws of Portugal. Courts in Portugal
          have exclusive jurisdiction over disputes, without prejudice to
          mandatory consumer protections that may apply if you are a consumer
          in the European Union.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          Questions about these Terms:{" "}
          <a
            href="mailto:digasmc@gmail.com"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            digasmc@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
