"use client"

import Link from 'next/link';

import { usePathname, useRouter } from 'next/navigation';
import { supabaseClient } from '@/utils/db/supabase';

import { HomeIcon } from '@heroicons/react/20/solid';
import { HomeIcon as HomeIconOutline } from '@heroicons/react/24/outline';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/16/solid';



const Header = () => {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = supabaseClient


    const handleLogout = async () => {
        await supabase.auth.signOut();
       
        router.push('/login')  
    }

    

    return (
        <div className="">
            
            <div className="flex flex-row justify-between items-center  px-10 py-8 bg-[#f9f8f6] text-black">

                <Link href={'/'} className='hover:cursor-pointer'>
                    {
                        pathname === '/' ? <HomeIcon className='h-7 w-7 text-black hover:scale-125 hover:transition hover:transform hover:ease-in'/> : <HomeIconOutline className='h-7 w-7 text-black hover:scale-125 hover:transition hover:transform hover:ease-in'/>
                    }
                </Link>

                <div className='flex flex-row justify-end items-center space-x-8 text-base  md:pr-3  '>
                    <Link href={'/about'} className={`${pathname === '/about' ? 'text-[#dcdddf]': 'text-black'}`}>About</Link>
                    <div onClick={handleLogout} className='cursor-pointer hover:transition hover:ease-in border border-[#f9f8f6] hover:border-[#dcdddf]  hover:border  hover:border-1 p-2.5 rounded flex flex-row items-center'>
                        <ArrowRightStartOnRectangleIcon className='pr-1 pt-0.5 h-5 w-5 '/><span className='pl-1 text-gray-700'>Sign out</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Header;