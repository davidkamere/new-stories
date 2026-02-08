"use client"

import Link from 'next/link';

import { usePathname } from 'next/navigation';

import { HomeIcon } from '@heroicons/react/20/solid';
import { HomeIcon as HomeIconOutline } from '@heroicons/react/24/outline';
const Header = () => {
    const pathname = usePathname()

    

    return (
        <div className="">
            
            <div className="flex flex-row justify-between items-center px-4 md:px-10 py-6 md:py-8 text-black">

                <Link href={'/'} className='hover:cursor-pointer'>
                    {
                        pathname === '/' ? <HomeIcon className='h-7 w-7 text-black hover:scale-125 hover:transition hover:transform hover:ease-in'/> : <HomeIconOutline className='h-7 w-7 text-black hover:scale-125 hover:transition hover:transform hover:ease-in'/>
                    }
                </Link>

                <div className='flex flex-row justify-end items-center space-x-4 md:space-x-8 text-sm md:text-base md:pr-3'>
                    <Link href={'/about'} className={`${pathname === '/about' ? 'text-[#dcdddf]': 'text-black'}`}>About</Link>
                </div>
            </div>
        </div>
    )
}

export default Header;
