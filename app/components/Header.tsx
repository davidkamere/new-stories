"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Header = () => {
  const pathname = usePathname();

  return (
    <header className="header-minimal">
      <div className="content-column flex flex-row justify-between items-center">
        <Link href="/" className="hover:opacity-70 transition-opacity" aria-label="Stories Home">
          <span className="ink-title text-xl">Stories</span>
        </Link>

        <nav className="flex flex-row items-center space-x-4 md:space-x-6">
          <Link
            href="/about"
            className={`text-small uppercase tracking-[0.1em] transition-colors ${
              pathname === '/about'
                ? 'text-[var(--text)] font-medium'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;