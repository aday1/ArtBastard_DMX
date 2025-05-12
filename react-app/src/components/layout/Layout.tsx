import React from 'react'
import { useStore } from '../../store'
import { useTheme } from '../../context/ThemeContext'
import { StatusBar } from './StatusBar'
import { Navbar } from './Navbar'
import { StatusMessage } from './StatusMessage'
import { NetworkStatus } from './NetworkStatus'
import FancyQuotes from './FancyQuotes'
import styles from './Layout.module.scss'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, darkMode, toggleDarkMode } = useTheme()
  const statusMessage = useStore((state) => state.statusMessage)

  return (
    <div className={`${styles.layout} ${styles[theme]} ${darkMode ? styles.dark : styles.light}`}>
      <Navbar />
        <div className={styles.contentWrapper}>
        {/* Network status is now in navbar, so this panel is removed */}
        
        <div className={styles.themeToggle} onClick={toggleDarkMode} title="Toggle Light/Dark Mode">
          <i className={`fas ${darkMode ? 'fa-moon' : 'fa-sun'}`}></i>
        </div>
        
        <div className={styles.mainContent}>
          <h1 className={styles.title}>
            ArtBastard DMX512FTW: 
            {theme === 'artsnob' && <span>The Luminary Palette</span>}
            {theme === 'standard' && <span>DMX Controller</span>}
            {theme === 'minimal' && <span>DMX</span>}
          </h1>
          
          {theme === 'artsnob' && (
            <FancyQuotes intervalSeconds={30} animate={true} />
          )}
          
          {statusMessage && (
            <StatusMessage 
              message={statusMessage.text} 
              type={statusMessage.type} 
            />
          )}
          
          <main className={styles.contentArea}>
            {children}
          </main>
        </div>
      </div>
      
      <StatusBar />
    </div>
  )
}