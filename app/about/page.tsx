

import Header from "../components/Header";

const AboutPage = () => {
    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#f9f8f6] mt-10 md:-mt-20 flex flex-col justify-center items-center text-left px-10">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl font-bold mb-10">Welcome to Our Story Hub</h1>
                    <div>
                        <p className="mb-4 text-gray-800 text-lg font-semibold">We are all here to create amazing stories - together!</p>
                        <p className="mb-2 ">
                            Feel free to add to any story or start your own, but remember that anyone can then add to it!
                        </p>
                        <p className="mb-2">
                            All stories are <span className="">anonymous</span>, focusing more on the experience than the author.
                        </p>
                        <p className="mb-2">
                            This is a place of acceptance and trust, but also resilience.
                        </p>
                        <p className="mb-2">
                            If you contribute to a story and someone else completes it differently, accept it and move on.
                        </p>
                        <p className="mb-2">
                            Please choose the genre and respect it. If the story contains adult themes, make it clear.
                        </p>
                        <p className="mb-2">
                            No feedback or 'likes' here. We work together, accept others' work, and remain resilient.
                        </p>
                        <p className="mb-2">
                            If a story is in progress, find another one. Each part submitted cannot be edited, but new parts can be added.
                        </p>
                        <div className="font-semibold ">
                            <p className="mt-4 mb-2">Start your own story and enjoy the unexpected twists from other contributors!</p>
                            <p className="mb-4">We collaborate, move on, and most importantly, have fun!</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default AboutPage;
