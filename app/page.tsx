
import Rooms from './components/Rooms'
import Header from './components/Header'
import OpeningLines from './components/OpeningLines'

export default function Home() {

  return (
    <>
    <Header/>
    <main className="flex min-h-screen flex-col items-center px-4 md:px-12 lg:px-16 pb-20">
      <section className="w-full max-w-6xl mt-10 md:mt-14 paper-bg p-6 md:p-10">
        <details className="mt-8 border-t border-[#c6c6c3] pt-4">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-[#d16a1c]">
              How it works
            </summary>
            <div className="mt-3 text-sm text-[#5f5f5a] space-y-2">
              <p>Pick a story, choose a pen name, and claim the turn.</p>
              <p>Continue a paragraph or start a new one; your line stays while the story evolves.</p>
              <p>Be kind to the genre. If it gets spicy, say so.</p>
            </div>
        </details>
      </section>
      <div className='w-full max-w-6xl mt-10'>
        <Rooms />
      </div>
    </main>
    </>
  )
}
