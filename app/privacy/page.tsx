import type { Metadata } from 'next';
import { COMPANY_NAME } from '@/lib/site';
import { getSignedInClient } from '@/lib/supabase/server';
import { Bullets, LegalPage, LegalSection, PageLink, SupportLink } from '../components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy policy · SwingArm',
  description: 'What SwingArm collects, why, who helps us run it, and how to delete your data.',
};

// Keep this in step with the app: a new kind of data, a new service that
// handles riders' data (analytics, payments, push), or a change to deletion
// means updating this page and its date.

export default async function PrivacyPage() {
  const { user } = await getSignedInClient();

  return (
    <LegalPage
      title="Privacy policy"
      updated="October 19, 2026"
      signedIn={user !== null}
      intro={
        <>
          <p>
            SwingArm is a motorcycle maintenance tracker at swingarm.app, run by {COMPANY_NAME} (“we”, “us”). This
            policy explains what we collect, why, who helps us run the app, and the choices you have.
          </p>
          <p>
            The short version: we keep what’s needed to track your bikes, we don’t sell it, we don’t show ads, and you can
            delete everything at any time.
          </p>
        </>
      }
    >
      <LegalSection title="What we collect">
        <Bullets>
          <li>
            <strong>Your account:</strong> your email address. If you sign in with Google, Google also gives us your name
            and profile picture.
          </li>
          <li>
            <strong>Your bikes and service:</strong> each bike’s year, make, model and odometer readings, your
            maintenance tasks and intervals, and the service you log (dates, odometer readings, costs and notes).
          </li>
          <li>
            <strong>Your settings:</strong> distance units, theme, which reminder emails you want, and which bike you had
            open last.
          </li>
          <li>
            <strong>Things you send in for all riders:</strong> owner’s manual links, and makes or models that weren’t in
            our list.
          </li>
          <li>
            <strong>Email records:</strong> which reminder emails we’ve sent you, so we don’t send the same one twice.
          </li>
          <li>
            <strong>Technical information:</strong> like most websites, our hosting providers log requests, including
            IP address, browser type and the pages requested. These logs are used for security and fixing problems.
          </li>
        </Bullets>
        <p>
          We don’t collect your location, your contacts or any payment details. SwingArm is free during early access.
        </p>
      </LegalSection>

      <LegalSection title="How we use it">
        <Bullets>
          <li>To run SwingArm for you: show your garage and work out which maintenance is due.</li>
          <li>To send the emails you ask for: sign-in links, and the reminder emails you’ve turned on.</li>
          <li>To show a bike’s history to people you share it with, when you create a share link.</li>
          <li>To review manual links and bike models before other riders see them.</li>
          <li>To keep SwingArm secure, fix problems, and answer you when you write to us.</li>
        </Bullets>
        <p>We don’t sell your information, use it for advertising, or share it with data brokers.</p>
      </LegalSection>

      <LegalSection title="Who can see your information">
        <Bullets>
          <li>
            <strong>Your garage is private.</strong> Other riders can’t see your bikes, tasks or history.
          </li>
          <li>
            <strong>Share links:</strong> when you create one, anyone with the link can see that bike’s year, make and
            model and its service history: dates, odometer readings, costs and notes. It never shows your email or name.
            You can turn a link off at any time.
          </li>
          <li>
            <strong>Things you send in:</strong> once approved, manual links and bike models are shown to all riders,
            without your name.
          </li>
          <li>
            <strong>The people who run SwingArm</strong> can reach the database to keep the app running. We look at a
            rider’s data only when we need to, for example to fix a problem you’ve reported.
          </li>
        </Bullets>
        <p>We may also share information if the law requires it, for example to answer a valid court order.</p>
      </LegalSection>

      <LegalSection title="Services that help us run SwingArm">
        <p>These companies handle data for us, only to provide their service:</p>
        <Bullets>
          <li>
            <strong>Supabase:</strong> our database and sign-in.
          </li>
          <li>
            <strong>Vercel:</strong> hosts the website.
          </li>
          <li>
            <strong>Resend:</strong> sends sign-in and reminder emails.
          </li>
          <li>
            <strong>Google:</strong> if you choose Sign in with Google.
          </li>
          <li>
            <strong>Anthropic:</strong> when we add a manufacturer’s maintenance schedule from an owner’s manual, the
            manual pages we pick are sent to Anthropic’s Claude to read the schedule. Those pages come from the
            manufacturer’s manual and don’t include your account or bike details.
          </li>
        </Bullets>
        <p>Your information is stored in the United States.</p>
      </LegalSection>

      <LegalSection title="Cookies and browser storage">
        <p>
          SwingArm uses cookies to keep you signed in. Your browser also stores your theme and which sections you’ve
          collapsed, so the app looks right the moment it opens. We don’t use advertising or tracking cookies, and we
          don’t use analytics. If that changes, we’ll update this policy first.
        </p>
      </LegalSection>

      <LegalSection title="Emails">
        <p>
          Reminder emails about tasks coming due and odometer check-ins are on when you sign up. The monthly summary is
          off until you turn it on. Turn any of them off under <strong>Reminder emails</strong> on the More page, or with
          the unsubscribe link in every reminder. We may also email you about your account or important changes to
          SwingArm.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it, and deleting it">
        <p>
          We keep your information while you have an account. To delete it, open <strong>More</strong>, then{' '}
          <strong>Delete account</strong>. That erases your profile, bikes, tasks, service history and share links right
          away. The same dialog lets you download a copy of your data first.
        </p>
        <Bullets>
          <li>Our database backups are kept for 7 days, so deleted data is gone from them within a week.</li>
          <li>Manual links and bike models you sent in stay for other riders, no longer connected to you.</li>
          <li>Our email and hosting providers keep their own delivery records and logs for a limited time.</li>
        </Bullets>
      </LegalSection>

      <LegalSection title="Your choices and rights">
        <p>
          You can change anything you’ve entered in the app, download a copy of your data, and delete your account. For
          anything else, such as a question about what we hold, write to <SupportLink />. Depending on where you live (for
          example California, the EU or the UK), you may have more rights over your information. We’ll honor those
          requests as the law requires.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          SwingArm only runs over HTTPS. Each account can only reach its own data, and sign-in works without passwords,
          so there’s no password of yours for anyone to steal from us. No system is perfectly secure, though. If you find
          a problem, please tell us at <SupportLink />.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          SwingArm isn’t meant for children under 13, and we don’t knowingly collect their information. If you think a
          child has signed up, write to us and we’ll delete the account.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          When we change this policy, we’ll update it here and change the date at the top. For significant changes,
          we’ll tell you by email or in the app before they take effect. See also our{' '}
          <PageLink href="/terms">terms of use</PageLink>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
