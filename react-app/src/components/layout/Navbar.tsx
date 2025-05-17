import React, { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { NetworkStatus } from './NetworkStatus'
import { DmxChannelStats } from '../dmx/DmxChannelStats'
import { useStore, MidiMapping } from '../../store'
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
  const {
    blackoutActive,
    toggleBlackout,
    isLearningBlackout,
    startLearnBlackout,
    cancelLearnBlackout,
    fullOnActive,
    toggleFullOn,
    isLearningFullOn,
    startLearnFullOn,
    cancelLearnFullOn
  } = useStore((state) => ({
    blackoutActive: state.blackoutActive,
    toggleBlackout: state.toggleBlackout,
    isLearningBlackout: state.isLearningBlackout,
    startLearnBlackout: state.startLearnBlackout,
    cancelLearnBlackout: state.cancelLearnBlackout,
    fullOnActive: state.fullOnActive,
    toggleFullOn: state.toggleFullOn,
    isLearningFullOn: state.isLearningFullOn,
    startLearnFullOn: state.startLearnFullOn,
    cancelLearnFullOn: state.cancelLearnFullOn
  }))

  const [learnTimeoutId, setLearnTimeoutId] = useState<number | null>(null)
  const [fullOnLearnTimeoutId, setFullOnLearnTimeoutId] = useState<number | null>(null)

  const handleViewChange = (view: ViewType) => {
    setActiveView(view)
    window.dispatchEvent(
      new CustomEvent('changeView', {
        detail: { view }
      })
    )
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
        ))}
        {/* Blackout Button */}
        <button
          className={`${styles.navButton} ${styles.blackoutButton} ${blackoutActive ? styles.activeBlackout : ''} ${
            isLearningBlackout ? styles.learning : ''
          }`}
          onClick={toggleBlackout}
          title={blackoutActive ? 'Disengage Blackout' : 'Engage Blackout'}
        >
          <i className={`fas ${blackoutActive ? 'fa-lightbulb-slash' : 'fa-power-off'}`}></i>
          <span>{isLearningBlackout ? 'Learning...' : 'BLACKOUT'}</span>
        </button>
        {/* MIDI Learn for Blackout */}
        <button
          className={`${styles.navButton} ${styles.midiLearnButton}`}
          onClick={() => {
            if (isLearningBlackout) {
              cancelLearnBlackout()
              if (learnTimeoutId) clearTimeout(learnTimeoutId)
              setLearnTimeoutId(null)
            } else {
              startLearnBlackout()
              const timeoutId = window.setTimeout(() => {
                if (useStore.getState().isLearningBlackout) {
                  cancelLearnBlackout()
                  useStore.getState().showStatusMessage('Blackout MIDI learn timed out.', 'error')
                }
              }, 20000)
              setLearnTimeoutId(timeoutId)
            }
          }}
          title={isLearningBlackout ? 'Cancel MIDI Learn' : 'Assign MIDI to Blackout'}
        >
          <i className={`fas ${isLearningBlackout ? 'fa-times-circle' : 'fa-magic'}`}></i>
        </button>

        {/* Full On Button */}
        <button
          className={`${styles.navButton} ${styles.fullOnButton} ${fullOnActive ? styles.activeFullOn : ''} ${
            isLearningFullOn ? styles.learning : ''
          }`}
          onClick={toggleFullOn}
          title={fullOnActive ? 'Disengage Full On' : 'Engage Full On'}
        >
          <i className={`fas ${fullOnActive ? 'fa-lightbulb-on' : 'fa-bolt'}`}></i>
          <span>{isLearningFullOn ? 'Learning...' : 'FULL ON'}</span>
        </button>
        {/* MIDI Learn for Full On */}
        <button
          className={`${styles.navButton} ${styles.midiLearnButton}`}
          onClick={() => {
            if (isLearningFullOn) {
              cancelLearnFullOn()
              if (fullOnLearnTimeoutId) clearTimeout(fullOnLearnTimeoutId)
              setFullOnLearnTimeoutId(null)
            } else {
              startLearnFullOn()
              const timeoutId = window.setTimeout(() => {
                if (useStore.getState().isLearningFullOn) {
                  cancelLearnFullOn()
                  useStore.getState().showStatusMessage('Full On MIDI learn timed out.', 'error')
                }
              }, 20000) // 20 seconds timeout
              setFullOnLearnTimeoutId(timeoutId)
            }
          }}
          title={isLearningFullOn ? 'Cancel MIDI Learn' : 'Assign MIDI to Full On'}
        >
          <i className={`fas ${isLearningFullOn ? 'fa-times-circle' : 'fa-magic'}`}></i>
        </button>
      </div>
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

// Effect to handle MIDI learning for blackout
const BlackoutMidiLearnHandler: React.FC = () => {
  const { isLearningBlackout, midiMessages, setBlackoutMidiMapping, cancelLearnBlackout, showStatusMessage } = useStore(
    (state) => ({
      isLearningBlackout: state.isLearningBlackout,
      midiMessages: state.midiMessages,
      setBlackoutMidiMapping: state.setBlackoutMidiMapping,
      cancelLearnBlackout: state.cancelLearnBlackout,
      showStatusMessage: state.showStatusMessage
    })
  )

  useEffect(() => {
    if (!isLearningBlackout || midiMessages.length === 0) return

    const latestMessage = midiMessages[midiMessages.length - 1]
    console.log('[BlackoutLearn] Processing message:', latestMessage)

    if (latestMessage._type === 'noteon' || latestMessage._type === 'noteoff') {
      const mapping: MidiMapping = {
        channel: latestMessage.channel,
        note: latestMessage.note
      }
      setBlackoutMidiMapping(mapping)
      showStatusMessage(`Blackout mapped to Note ${mapping.note} on MIDI CH ${mapping.channel + 1}`, 'success')
    } else if (latestMessage._type === 'cc') {
      const mapping: MidiMapping = {
        channel: latestMessage.channel,
        controller: latestMessage.controller
      }
      setBlackoutMidiMapping(mapping)
      showStatusMessage(`Blackout mapped to CC ${mapping.controller} on MIDI CH ${mapping.channel + 1}`, 'success')
    } else {
      console.log('[BlackoutLearn] Ignoring non-Note/CC message:', latestMessage._type)
    }
  }, [midiMessages, isLearningBlackout, setBlackoutMidiMapping, cancelLearnBlackout, showStatusMessage])

  return null
}

// Effect to handle MIDI learning for Full On
const FullOnMidiLearnHandler: React.FC = () => {
  const { isLearningFullOn, midiMessages, setFullOnMidiMapping, cancelLearnFullOn, showStatusMessage } = useStore(
    (state) => ({
      isLearningFullOn: state.isLearningFullOn,
      midiMessages: state.midiMessages,
      setFullOnMidiMapping: state.setFullOnMidiMapping,
      cancelLearnFullOn: state.cancelLearnFullOn,
      showStatusMessage: state.showStatusMessage
    })
  )

  useEffect(() => {
    if (!isLearningFullOn || midiMessages.length === 0) return

    const latestMessage = midiMessages[midiMessages.length - 1]
    console.log('[FullOnLearn] Processing message:', latestMessage)

    if (latestMessage._type === 'noteon' || latestMessage._type === 'noteoff') {
      const mapping: MidiMapping = {
        channel: latestMessage.channel,
        note: latestMessage.note
      }
      setFullOnMidiMapping(mapping)
      showStatusMessage(`Full On mapped to Note ${mapping.note} on MIDI CH ${mapping.channel + 1}`, 'success')
    } else if (latestMessage._type === 'cc') {
      const mapping: MidiMapping = {
        channel: latestMessage.channel,
        controller: latestMessage.controller
      }
      setFullOnMidiMapping(mapping)
      showStatusMessage(`Full On mapped to CC ${mapping.controller} on MIDI CH ${mapping.channel + 1}`, 'success')
    } else {
      console.log('[FullOnLearn] Ignoring non-Note/CC message:', latestMessage._type)
    }
  }, [midiMessages, isLearningFullOn, setFullOnMidiMapping, cancelLearnFullOn, showStatusMessage])

  return null
}

export const NavbarWithMidi: React.FC = () => {
  return (
    <>
      <Navbar />
      <BlackoutMidiLearnHandler />
      <FullOnMidiLearnHandler />
    </>
  )
}