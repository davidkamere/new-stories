import Rooms from './components/Rooms';
import Header from './components/Header';
import OpeningLines from './components/OpeningLines';

export default function Home() {
  return (
    <>
      <Header />

      <main className="flex min-h-screen w-full flex-col pb-20">
        <section className="content-column mt-12 md:mt-16 w-full">
          <details className="group">
            <summary className="cursor-pointer text-micro uppercase tracking-[0.15em] text-[var(--accent)] list-none">
              How it works
            </summary>

            <div className="mt-4 space-y-3 text-small text-[var(--text-muted)] text-[#337a42]">
              <p>- Pick a story, choose a pen name, and claim the turn.</p>
              <p>- Continue a paragraph or start a new one</p>
              <p>- Be kind to the genre.</p>
            </div>
          </details>
        </section>

        <div className="mt-8 w-full">
          <Rooms />
        </div>
      </main>
    </>
  );
}