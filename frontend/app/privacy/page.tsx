import { InfoPage, InfoSection } from '@/components/Shared/InfoPage';

export const metadata = {
  title: 'Privacy Policy — Intelliquery',
  description: 'How Intelliquery collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" subtitle="Last updated: July 2, 2026">
      <InfoSection title="1. What we collect">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-content-1">Account data</strong> — your name, email address,
            and (if you sign in with Google) your Google profile picture.
          </li>
          <li>
            <strong className="text-content-1">Connection data</strong> — database host, port,
            username, database name, and an encrypted copy of the password you provide.
          </li>
          <li>
            <strong className="text-content-1">Schema metadata</strong> — table names, column
            names, and types for the tables you choose to include, plus small samples of
            low-cardinality text values used to improve query accuracy.
          </li>
          <li>
            <strong className="text-content-1">Usage data</strong> — the questions you ask, the SQL
            that was generated, and execution metadata (status, row counts, timing) shown in your
            history.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="2. How we use it">
        <p>
          We use this data solely to provide the Service: authenticating you, generating SQL from
          your questions, executing queries against your connected databases, and showing you
          history and insights. We do not sell your data.
        </p>
      </InfoSection>

      <InfoSection title="3. How we protect it">
        <ul className="list-disc pl-5 space-y-2">
          <li>Database passwords are AES-256 encrypted at rest and never written to logs.</li>
          <li>Query execution is restricted to read-only <code>SELECT</code> statements, run inside transactions that are always rolled back.</li>
          <li>You control visibility: tables and columns you exclude during setup are never sent to the AI, and sensitive-looking columns are hidden by default.</li>
          <li>Sessions are validated on every API request; changing your password signs out other sessions.</li>
        </ul>
      </InfoSection>

      <InfoSection title="4. AI processing">
        <p>
          To generate SQL and insights, your question and the included schema metadata are
          processed by our AI pipeline. Query <em>results</em> are returned to you and used to
          render summaries and charts in your session.
        </p>
      </InfoSection>

      <InfoSection title="5. Data retention and deletion">
        <p>
          Query history can be deleted item-by-item from the History view. Deleting a database
          connection removes its stored credentials and cached schema. To delete your account and
          all associated data, contact us at the address below.
        </p>
      </InfoSection>

      <InfoSection title="6. Cookies">
        <p>
          We use a session cookie to keep you signed in, and local storage for interface
          preferences (such as theme and your selected connection). We do not use third-party
          advertising trackers.
        </p>
      </InfoSection>

      <InfoSection title="7. Contact">
        <p>
          Privacy questions or data requests:{' '}
          <a href="mailto:support@intelliquery.ai" className="text-brand underline">
            support@intelliquery.ai
          </a>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
