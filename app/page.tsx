
import Rooms from './components/Rooms'
import Header from './components/Header'
import OpeningLines from './components/OpeningLines'

export default function Home() {

  return (
    <>
    <Header/>
    <main className="flex min-h-screen flex-col items-center px-4 md:px-12 lg:px-16">
      <section className="w-full max-w-6xl mt-10 md:mt-14">
        <div className="rounded-3xl p-6 md:p-12">
          <p className="text-base md:text-lg text-[#8f7f74] max-w-2xl">
            Claim a turn, leave your mark, and hand the story back. No likes, no noise — just words.
          </p>
          <div className="mt-6">
            <OpeningLines />
          </div>
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-semibold summary-green">
              How it works
            </summary>
            <div className="mt-3 text-sm text-[#8f7f74] space-y-2">
              <p>Pick a story, choose a pen name, and claim the turn.</p>
              <p>Continue a paragraph or start a new one — your line stays, the story evolves.</p>
              <p>Be kind to the genre. If it gets spicy, say so.</p>
            </div>
          </details>
        </div>
      </section>
      <div className='w-full max-w-6xl mt-10'>
        <Rooms />
      </div>
    </main>
    </>
  )
}
