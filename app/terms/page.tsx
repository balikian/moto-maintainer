import type { Metadata } from 'next';
import { COMPANY_NAME, OPEN_GRAPH } from '@/lib/site';
import { getSignedInClient } from '@/lib/supabase/server';
import { Bullets, LegalPage, LegalSection, PageLink, SupportLink } from '../components/LegalPage';

const title = 'Terms of use · SwingArm';
const description = 'The terms for using SwingArm, the motorcycle maintenance tracker.';

export const metadata: Metadata = { title, description, openGraph: { ...OPEN_GRAPH, title, description } };

// Keep this in step with the app, especially when paid plans arrive.

export default async function TermsPage() {
  const { user } = await getSignedInClient();

  return (
    <LegalPage
      title="Terms of use"
      updated="October 19, 2026"
      signedIn={user !== null}
      intro={
        <p>
          These terms are an agreement between you and {COMPANY_NAME} (“we”, “us”), a Washington company that runs
          SwingArm, the motorcycle maintenance tracker at swingarm.app. By using SwingArm, you agree to them and to our{' '}
          <PageLink href="/privacy">privacy policy</PageLink>. If you don’t agree, please don’t use SwingArm.
        </p>
      }
    >
      <LegalSection title="The service">
        <p>
          SwingArm helps you keep track of your motorcycles’ maintenance: which jobs are due, by distance or time, and
          the service you’ve done. It’s free during early access. We may add paid plans later. If we do, we’ll tell you
          before anything you use starts costing money, and you’ll never be charged unless you sign up for a paid plan.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <Bullets>
          <li>You must be at least 13, and old enough where you live to agree to these terms.</li>
          <li>Use an email address that’s yours. Sign-in codes go to it, so keep that email account secure.</li>
          <li>You’re responsible for what happens in your account.</li>
        </Bullets>
      </LegalSection>

      <LegalSection title="Maintenance information is a guide, not a guarantee">
        <p>
          SwingArm’s intervals, starter tasks and manufacturer schedules are there for convenience. They can be
          incomplete, out of date or wrong, including schedules read from owner’s manuals by software. Reminders depend
          on the odometer readings and service you enter, and emails can arrive late, land in spam, or not be sent.
        </p>
        <p>
          <strong>
            Always follow your bike’s owner’s manual and the manufacturer’s instructions, and see a qualified mechanic
            when you’re unsure.
          </strong>{' '}
          You’re responsible for your bike’s condition, for any work you do on it, and for deciding whether it’s safe
          to ride.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          The information you put into SwingArm stays yours. You give us permission to store it, process it and show it
          as needed to run SwingArm for you, including on any share links you create.
        </p>
        <p>
          When you send in something for all riders, like an owner’s manual link or a bike model, you give us permission
          to review it, change it and show it to other riders, including after you delete your account. Only send in
          links you’re allowed to share, such as links to the manufacturer’s own site.
        </p>
      </LegalSection>

      <LegalSection title="Fair use">
        <p>Please don’t:</p>
        <Bullets>
          <li>use SwingArm to break the law;</li>
          <li>try to get into other riders’ accounts or data;</li>
          <li>
            try to break, overload or get around the security of SwingArm, or copy it with automated tools;
          </li>
          <li>send in links or information that are harmful, misleading, or not yours to share;</li>
          <li>create accounts automatically or resell SwingArm.</li>
        </Bullets>
      </LegalSection>

      <LegalSection title="Reporting copyright problems">
        <p>
          We respect copyright. Manual links that riders send in point to other websites; we review them before other
          riders see them, but we don’t host the manuals. If you believe a link or anything else on SwingArm infringes
          your copyright, email <SupportLink /> with the link or page and the work it concerns, and we’ll look into it
          and remove it if needed.
        </p>
      </LegalSection>

      <LegalSection title="Other websites">
        <p>
          SwingArm links to other sites, such as manufacturers’ owner’s manuals. We don’t control those sites and
          aren’t responsible for them.
        </p>
      </LegalSection>

      <LegalSection title="Changes, and ending your account">
        <p>
          We may change, pause or remove features as SwingArm grows. If we ever close SwingArm for good, we’ll tell you
          in advance so you can download your data.
        </p>
        <p>
          SwingArm may also be unavailable now and then, for maintenance or because of a problem at one of our
          providers. We keep that as short as we can, but we can’t always warn you first.
        </p>
        <p>
          You can delete your account at any time from the More page. We may suspend or close an account that breaks
          these terms or puts SwingArm or other riders at risk.
        </p>
      </LegalSection>

      <LegalSection title="No warranty">
        <p>
          SwingArm is provided “as is” and “as available”. As far as the law allows, we make no warranties of any kind,
          including that SwingArm will be accurate, reliable, always available or free of errors, or fit for a
          particular purpose.
        </p>
      </LegalSection>

      <LegalSection title="Limits on our liability">
        <p>
          As far as the law allows, we aren’t liable for indirect, incidental, special or consequential damages, or for
          damage, injury or loss that comes from relying on SwingArm’s maintenance information or reminders. Our total
          liability for any claim about SwingArm is limited to the greater of what you paid us in the 12 months before
          the claim, or US$50. Some places don’t allow these limits, so they may not all apply to you.
        </p>
      </LegalSection>

      <LegalSection title="Claims caused by your use">
        <p>
          As far as the law allows, you agree to defend and cover {COMPANY_NAME} against any claims, damages, losses and
          costs, including reasonable legal fees, that come from what you send in or share through SwingArm, your misuse
          of SwingArm, or your breaking these terms or the law.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          The laws of Washington State govern these terms, without regard to its conflict-of-law rules. Any dispute
          about SwingArm will be handled in the state or federal courts in Washington, unless the law where you live
          gives you the right to bring it where you are.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          When we change these terms, we’ll update them here and change the date at the top. For significant changes,
          we’ll tell you by email or in the app before they take effect. If you keep using SwingArm after that, you
          accept the new terms.
        </p>
      </LegalSection>

      <LegalSection title="General">
        <Bullets>
          <li>
            These terms and the <PageLink href="/privacy">privacy policy</PageLink> are the whole agreement between you
            and us about SwingArm.
          </li>
          <li>
            If a court finds any part of these terms unenforceable, the rest stays in effect.
          </li>
          <li>If we don’t enforce part of these terms right away, we haven’t given up the right to enforce it later.</li>
          <li>
            We may transfer these terms to a new owner as part of a merger, acquisition or sale of SwingArm. You can’t
            transfer your account or these terms to someone else.
          </li>
        </Bullets>
      </LegalSection>
    </LegalPage>
  );
}
