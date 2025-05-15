import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '../context/SocketContext'
import { useStore } from '../store'

export const useBrowserMidi = () => {
  const [midiAccess, setMidiAccess] = useState<WebMidi.MIDIAccess | null>(null)
  const [browserMidiEnabled, setBrowserMidiEnabled] = useState(false)
  const [inputs, setInputs] = useState<WebMidi.MIDIInput[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeBrowserInputs, setActiveBrowserInputs] = useState<Set<string>>(new Set())
  const { socket, connected: socketConnected } = useSocket()
  const showStatusMessage = useStore(state => state.showStatusMessage)
  const addMidiMessageToStore = useStore(state => state.addMidiMessage)

  // Initialize Web MIDI API
  useEffect(() => {
    const initMidi = async () => {
      try {
        if (navigator.requestMIDIAccess) {
          const access = await navigator.requestMIDIAccess({ sysex: false })
          setMidiAccess(access)
          setBrowserMidiEnabled(true)
          
          // Update inputs list
          const inputList = Array.from(access.inputs.values())
          setInputs(inputList)
          
          showStatusMessage('Browser MIDI initialized successfully', 'success')
        } else {
          setError('Web MIDI API not supported in this browser')
          showStatusMessage('Web MIDI API not supported in this browser', 'error')
        }
      } catch (err: unknown) {
        console.error('[useBrowserMidi] Failed to initialize Web MIDI:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        showStatusMessage(`MIDI initialization failed: ${errorMessage}`, 'error')
      }
    }

    initMidi()
  }, [showStatusMessage])

  // Handle state changes
  const handleStateChange = useCallback((event: WebMidi.MIDIConnectionEvent) => {
    if (midiAccess) {
      const inputList = Array.from(midiAccess.inputs.values())
      setInputs(inputList)
      
      const portName = event.port.name || 'Unknown device'
      showStatusMessage(
        `MIDI device ${portName} ${event.port.state}`, 
        event.port.state === 'connected' ? 'success' : 'info'
      )

      if (event.port.state === 'disconnected') {
        setActiveBrowserInputs(prev => {
          const newSet = new Set(prev)
          newSet.delete(event.port.id)
          console.log(`[useBrowserMidi] Device ${portName} disconnected, removed from active inputs.`)
          return newSet
        })
      }
    }
  }, [midiAccess, showStatusMessage])

  useEffect(() => {
    if (midiAccess) {
      midiAccess.onstatechange = handleStateChange
      return () => {
        if (midiAccess) {
          midiAccess.onstatechange = null
        }
      }
    }
  }, [midiAccess, handleStateChange])

  // Set up MIDI message handlers for active inputs
  useEffect(() => {
    if (!midiAccess) return

    const handleMidiMessage = (event: WebMidi.MIDIMessageEvent) => {
      const [status, data1, data2] = event.data

      // Extract message type and channel
      const messageType = status >> 4
      const channel = status & 0xf

      // Get source name safely
      const sourceInput = event.target as WebMidi.MIDIInput
      const source = sourceInput?.name || 'Browser MIDI'

      let message: any = null

      console.log(`[useBrowserMidi] Raw MIDI from ${source} (ID: ${sourceInput?.id}):`, event.data)

      if (messageType === 0x9) { // Note On
        message = { _type: 'noteon', channel, note: data1, velocity: data2, source }
      } else if (messageType === 0x8) { // Note Off
        message = { _type: 'noteoff', channel, note: data1, velocity: data2, source }
      } else if (messageType === 0xB) { // Control Change
        message = { _type: 'cc', channel, controller: data1, value: data2, source }
      }

      if (message) {
        if (socket && socketConnected) {
          socket.emit('browserMidiMessage', message)
        } else {
          console.warn('[useBrowserMidi] Socket not connected. MIDI message not sent to server.')
        }

        if (addMidiMessageToStore) {
          addMidiMessageToStore(message)
        } else {
          console.error('[useBrowserMidi] addMidiMessage action not found in store')
        }
      }
    }

    // Detach listeners from all inputs first to prevent duplicates on re-renders
    midiAccess.inputs.forEach(input => {
      if (input.onmidimessage) {
        input.onmidimessage = null
      }
    })

    // Attach listeners only to currently active inputs
    activeBrowserInputs.forEach(inputId => {
      const input = midiAccess.inputs.get(inputId)
      if (input) {
        console.log(`[useBrowserMidi] Attaching listener to active input: ${input.name} (ID: ${input.id})`)
        input.onmidimessage = handleMidiMessage
      } else {
        console.warn(`[useBrowserMidi] Active input ID ${inputId} not found in midiAccess.inputs during listener attachment.`)
      }
    })

    return () => {
      // Cleanup: Detach listeners from all inputs that might have had them
      midiAccess.inputs.forEach(input => {
        if (input.onmidimessage) {
          input.onmidimessage = null
        }
      })
    }
  }, [midiAccess, socket, socketConnected, activeBrowserInputs, addMidiMessageToStore])

  // Connect to a MIDI input
  const connectBrowserInput = useCallback((inputId: string) => {
    if (!midiAccess) {
      showStatusMessage('MIDI Access not available.', 'error')
      return
    }

    const input = midiAccess.inputs.get(inputId)
    if (input) {
      setActiveBrowserInputs(prev => new Set(prev).add(inputId))
      showStatusMessage(`Connecting to MIDI device: ${input.name}`, 'info')
      console.log(`[useBrowserMidi] Added ${input.name} (ID: ${inputId}) to active inputs. Listener will be (re)attached.`)
    } else {
      showStatusMessage(`MIDI Input device with ID ${inputId} not found.`, 'error')
    }
  }, [midiAccess, showStatusMessage])

  // Disconnect from a MIDI input
  const disconnectBrowserInput = useCallback((inputId: string) => {
    if (!midiAccess) return

    const input = midiAccess.inputs.get(inputId)
    if (input) {
      setActiveBrowserInputs(prev => {
        const newSet = new Set(prev)
        newSet.delete(inputId)
        return newSet
      })
      showStatusMessage(`Disconnected from MIDI device: ${input.name}`, 'info')
      console.log(`[useBrowserMidi] Removed ${input.name} (ID: ${inputId}) from active inputs. Listener will be detached.`)
    } else {
      showStatusMessage(`MIDI Input device with ID ${inputId} not found for disconnection.`, 'error')
    }
  }, [midiAccess, showStatusMessage])

  // Refresh MIDI devices list
  const refreshDevices = useCallback(() => {
    if (midiAccess) {
      const inputList = Array.from(midiAccess.inputs.values())
      setInputs(inputList)
      showStatusMessage('MIDI device list refreshed', 'info')
      console.log('[useBrowserMidi] Refreshed MIDI devices list:', inputList)
    } else {
      showStatusMessage('MIDI Access not available to refresh devices.', 'error')
    }
  }, [midiAccess, showStatusMessage])

  return {
    isSupported: browserMidiEnabled,
    error,
    browserInputs: inputs,
    activeBrowserInputs,
    connectBrowserInput,
    disconnectBrowserInput,
    refreshDevices,
    midiAccess
  }
}