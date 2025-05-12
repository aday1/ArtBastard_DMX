import React, { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../context/SocketContext'
import type { SocketContextType } from '../context/SocketContext' // Importing as type
import { useStore } from '../store'
import { DmxControlPanel } from '../components/dmx/DmxControlPanel'
import { MidiOscSetup } from '../components/midi/MidiOscSetup'
import { OscDebug } from '../components/osc/OscDebug'
import { SceneGallery } from '../components/scenes/SceneGallery'
import { FixtureSetup } from '../components/fixtures/FixtureSetup'
import { DigitalIlluminationAtelier } from '../components/visualizers/DigitalIlluminationAtelier'
import { Settings } from '../components/settings/Settings'
import styles from './MainPage.module.scss'

type ViewType = 'main' | 'midiOsc' | 'fixture' | 'scenes' | 'oscDebug' | 'misc'

const MainPage: React.FC = () => {
  const { theme } = useTheme()
  const socketContext = useSocket() as SocketContextType
  const connected = socketContext.connected
  const showStatusMessage = useStore(state => state.showStatusMessage)
  const [currentView, setCurrentView] = useState<ViewType>('main')

  // Handle view changes from navbar
  useEffect(() => {
    const handleViewChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ view: ViewType }>
      setCurrentView(customEvent.detail.view)
    }

    window.addEventListener('changeView', handleViewChange)
    return () => window.removeEventListener('changeView', handleViewChange)
  }, [])

  // Handle connection state changes
  useEffect(() => {
    if (!connected) {
      showStatusMessage('Lost connection to server - some features may be limited', 'error')
    }
  }, [connected, showStatusMessage])

  const renderContent = () => {
    return (
      <div className={styles.content}>
        {!connected && (
          <div className={styles.connectionWarning}>
            <i className="fas fa-exclamation-triangle"></i>
            Connection lost - attempting to reconnect...
          </div>
        )}
        
        <div className={styles.viewContainer}>
          {currentView === 'main' && (
            <>
              <DigitalIlluminationAtelier />
              <DmxControlPanel />
            </>
          )}
          {currentView === 'midiOsc' && <MidiOscSetup />}
          {currentView === 'fixture' && <FixtureSetup />}
          {currentView === 'scenes' && <SceneGallery />}
          {currentView === 'oscDebug' && <OscDebug />}
          {currentView === 'misc' && <Settings />}
        </div>
      </div>
    )
  }

  return renderContent()
}

export default MainPage