"use client"

import { Authenticated } from 'convex/react'
import React from 'react'
import Header from '../_components/Header'
import { NavigationProvider } from '@/lib/Providers/NavigationProvider'
import Sidebar from '../_components/Sidebar'

const layout = ({children}: {children: React.ReactNode}) => {
  return (
    <NavigationProvider>

        <div className='flex h-screen'> 
            <Authenticated>
                <Sidebar/> 
            </Authenticated>
            <div className="flex-1">
                <Header/>

                <main>
                    {children}
                </main>
            </div>

        
        </div>
    </NavigationProvider>
  )
}

export default layout