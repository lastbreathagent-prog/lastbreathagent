import Drafts from '@/components/Drafts';
import Logo from '@/components/Logo';

export const metadata = {
  title: 'Drafts · Lastbreath',
  robots: { index: false, follow: false },
};

export default function DraftsPage() {
  return (
    <main className="drafts-page">
      <header className="drafts-head">
        <a href="/" className="drafts-brand"><Logo size={36} id="drafts-logo" /> <b>LAST</b><span>BREATH</span></a>
        <span className="eyebrow">Post queue</span>
      </header>
      <Drafts />
    </main>
  );
}
