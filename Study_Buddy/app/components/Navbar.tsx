'use client';

import React from 'react';
import "../styles/Navbar.css";
import NotificationBell from './NotificationBell';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

function Navbar() {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <nav className='navbar'>
      <div className='nav-brand'>
        <div className='nav-logo'>S</div>
        Study Buddy
      </div>
      <div className='items'>
        <a href="/dashboard" className='button'>Dashboard</a>
        <a href="/tasks" className='button'>Tasks</a>
        <a href="/analytics" className='button'>Analytics</a>
        <a href="/calendar" className='button'>Calendar</a>
      </div>
      <div className='nav-right'>
        <NotificationBell />
        <button className='signout-btn' onClick={handleSignOut}>Sign out</button>
      </div>
    </nav>
  )
}

export default Navbar;