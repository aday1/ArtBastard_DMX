import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { MidiMapping } from '../store'

export const useMidiLearn = () => {
  const {
    midiLearnChannel,
    midiMessages,
    startMidiLearn: startMidiLearnAction,
    cancelMidiLearn: cancelMidiLearnAction,
    addMidiMapping,
    showStatusMessage,
  } = useStore((state) => ({
    midiLearnChannel: state.midiLearnChannel,
    midiMessages: state.midiMessages,
    startMidiLearn: state.startMidiLearn,
    cancelMidiLearn: state.cancelMidiLearn,
    addMidiMapping: state.addMidiMapping,
    showStatusMessage: state.showStatusMessage,
  }))
  
  const [learnStatus, setLearnStatus] = useState<'idle' | 'learning' | 'success' | 'timeout'>('idle')
  const [timeoutId, setTimeoutId] = useState<number | null>(null)
  
  // Start MIDI learn mode for a channel
  const startLearn = useCallback((channel: number) => {
    if (midiLearnChannel !== null && midiLearnChannel !== channel) {
      cancelMidiLearnAction() 
      console.log(`[MidiLearn] Canceled previous learn for CH ${midiLearnChannel} to start CH ${channel}`);
    }
    
    startMidiLearnAction(channel)
    setLearnStatus('learning')
    showStatusMessage(`MIDI Learn started for DMX CH ${channel + 1}. Send a MIDI CC.`, 'info');
    console.log(`[MidiLearn] Started for DMX CH ${channel}. Status: learning.`);
    
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }

    const newTimeoutId = window.setTimeout(() => {
      if (useStore.getState().midiLearnChannel === channel) { 
        cancelMidiLearnAction()
        setLearnStatus('timeout')
        showStatusMessage(`MIDI Learn for DMX CH ${channel + 1} timed out.`, 'error');
        console.log(`[MidiLearn] Timed out for DMX CH ${channel}. Status: timeout.`);
      }
    }, 30000)
    
    setTimeoutId(newTimeoutId)
  }, [midiLearnChannel, startMidiLearnAction, cancelMidiLearnAction, showStatusMessage, timeoutId])
  
  // Cancel MIDI learn mode
  const cancelLearn = useCallback(() => {
    if (midiLearnChannel !== null) {
      console.log(`[MidiLearn] Cancelling learn for DMX CH ${midiLearnChannel}. Status: idle.`);
      cancelMidiLearnAction()
      showStatusMessage(`MIDI Learn cancelled for DMX CH ${midiLearnChannel + 1}.`, 'info');
    }
    setLearnStatus('idle')
    
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      setTimeoutId(null)
    }
  }, [cancelMidiLearnAction, midiLearnChannel, timeoutId, showStatusMessage])
  
  // Reset learn status after success or timeout
  useEffect(() => {
    let resetTimer: number | null = null;
    if (learnStatus === 'success' || learnStatus === 'timeout') {
      console.log(`[MidiLearn] Learn status is ${learnStatus}. Will reset to idle in 3 seconds.`);
      resetTimer = window.setTimeout(() => {
        setLearnStatus('idle');
        console.log('[MidiLearn] Learn status reset to idle.');
      }, 3000);
    }
    return () => {
      if (resetTimer) {
        window.clearTimeout(resetTimer);
      }
    };
  }, [learnStatus])
  
  // Listen for MIDI messages during learn mode
  useEffect(() => {
    if (midiLearnChannel === null || learnStatus !== 'learning' || midiMessages.length === 0) {
      return;
    }

    const latestMessage = midiMessages[midiMessages.length - 1]
    console.log('[MidiLearn] In learn mode. Processing message:', latestMessage, `for DMX CH ${midiLearnChannel}`);
    
    if (latestMessage._type === 'cc' && latestMessage.controller !== undefined) {
      const mapping: MidiMapping = {
        channel: latestMessage.channel,
        controller: latestMessage.controller
      }
      console.log(`[MidiLearn] Creating CC mapping for DMX CH ${midiLearnChannel}:`, mapping);
      
      addMidiMapping(midiLearnChannel, mapping)
      
      const event = new CustomEvent('midiMappingCreated', { detail: { channel: midiLearnChannel, mapping } })
      window.dispatchEvent(event)
      
      setLearnStatus('success')
      showStatusMessage(`DMX CH ${midiLearnChannel + 1} mapped to MIDI CC ${mapping.controller} on CH ${mapping.channel + 1}.`, 'success');
      console.log(`[MidiLearn] Success for DMX CH ${midiLearnChannel}. Status: success.`);
      
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        setTimeoutId(null)
      }
    } else {
      console.log('[MidiLearn] Ignoring non-CC message or message without controller:', latestMessage._type);
    }
  }, [midiMessages, midiLearnChannel, learnStatus, addMidiMapping, timeoutId, showStatusMessage, cancelMidiLearnAction]);
  
  return {
    isLearning: midiLearnChannel !== null && learnStatus === 'learning',
    learnStatus,
    currentLearningChannel: midiLearnChannel,
    startLearn,
    cancelLearn
  }
}