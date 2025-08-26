import React from 'react'
import { View } from 'react-native'
import useUserStore from '../store/userStore'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { session } = useUserStore()

  return (
    <View style={{ flex: 1 }}>
      {children}
    </View>
  )
}

export default Layout
