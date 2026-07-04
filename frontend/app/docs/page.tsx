import { InfoPage, InfoSection } from '@/components/Shared/InfoPage';
import Link from 'next/link';

export const metadata = {
  title: 'Documentation — Intelliquery',
  description: 'Get started with Intelliquery: connect a database and query it in plain English.',
};

const SUPPORT_EMAIL = 'shaikhaman.0020@gmail.com';

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="font-mono text-[12.5px] px-1.5 py-0.5 rounded"
      style={{ background: 'var(--ds-base-2)', border: '1px solid var(--ds-border-subtle)' }}
    >
      {children}
    </code>
  );
}

export default function DocsPage() {
  return (
    <InfoPage
      title="Documentation"
      subtitle="Everything you need to go from sign-up to your first query in under two minutes."
    >
      <InfoSection title="Quickstart">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong className="text-content-1">Create an account</strong> — sign up with email &amp;
            password or continue with Google.
          </li>
          <li>
            <strong className="text-content-1">Connect data</strong> — add your own database from{' '}
            <Link href="/connections/new" className="text-brand underline">Add Database</Link>, or
            click <em>Try the sample database</em> to explore a ready-made e-commerce store with no
            setup.
          </li>
          <li>
            <strong className="text-content-1">Ask a question</strong> — type something like{' '}
            <Code>Show me the top 10 customers by revenue</Code>. Intelliquery generates the SQL,
            runs it, and explains the results.
          </li>
        </ol>
      </InfoSection>

      <InfoSection title="Connecting your database">
        <p>
          Intelliquery supports PostgreSQL, MySQL, MariaDB, SQL Server, SQLite, and CockroachDB
          (Snowflake and BigQuery are coming soon). There are three ways to provide your schema:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-content-1">Connect directly</strong> (recommended) — we read the
            schema live, so the AI always has an up-to-date view of your tables.
          </li>
          <li>
            <strong className="text-content-1">Paste schema</strong> — run a provided SQL script in
            your own client and paste the output. No direct access needed; ideal for restricted
            environments.
          </li>
          <li>
            <strong className="text-content-1">AI schema parsing</strong> — describe your tables in
            plain English and the AI infers the structure. Good for prototyping.
          </li>
        </ul>
        <p>
          During setup you can exclude entire tables or hide individual columns (passwords, PII,
          internal fields) from the AI. Columns that look sensitive are hidden automatically.
        </p>
      </InfoSection>

      <InfoSection title="Security model">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-content-1">Read-only execution</strong> — only{' '}
            <Code>SELECT</Code> statements are allowed. Every query is validated before it runs and
            executed inside a transaction that is always rolled back.
          </li>
          <li>
            <strong className="text-content-1">Encrypted credentials</strong> — database passwords
            are AES-256 encrypted at rest and never logged.
          </li>
          <li>
            <strong className="text-content-1">Least privilege</strong> — we recommend creating a
            dedicated read-only database user for Intelliquery.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Working with results">
        <p>
          Every answer includes the generated SQL (which you can edit and re-run), an AI summary
          with key observations, suggested follow-up questions, and a recommended visualization.
          Use <em>Create Insights</em> for charts and KPIs, <em>Save</em> to keep a query as a
          reusable snippet, and the <em>Schema Explorer</em> in the sidebar to browse tables,
          columns, and relationships.
        </p>
      </InfoSection>

      <InfoSection title="Teams">
        <p>
          Create an organization in <Link href="/settings" className="text-brand underline">Settings</Link>{' '}
          to share connections with teammates. Roles control access: Viewers run queries, Editors
          manage connections, Admins manage members, and Owners have full control.
        </p>
      </InfoSection>

      <InfoSection title="Need help?">
        <p>
          Email us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand underline">{SUPPORT_EMAIL}</a>{' '}
          — include your Account ID (Settings → Account) so we can help faster.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
