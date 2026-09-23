import Header from "../components/Header";

const AboutPage = () => {
  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center px-4 md:px-12 lg:px-16 pb-20">
        <section className="content-column mt-12 md:mt-16">
          <div>
            <div className="text-micro uppercase tracking-[0.2em] text-[var(--accent)] mb-2">
              How it works
            </div>
            <ul className="text-[var(--text-muted)] space-y-2 text-small">
              <li>Start a new story or jump into one already rolling.</li>
              <li>
                When you add a line, it&apos;s locked in &mdash; but the story
                keeps growing.
              </li>
              <li>
                If someone takes it somewhere unexpected, roll with it and
                keep going.
              </li>
            </ul>
            <div className="mt-6">
              <div className="text-micro uppercase tracking-[0.2em] text-[var(--accent)] mb-2">
                House rules
              </div>
              <ul className="text-[var(--text-muted)] space-y-2 text-small">
                <li>Pick a genre and stay in it.</li>
               
                <li>
                  No likes, no ratings &mdash; just storytelling.
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <details className="border-t border-[var(--border)] pt-3">
                <summary className="cursor-pointer text-micro uppercase tracking-[0.2em] text-[var(--accent)]">
                  Features
                </summary>
                <div className="mt-3 text-small text-[var(--text-muted)] space-y-2">
                  <p>
                    <strong>Reading Mode</strong> — focus on the story by hiding
                    the editor and controls.
                  </p>
                  <p>
                    <strong>Fork Story</strong> — branch any story into a new
                    one and keep the original intact.
                  </p>
                  <p>
                    <strong>Continue vs New Paragraph</strong> — continue
                    appends to the current paragraph; new paragraph starts a
                    fresh line.
                  </p>
                  <p>
                    <strong>Turns</strong> — only one writer can type at a time
                    to keep the flow clean.
                  </p>
                </div>
              </details>
            </div>
            
          </div>
        </section>
      </main>
    </>
  );
};

export default AboutPage;
