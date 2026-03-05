

import Header from "../components/Header";

const AboutPage = () => {
    return (
        <>
            <Header />
            <div className="min-h-screen mt-10 flex flex-col justify-start items-center text-left px-4 md:px-12 pb-16">
                <div className="paper-bg rounded-md p-6 md:p-12 max-w-4xl w-full">
                    <h1 className="ink-title text-3xl md:text-5xl mt-3 mb-6">About The Writing System</h1>
                    <div>
                        <p className="mb-4 text-[#2b2926] text-lg font-medium max-w-3xl">
                            This platform is designed for collaborative storytelling with strict turn-taking.
                            It optimizes for flow, clarity, and continuity over social mechanics.
                        </p>
                        <div className="mt-6">
                        <div className="text-xs uppercase tracking-[0.2em] text-[#d16a1c] mb-2">How it works</div>
                            <ul className="text-[#5f5f5a] space-y-2 text-sm">
                                <li>Start a new tale or hop into one already rolling.</li>
                                <li>When you add a line, it&apos;s locked in &mdash; but the story keeps growing.</li>
                                <li>If someone takes it somewhere unexpected, roll with it and keep going.</li>
                            </ul>
                        </div>
                        <div className="mt-6">
                        <div className="text-xs uppercase tracking-[0.2em] text-[#d16a1c] mb-2">House rules</div>
                            <ul className="text-[#5f5f5a] space-y-2 text-sm">
                                <li>Pick a genre and stay in its vibe.</li>
                                <li>If it gets spicy, say so.</li>
                                <li>No likes, no ratings &mdash; just storytelling and good vibes.</li>
                            </ul>
                        </div>
                        <div className="mt-6">
                            <details className="border-t border-[#c6c6c3] pt-3">
                            <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] summary-green">Features</summary>
                                <div className="mt-3 text-sm text-[#5f5f5a] space-y-2">
                                    <p><strong>Reading Mode</strong> — focus on the story by hiding the editor and controls.</p>
                                    <p><strong>Fork Story</strong> — branch any story into a new one and keep the original intact.</p>
                                    <p><strong>Continue vs New Paragraph</strong> — continue appends to the current paragraph; new paragraph starts a fresh line.</p>
                                    <p><strong>Turns</strong> — only one writer can type at a time to keep the flow clean.</p>
                                </div>
                            </details>
                        </div>
                        <div className="font-medium mt-7 text-[#101010] text-sm uppercase tracking-[0.12em]">
                            Build stories. hand off cleanly. keep momentum.
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default AboutPage;
