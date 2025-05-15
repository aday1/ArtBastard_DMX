import React, { useEffect } from 'react'
import { Layout } from './components/layout/Layout'
import { SocketProvider } from './context/SocketContext'
import { ThemeProvider } from './context/ThemeContext'
import { useStore } from './store'
import MainPage from './pages/MainPage'
import { useBrowserMidi } from './hooks/useBrowserMidi'; // Import the hook
import MidiDmxProcessor from './components/midi/MidiDmxProcessor';
import MidiDebugHelper from './components/midi/MidiDebugHelper';
import MidiDmxDebug from './components/midi/MidiDmxDebug';
import './utils/midiTestUtils'; // Import MIDI testing utilities

function App() {
  const fetchInitialState = useStore((state) => state.fetchInitialState)
  
  // Use the hook and get the returned values - particularly browserInputs and connectBrowserInput
  const { browserInputs, connectBrowserInput, refreshDevices, isSupported } = useBrowserMidi();

  // Auto-connect to MIDI devices
  useEffect(() => {
    if (isSupported && browserInputs.length > 0) {
      console.log('[App] Found MIDI inputs:', browserInputs.length);
      // Automatically connect to all available MIDI devices
      browserInputs.forEach(input => {
        console.log(`[App] Auto-connecting to MIDI device: ${input.name} (ID: ${input.id})`);
        connectBrowserInput(input.id);
      });
      
      // Trigger refreshDevices periodically to check for new MIDI devices
      const intervalId = setInterval(() => {
        console.log('[App] Refreshing MIDI device connections...');
        refreshDevices();
      }, 10000); // Every 10 seconds
      
      return () => clearInterval(intervalId);
    } else if (isSupported) {
      console.log('[App] MIDI supported but no inputs found. Will retry in 5s...');
      // If no inputs found but MIDI is supported, try refreshing after a delay
      const timeoutId = setTimeout(() => {
        console.log('[App] Refreshing MIDI devices...');
        refreshDevices();
      }, 5000);
      return () => clearTimeout(timeoutId);
    } else {
      console.log('[App] WebMIDI API not supported by this browser.');
    }
  }, [browserInputs, connectBrowserInput, refreshDevices, isSupported]);

  useEffect(() => {
    // Initialize global store reference
    if (typeof window !== 'undefined' && !window.useStore) {
      window.useStore = useStore;
      console.log('Global store reference initialized in App component');
    }
    
    // Fetch initial state
    fetchInitialState()
  }, [fetchInitialState])

  return (
    <ThemeProvider children={
      <SocketProvider children={
        <>
          {/* This component processes MIDI messages and updates DMX channels */}
          <MidiDmxProcessor />
          {/* This component provides keyboard shortcuts to test MIDI functionality */}
          <MidiDebugHelper />
          {/* This component helps debug MIDI to DMX communication issues */}
          <MidiDmxDebug />
          <Layout children={
            <MainPage />
          } />
        </>
      } />
    } />
  )
}

export default App