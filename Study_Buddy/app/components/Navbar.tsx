'use client';

import React from 'react'
import "../styles/Navbar.css";
import NotificationBell from './NotificationBell';

function Navbar() {
  return (
    <div className='navbar'>

        <div className='items'>
            {/* Change to image latere */}
            <div>
                Logo 
            </div>
            <a href="/dashboard" className='button'>
                <button>
                    Dashboard 
                </button>
            </a>
            <a href="/tasks" className='button'>
                <button>
                    Tasks 
                </button>
            </a>
            <a href="/analytics" className='button'>
                <button>
                    Analytics
                </button>
            </a>
            <a href="/calendar" className='button'>
                <button>
                    Calendar 
                </button>
            </a>
            <a href="/login" className='button'>
                <button>
                    Logout 
                </button>
            </a>
            <a href="/settings" className='button'>
                <button>
                    Settings 
                </button>
            </a>
            <NotificationBell />
        </div>
    </div>
  )
}

export default Navbar