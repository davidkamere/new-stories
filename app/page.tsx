import Rooms from './components/Rooms';
import Header from './components/Header';
import OpeningLines from './components/OpeningLines';

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center px-4 md:px-12 lg:px-16 pb-20">
        <section className="content-column mt-12 md:mt-16 text-center">
          <details className="group">
            <summary className="cursor-pointer text-micro uppercase tracking-[0.15em] text-[var(--accent)] list-none">
              How it works
            </summary>

            <div className="mt-4 text-small text-[var(--text-muted)] space-y-3">
              <p>Pick a story, choose a pen name, and claim the turn.</p>
              <p>Continue a paragraph or start a new one; your line stays while the story evolves.</p>
              <p>Be kind to the genre. If it gets spicy, say so.</p>
            </div>
          </details>
        </section>
        <div className="w-full mt-8">
          <Rooms />
        </div>
      </main>
    </>
  );
}