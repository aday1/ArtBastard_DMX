import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { useSocket } from '../context/SocketContext'
import { MidiMapping } from '../store'

export const useMidiLearn = () => {
  const { socket } = useSocket()
  const {
    midiLearnChannel,
    midiMessages,
    startMidiLearn,
    cancelMidiLearn,
    addMidiMapping,
  } = useStore((state) => ({
    midiLearnChannel: state.midiLearnChannel,
    midiMessages: state.midiMessages,
    startMidiLearn: state.startMidiLearn,
    cancelMidiLearn: state.cancelMidiLearn,
    addMidiMapping: state.addMidiMapping,
  }))
  
  const [learnStatus, setLearnStatus] = useState<'idle' | 'learning' | 'success' | 'timeout'>('idle')
  const [timeoutId, setTimeoutId] = useState<number | null>(null)
  
  // Start MIDI learn mode for a channel
  const startLearn = useCallback((channel: number) => {
    // Cancel any previous learning mode
    if (midiLearnChannel !== null) {
      cancelMidiLearn()
    }
    
    // Start the new learning mode
    startMidiLearn(channel)
    setLearnStatus('learning')
    
    // Set a timeout to cancel if no MIDI input is received
    const id = window.setTimeout(() => {
      if (midiLearnChannel === channel) {
        cancelMidiLearn()
        setLearnStatus('timeout')
      }
    }, 30000) // 30 seconds timeout
    
    setTimeoutId(id)
  }, [midiLearnChannel, cancelMidiLearn, startMidiLearn])
  
  // Cancel MIDI learn mode
  const cancelLearn = useCallback(() => {
    cancelMidiLearn()
    setLearnStatus('idle')
    
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      setTimeoutId(null)
    }
  }, [cancelMidiLearn, timeoutId])
  
  // Reset learn status after timeout
  useEffect(() => {
    if (learnStatus === 'timeout' || learnStatus === 'success') {
      console.log(`Learn status changed to ${learnStatus}, will reset to idle in 3 seconds`);
      const resetTimeout = window.setTimeout(() => {
        setLearnStatus('idle');
        console.log('Learn status reset to idle');
      }, 3000);
      
      return () => window.clearTimeout(resetTimeout);
    }
  }, [learnStatus])
  
  // Listen for MIDI messages during learn mode
  useEffect(() => {
    if (midiLearnChannel !== null && midiMessages.length > 0) {
      const latestMessage = midiMessages[midiMessages.length - 1]
      
      // Only process if we're in learning mode
      if (learnStatus === 'learning') {
        console.log('[MidiLearn] Processing message for MIDI learn:', latestMessage)
        
        // Handle only note on and cc messages for mapping
        if (latestMessage._type === 'noteon' || latestMessage._type === 'cc') {
          let mapping: MidiMapping
          
          if (latestMessage._type === 'noteon') {
            mapping = {
              channel: latestMessage.channel,
              note: latestMessage.note
            }
            console.log('[MidiLearn] Creating note mapping:', mapping)
          } else { // cc
            mapping = {
              channel: latestMessage.channel,
              controller: latestMessage.controller
            }
            console.log('[MidiLearn] Creating CC mapping for DMX channel', midiLearnChannel, mapping)
          }
          
          // Add the mapping - this updates the store
          addMidiMapping(midiLearnChannel, mapping)
          
          // Force immediate update for the UI
          const event = new CustomEvent('midiMappingCreated', { detail: { channel: midiLearnChannel, mapping } })
          window.dispatchEvent(event)
          
          // Update status
          setLearnStatus('success')
          
          // Alert the MidiDmxProcessor that a new mapping has been created
          if (typeof window !== 'undefined') {
            console.log(`[MidiLearn] Dispatching midiMappingCreated event for channel ${midiLearnChannel}`);
            window.dispatchEvent(new CustomEvent('midiMappingCreated', { 
              detail: { channel: midiLearnChannel, mapping }
            }));
          }
          
          // Clear the timeout
          if (timeoutId) {
            window.clearTimeout(timeoutId)
            setTimeoutId(null)
          }
        }
      }
    }
  }, [midiMessages, midiLearnChannel, learnStatus, addMidiMapping, timeoutId])
  
  return {
    isLearning: midiLearnChannel !== null,
    learnStatus,
    currentLearningChannel: midiLearnChannel,
    startLearn,
    cancelLearn
  }
}