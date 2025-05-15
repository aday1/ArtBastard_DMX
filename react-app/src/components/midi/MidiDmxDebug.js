import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
/**
 * A debug component to help diagnose MIDI to DMX communication issues
 */
const MidiDmxDebug = () => {
    const [isActive, setIsActive] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const [testChannel, setTestChannel] = useState(0);
    const [logs, setLogs] = useState([]);
    const midiMappings = useStore((state) => state.midiMappings);
    const midiMessages = useStore((state) => state.midiMessages);
    const dmxChannels = useStore((state) => state.dmxChannels);
    const addMidiMessage = useStore((state) => state.addMidiMessage);
    const addLog = (message) => {
        setLogs(prev => [message, ...prev].slice(0, 50)); // Keep last 50 logs
    };
    // Monitor DMX channel updates
    useEffect(() => {
        if (!isActive)
            return;
        const handleDmxChannelUpdate = (event) => {
            const customEvent = event;
            setLastEvent(customEvent.detail);
            addLog(`[${new Date().toLocaleTimeString()}] DMX Update CH ${customEvent.detail.channel}: ${customEvent.detail.value}`);
        };
        window.addEventListener('dmxChannelUpdate', handleDmxChannelUpdate);
        addLog('[Debug] Started monitoring dmxChannelUpdate events');
        return () => {
            window.removeEventListener('dmxChannelUpdate', handleDmxChannelUpdate);
        };
    }, [isActive]);
    // Monitor MIDI messages
    useEffect(() => {
        if (!isActive || midiMessages.length === 0)
            return;
        const latestMessage = midiMessages[midiMessages.length - 1];
        addLog(`[${new Date().toLocaleTimeString()}] MIDI ${latestMessage._type} CH ${latestMessage.channel} ${latestMessage.controller !== undefined ? `CC ${latestMessage.controller}` : `Note ${latestMessage.note}`} Value ${latestMessage.value || latestMessage.velocity}`);
    }, [isActive, midiMessages]);
    // Send a test MIDI message
    const sendTestMessage = () => {
        // Find mapping for this channel
        const mapping = midiMappings[testChannel];
        if (!mapping) {
            addLog(`[ERROR] No MIDI mapping found for DMX channel ${testChannel}`);
            return;
        }
        if (mapping.controller !== undefined) {
            // Send a CC message
            const testValue = 64; // Middle value
            const message = {
                _type: 'cc',
                channel: mapping.channel,
                controller: mapping.controller,
                value: testValue,
                source: 'Debug Tool'
            };
            addLog(`Sending test CC message for DMX ${testChannel}: CH ${mapping.channel} CC ${mapping.controller} Value ${testValue}`);
            addMidiMessage(message);
        }
        else if (mapping.note !== undefined) {
            // Send a note message
            const testVelocity = 64; // Middle value
            const message = {
                _type: 'noteon',
                channel: mapping.channel,
                note: mapping.note,
                velocity: testVelocity,
                source: 'Debug Tool'
            };
            addLog(`Sending test Note message for DMX ${testChannel}: CH ${mapping.channel} Note ${mapping.note} Vel ${testVelocity}`);
            addMidiMessage(message);
        }
    };
    // Send a sequence of values
    const sendSequence = () => {
        const mapping = midiMappings[testChannel];
        if (!mapping) {
            addLog(`[ERROR] No MIDI mapping found for DMX channel ${testChannel}`);
            return;
        }
        addLog(`Starting value sequence for DMX channel ${testChannel}`);
        let step = 0;
        const totalSteps = 10;
        const interval = setInterval(() => {
            if (step > totalSteps) {
                clearInterval(interval);
                addLog('Sequence complete');
                return;
            }
            const value = Math.floor((step / totalSteps) * 127);
            if (mapping.controller !== undefined) {
                // Send a CC message
                addMidiMessage({
                    _type: 'cc',
                    channel: mapping.channel,
                    controller: mapping.controller,
                    value,
                    source: 'Debug Sequence'
                });
            }
            else if (mapping.note !== undefined) {
                // Send a note message
                addMidiMessage({
                    _type: 'noteon',
                    channel: mapping.channel,
                    note: mapping.note,
                    velocity: value,
                    source: 'Debug Sequence'
                });
            }
            step++;
        }, 200);
    };
    // Toggle debugger state
    const toggleActive = () => {
        setIsActive(!isActive);
        if (!isActive) {
            addLog('[Debug] Debugger activated');
        }
    };
    // Check that MidiDmxProcessor is properly initialized
    const checkMidiDmxProcessor = () => {
        if (!window.midiDmxProcessor) {
            addLog('[ERROR] midiDmxProcessor not found in window object');
            return;
        }
        addLog('[OK] midiDmxProcessor is available');
        // Check range mappings
        const mappings = window.midiDmxProcessor.getChannelRangeMappings();
        addLog(`Found ${Object.keys(mappings).length} range mappings`);
        // Check MIDI mappings
        addLog(`Found ${Object.keys(midiMappings).length} MIDI mappings`);
        Object.entries(midiMappings).forEach(([dmxChannel, mapping]) => {
            if (mapping) {
                addLog(`DMX ${dmxChannel} → ${mapping.controller !== undefined ?
                    `CC ${mapping.channel}:${mapping.controller}` :
                    `Note ${mapping.channel}:${mapping.note}`}`);
            }
        });
        // Check element selectors
        const slider = document.querySelector(`[data-dmx-channel="${testChannel}"]`);
        if (slider) {
            addLog(`[OK] Found slider element for channel ${testChannel}`);
        }
        else {
            addLog(`[ERROR] Can't find slider element for channel ${testChannel}`);
        }
        // Test custom event system
        window.addEventListener('debugEvent', (event) => {
            addLog(`[OK] Received test event: ${JSON.stringify(event.detail || {})}`);
        }, { once: true });
        window.dispatchEvent(new CustomEvent('debugEvent', {
            detail: { test: 'event system' }
        }));
    };
    // Test if the event system is working
    const testEventSystem = () => {
        addLog('Dispatching test DMX update event');
        window.dispatchEvent(new CustomEvent('dmxChannelUpdate', {
            detail: { channel: testChannel, value: 127 }
        }));
    };
    if (!isActive) {
        return (_jsx("div", { style: {
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                zIndex: 9999
            }, children: _jsx("button", { onClick: toggleActive, style: { padding: '5px 10px' }, children: "Debug MIDI-DMX" }) }));
    }
    return (_jsxs("div", { style: {
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: '400px',
            height: '500px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#00ff00',
            fontFamily: 'monospace',
            padding: '10px',
            borderRadius: '5px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999
        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }, children: [_jsx("h3", { style: { margin: 0 }, children: "MIDI-DMX Debugger" }), _jsx("button", { onClick: toggleActive, children: "Close" })] }), _jsxs("div", { style: { marginBottom: '10px' }, children: [_jsxs("div", { style: { display: 'flex', gap: '10px', marginBottom: '5px' }, children: [_jsxs("label", { children: ["DMX Channel:", _jsx("input", { type: "number", min: "0", max: "511", value: testChannel, onChange: (e) => setTestChannel(parseInt(e.target.value, 10)), style: { width: '50px', marginLeft: '5px' } })] }), _jsxs("div", { children: ["Value: ", dmxChannels[testChannel] || 0, lastEvent?.channel === testChannel && _jsxs("span", { style: { color: 'yellow' }, children: [" (Event: ", lastEvent.value, ")"] })] })] }), _jsxs("div", { style: { display: 'flex', gap: '5px' }, children: [_jsx("button", { onClick: sendTestMessage, children: "Send Test" }), _jsx("button", { onClick: sendSequence, children: "Run Sequence" }), _jsx("button", { onClick: checkMidiDmxProcessor, children: "Check Processor" }), _jsx("button", { onClick: testEventSystem, children: "Test Events" })] })] }), _jsx("div", { style: {
                    flex: 1,
                    overflowY: 'auto',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '5px',
                    fontSize: '12px'
                }, children: logs.map((log, index) => (_jsx("div", { style: {
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        paddingBottom: '2px',
                        marginBottom: '2px'
                    }, children: log }, index))) })] }));
};
export default MidiDmxDebug;
