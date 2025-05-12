import React, { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { NetworkStatus } from './NetworkStatus'
import { DmxChannelStats } from '../dmx/DmxChannelStats'
import styles from './Navbar.module.scss'

type ViewType = 'main' | 'midiOsc' | 'fixture' | 'scenes' | 'oscDebug' | 'misc'

const navItems: Array<{
  id: ViewType
  icon: string
  title: {
    artsnob: string
    standard: string
    minimal: string
  }
}> = [
  {
    id: 'main',
    icon: 'fa-lightbulb',
    title: {
      artsnob: 'Luminous Canvas',
      standard: 'Main Control',
      minimal: 'Main'
    }
  },
  {
    id: 'midiOsc',
    icon: 'fa-sliders-h',
    title: {
      artsnob: 'MIDI/OSC Atelier',
      standard: 'MIDI/OSC Setup',
      minimal: 'I/O'
    }
  },
  {
    id: 'fixture',
    icon: 'fa-object-group',
    title: {
      artsnob: 'Fixture Composition',
      standard: 'Fixture Setup',
      minimal: 'Fix'
    }
  },
  {
    id: 'scenes',
    icon: 'fa-theater-masks',
    title: {
      artsnob: 'Scene Gallery',
      standard: 'Scenes',
      minimal: 'Scn'
    }
  },
  {
    id: 'oscDebug',
    icon: 'fa-wave-square',
    title: {
      artsnob: 'OSC Critique',
      standard: 'OSC Debug',
      minimal: 'OSC'
    }
  },
  {
    id: 'misc',
    icon: 'fa-cog',
    title: {
      artsnob: 'Avant-Garde Settings',
      standard: 'Settings',
      minimal: 'Cfg'
    }
  }
]

export const Navbar: React.FC = () => {
  const { theme } = useTheme()
  const [activeView, setActiveView] = useState<ViewType>('main')
  
  const handleViewChange = (view: ViewType) => {
    setActiveView(view)
    window.dispatchEvent(new CustomEvent('changeView', { 
      detail: { view }
    }))
  }
  return (
    <nav className={styles.navbar}>
      <div className={styles.navButtons}>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`${styles.navButton} ${activeView === item.id ? styles.active : ''}`}
            onClick={() => handleViewChange(item.id)}
            title={item.title.standard}
          >
            <i className={`fas ${item.icon}`}></i>
            <span>{item.title[theme]}</span>
          </button>
        ))}      </div>
      <div className={styles.rightSideContainer}>
        <div className={styles.dmxStatsContainer}>
          <DmxChannelStats compact={true} />
        </div>
        <div className={styles.networkStatusContainer}>
          <NetworkStatus compact={true} />
        </div>
      </div>
    </nav>
  )
}