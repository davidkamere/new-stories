"use client"

import Link from 'next/link';

import { usePathname } from 'next/navigation';

import { HomeIcon } from '@heroicons/react/20/solid';
import { HomeIcon as HomeIconOutline } from '@heroicons/react/24/outline';
const Header = () => {
    const pathname = usePathname()

    

    return (
        <div className="border-b border-[#c6c6c3] bg-[#f2f2f0]/90 backdrop-blur-[2px]">
            <div className="flex flex-row justify-between items-center px-4 md:px-10 py-5 md:py-6 text-[#101010] max-w-7xl mx-auto">

                <Link href={'/'} className='hover:cursor-pointer transition-opacity hover:opacity-70'>
                    {
                        pathname === '/' ? <HomeIcon className='h-6 w-6'/> : <HomeIconOutline className='h-6 w-6'/>
                    }
                </Link>

                <div className='flex flex-row justify-end items-center space-x-4 md:space-x-8 text-[11px] uppercase tracking-[0.18em] md:pr-1'>
                    <Link href={'/about'} className={`${pathname === '/about' ? 'text-[#101010]': 'text-[#5f5f5a]'} transition-colors`}>
                        About
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Header;
