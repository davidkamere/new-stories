
import Rooms from './components/Rooms'
import Header from './components/Header'

export default function Home() {

  return (
    <>
    <Header/>
    <main className="flex min-h-screen flex-col items-center bg-[#f9f8f6] " >
     
        <div className='w-full'>
          <Rooms />
        </div>
        
   
    </main>
    </>
  )
}
