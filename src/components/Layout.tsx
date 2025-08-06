import React from 'react'
import Navigation from './Navigation'
import useUserStore from '../store/userStore'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { session } = useUserStore()

  return (
    <div className="app-layout">
      {session && <Navigation />}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default Layout
