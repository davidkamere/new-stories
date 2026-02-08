

import Header from "../components/Header";

const AboutPage = () => {
    return (
        <>
            <Header />
            <div className="min-h-screen mt-10 md:-mt-20 flex flex-col justify-center items-center text-left px-4 md:px-12">
                <div className="paper-bg rounded-3xl p-6 md:p-12 max-w-3xl w-full">
                    <h1 className="ink-title text-4xl md:text-5xl mt-3 mb-6">Welcome to Our Story Hub</h1>
                    <div>
                        <p className="mb-4 text-[#2b2926] text-lg font-semibold">Grab a pen name and jump in &mdash; this is a shared sandbox for wild, wonderful stories.</p>
                        <div className="mt-6">
                        <div className="text-xs uppercase tracking-[0.3em] text-[#8f7f74] mb-2">How it works</div>
                            <ul className="text-[#8f7f74] space-y-2 text-sm">
                                <li>Start a new tale or hop into one already rolling.</li>
                                <li>When you add a line, it&apos;s locked in &mdash; but the story keeps growing.</li>
                                <li>If someone takes it somewhere unexpected, roll with it and keep going.</li>
                            </ul>
                        </div>
                        <div className="mt-6">
                        <div className="text-xs uppercase tracking-[0.3em] text-[#8f7f74] mb-2">House rules</div>
                            <ul className="text-[#8f7f74] space-y-2 text-sm">
                                <li>Pick a genre and stay in its vibe.</li>
                                <li>If it gets spicy, say so.</li>
                                <li>No likes, no ratings &mdash; just storytelling and good vibes.</li>
                            </ul>
                        </div>
                        <div className="mt-6">
                            <details>
                                <summary className="cursor-pointer text-xs uppercase tracking-[0.3em] text-[#8f7f74]">
                                    Features
                                </summary>
                                <div className="mt-3 text-sm text-[#8f7f74] space-y-2">
                                    <p><strong>Reading Mode</strong> — focus on the story by hiding the editor and controls.</p>
                                    <p><strong>Fork Story</strong> — branch any story into a new one and keep the original intact.</p>
                                    <p><strong>Continue vs New Paragraph</strong> — continue appends to the current paragraph; new paragraph starts a fresh line.</p>
                                    <p><strong>Turns</strong> — only one writer can type at a time to keep the flow clean.</p>
                                </div>
                            </details>
                        </div>
                        <div className="font-semibold mt-6 text-[#1b1a17]">
                            Ready? Write a little, read a lot, and enjoy the twists you didn&apos;t see coming.
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default AboutPage;
