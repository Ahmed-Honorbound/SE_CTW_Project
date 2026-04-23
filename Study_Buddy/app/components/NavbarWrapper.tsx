'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function NavbarWrapper() {
  const pathname = usePathname();
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return null;
  return <Navbar />;
}
