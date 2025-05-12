import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useStore } from '../store';
export const useBrowserMidi = () => {
    const [midiAccess, setMidiAccess] = useState(null);
    const [browserMidiEnabled, setBrowserMidiEnabled] = useState(false);
    const [inputs, setInputs] = useState([]);
    const [error, setError] = useState(null);
    const [activeBrowserInputs, setActiveBrowserInputs] = useState(new Set());
    const { socket } = useSocket();
    const showStatusMessage = useStore(state => state.showStatusMessage);
    // Initialize Web MIDI API
    useEffect(() => {
        const initMidi = async () => {
            try {
                if (navigator.requestMIDIAccess) {
                    const access = await navigator.requestMIDIAccess({ sysex: false });
                    setMidiAccess(access);
                    setBrowserMidiEnabled(true);
                    // Update inputs list
                    const inputList = Array.from(access.inputs.values());
                    setInputs(inputList);
                    showStatusMessage('Browser MIDI initialized successfully', 'success');
                }
                else {
                    setError('Web MIDI API not supported in this browser');
                    showStatusMessage('Web MIDI API not supported in this browser', 'error');
                }
            }
            catch (err) {
                console.error('Failed to initialize Web MIDI:', err);
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(errorMessage);
                showStatusMessage(`MIDI initialization failed: ${errorMessage}`, 'error');
            }
        };
        initMidi();
    }, [showStatusMessage]);
    // Handle state changes
    const handleStateChange = useCallback((event) => {
        if (midiAccess) {
            const inputList = Array.from(midiAccess.inputs.values());
            setInputs(inputList);
            const portName = event.port.name || 'Unknown device';
            showStatusMessage(`MIDI device ${portName} ${event.port.state}`, event.port.state === 'connected' ? 'success' : 'info');
        }
    }, [midiAccess, showStatusMessage]);
    // Set up MIDI message handlers
    useEffect(() => {
        if (!midiAccess || !socket)
            return;
        const handleMidiMessage = (event) => {
            const [status, data1, data2] = event.data;
            // Extract message type and channel
            const messageType = status >> 4;
            const channel = status & 0xf;
            // Get source name safely
            const source = event.target?.name || 'Browser MIDI';
            // Handle Note On messages (0x9)
            if (messageType === 0x9) {
                socket.emit('browserMidiMessage', {
                    _type: 'noteon',
                    channel,
                    note: data1,
                    velocity: data2,
                    source
                });
            }
            // Handle Note Off messages (0x8)
            else if (messageType === 0x8) {
                socket.emit('browserMidiMessage', {
                    _type: 'noteoff',
                    channel,
                    note: data1,
                    velocity: data2,
                    source
                });
            }
            // Handle Control Change messages (0xB)
            else if (messageType === 0xB) {
                socket.emit('browserMidiMessage', {
                    _type: 'cc',
                    channel,
                    controller: data1,
                    value: data2,
                    source
                });
            }
        };
        // Add message handlers to all inputs
        inputs.forEach(input => {
            input.onmidimessage = handleMidiMessage;
        });
        // Set up state change handler
        midiAccess.onstatechange = handleStateChange;
        return () => {
            // Clean up handlers
            inputs.forEach(input => {
                input.onmidimessage = null;
            });
            if (midiAccess) {
                midiAccess.onstatechange = null;
            }
        };
    }, [midiAccess, inputs, socket, handleStateChange]);
    // Connect to a MIDI input
    const connectBrowserInput = useCallback((inputId) => {
        if (!midiAccess)
            return;
        const input = midiAccess.inputs.get(inputId);
        if (input) {
            setActiveBrowserInputs(prev => {
                const newSet = new Set(prev);
                newSet.add(inputId);
                return newSet;
            });
            showStatusMessage(`Connected to MIDI device: ${input.name}`, 'success');
        }
    }, [midiAccess, showStatusMessage]);
    // Disconnect from a MIDI input
    const disconnectBrowserInput = useCallback((inputId) => {
        if (!midiAccess)
            return;
        const input = midiAccess.inputs.get(inputId);
        if (input) {
            setActiveBrowserInputs(prev => {
                const newSet = new Set(prev);
                newSet.delete(inputId);
                return newSet;
            });
            showStatusMessage(`Disconnected from MIDI device: ${input.name}`, 'info');
        }
    }, [midiAccess, showStatusMessage]);
    // Refresh MIDI devices list
    const refreshDevices = useCallback(() => {
        if (midiAccess) {
            const inputList = Array.from(midiAccess.inputs.values());
            setInputs(inputList);
            showStatusMessage('MIDI device list refreshed', 'info');
        }
    }, [midiAccess, showStatusMessage]);
    return {
        isSupported: browserMidiEnabled,
        error,
        browserInputs: inputs,
        activeBrowserInputs,
        connectBrowserInput,
        disconnectBrowserInput,
        refreshDevices,
        midiAccess
    };
};
