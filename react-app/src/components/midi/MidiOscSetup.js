import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { useBrowserMidi } from '../../hooks/useBrowserMidi';
import { MidiVisualizer } from './MidiVisualizer';
import styles from './MidiOscSetup.module.scss';
export const MidiOscSetup = () => {
    const { theme } = useTheme();
    const { socket, connected } = useSocket();
    const { isSupported: browserMidiSupported, error: browserMidiError, browserInputs, activeBrowserInputs, connectBrowserInput, disconnectBrowserInput, refreshDevices } = useBrowserMidi();
    const [midiInterfaces, setMidiInterfaces] = useState([]);
    const [activeInterfaces, setActiveInterfaces] = useState([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [oscConfig, setOscConfig] = useState({ host: '127.0.0.1', port: 8000 });
    const midiMessages = useStore(state => state.midiMessages);
    const clearAllMidiMappings = useStore(state => state.clearAllMidiMappings);
    // Request MIDI interfaces on component mount
    useEffect(() => {
        if (socket && connected) {
            socket.emit('getMidiInterfaces');
            // Listen for MIDI interfaces
            const handleMidiInterfaces = (interfaces) => {
                setMidiInterfaces(interfaces);
                setIsRefreshing(false);
            };
            // Listen for active MIDI interfaces
            const handleActiveInterfaces = (active) => {
                setActiveInterfaces(active);
            };
            socket.on('midiInterfaces', handleMidiInterfaces);
            socket.on('midiInputsActive', handleActiveInterfaces);
            return () => {
                socket.off('midiInterfaces', handleMidiInterfaces);
                socket.off('midiInputsActive', handleActiveInterfaces);
            };
        }
    }, [socket, connected]);
    // Refresh all MIDI interfaces
    const handleRefreshMidi = () => {
        if (socket && connected) {
            setIsRefreshing(true);
            socket.emit('getMidiInterfaces');
        }
        // Also refresh browser MIDI devices
        if (browserMidiSupported) {
            refreshDevices();
        }
    };
    // Connect to server MIDI interface
    const handleConnectMidi = (interfaceName) => {
        if (socket && connected) {
            socket.emit('selectMidiInterface', interfaceName);
        }
    };
    // Disconnect from server MIDI interface
    const handleDisconnectMidi = (interfaceName) => {
        if (socket && connected) {
            socket.emit('disconnectMidiInterface', interfaceName);
        }
    };
    // Save OSC configuration
    const handleSaveOscConfig = () => {
        if (socket && connected) {
            socket.emit('saveOscConfig', oscConfig);
            useStore.getState().showStatusMessage('OSC configuration saved', 'success');
        }
    };
    // Clear all MIDI messages
    const handleClearMidiMessages = () => {
        useStore.setState({ midiMessages: [] });
    };
    // Forget all MIDI mappings with confirmation
    const handleForgetAllMappings = () => {
        if (window.confirm('Are you sure you want to forget all MIDI mappings? This cannot be undone.')) {
            clearAllMidiMappings();
        }
    };
    return (_jsxs("div", { className: styles.midiOscSetup, children: [_jsxs("h2", { className: styles.sectionTitle, children: [theme === 'artsnob' && 'MIDI/OSC Atelier: The Digital Orchestration', theme === 'standard' && 'MIDI/OSC Setup', theme === 'minimal' && 'MIDI/OSC'] }), _jsxs("div", { className: styles.setupGrid, children: [_jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardHeader, children: _jsxs("h3", { children: [theme === 'artsnob' && 'Server MIDI Interfaces: The Distant Muses', theme === 'standard' && 'Server MIDI Interfaces', theme === 'minimal' && 'Server MIDI'] }) }), _jsx("div", { className: styles.cardBody, children: _jsx("div", { className: styles.interfaceList, children: midiInterfaces.length === 0 ? (_jsxs("div", { className: styles.emptyState, children: [_jsx("i", { className: "fas fa-music" }), _jsx("p", { children: "No server MIDI interfaces detected" }), _jsxs("button", { className: styles.refreshButton, onClick: handleRefreshMidi, disabled: isRefreshing, children: [isRefreshing ? (_jsx("i", { className: "fas fa-spinner fa-spin" })) : (_jsx("i", { className: "fas fa-sync-alt" })), "Refresh"] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: styles.interfaceHeader, children: [_jsx("span", { className: styles.interfaceName, children: "Interface Name" }), _jsx("span", { className: styles.interfaceStatus, children: "Status" }), _jsx("span", { className: styles.interfaceActions, children: "Actions" })] }), midiInterfaces.map((interfaceName) => (_jsxs("div", { className: styles.interfaceItem, children: [_jsx("span", { className: styles.interfaceName, children: interfaceName }), _jsx("span", { className: `${styles.interfaceStatus} ${activeInterfaces.includes(interfaceName) ? styles.active : ''}`, children: activeInterfaces.includes(interfaceName) ? 'Connected' : 'Disconnected' }), _jsx("div", { className: styles.interfaceActions, children: activeInterfaces.includes(interfaceName) ? (_jsxs("button", { className: `${styles.actionButton} ${styles.disconnectButton}`, onClick: () => handleDisconnectMidi(interfaceName), children: [_jsx("i", { className: "fas fa-unlink" }), theme !== 'minimal' && 'Disconnect'] })) : (_jsxs("button", { className: `${styles.actionButton} ${styles.connectButton}`, onClick: () => handleConnectMidi(interfaceName), children: [_jsx("i", { className: "fas fa-link" }), theme !== 'minimal' && 'Connect'] })) })] }, interfaceName))), _jsxs("button", { className: styles.refreshButton, onClick: handleRefreshMidi, disabled: isRefreshing, children: [isRefreshing ? (_jsx("i", { className: "fas fa-spinner fa-spin" })) : (_jsx("i", { className: "fas fa-sync-alt" })), "Refresh"] })] })) }) })] }), _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardHeader, children: _jsxs("h3", { children: [theme === 'artsnob' && 'Browser MIDI Interfaces: The Local Orchestrators', theme === 'standard' && 'Browser MIDI Devices', theme === 'minimal' && 'Browser MIDI'] }) }), _jsx("div", { className: styles.cardBody, children: _jsx("div", { className: styles.interfaceList, children: !browserMidiSupported ? (_jsxs("div", { className: styles.emptyState, children: [_jsx("i", { className: "fas fa-exclamation-triangle" }), _jsx("p", { children: "Web MIDI API is not supported in this browser." }), _jsx("p", { className: styles.browserMidiError, children: browserMidiError || 'Try using Chrome or Edge instead.' })] })) : browserInputs.length === 0 ? (_jsxs("div", { className: styles.emptyState, children: [_jsx("i", { className: "fas fa-music" }), _jsx("p", { children: "No browser MIDI devices detected" }), _jsxs("button", { className: styles.refreshButton, onClick: refreshDevices, disabled: isRefreshing, children: [isRefreshing ? (_jsx("i", { className: "fas fa-spinner fa-spin" })) : (_jsx("i", { className: "fas fa-sync-alt" })), "Refresh"] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: styles.interfaceHeader, children: [_jsx("span", { className: styles.interfaceName, children: "Device Name" }), _jsx("span", { className: styles.interfaceStatus, children: "Status" }), _jsx("span", { className: styles.interfaceActions, children: "Actions" })] }), browserInputs.map((input) => (_jsxs("div", { className: styles.interfaceItem, children: [_jsxs("span", { className: styles.interfaceName, children: [input.name, _jsx("span", { className: styles.interfaceManufacturer, children: input.manufacturer })] }), _jsx("span", { className: `${styles.interfaceStatus} ${activeBrowserInputs.has(input.id) ? styles.active : ''}`, children: activeBrowserInputs.has(input.id) ? 'Connected' : 'Disconnected' }), _jsx("div", { className: styles.interfaceActions, children: activeBrowserInputs.has(input.id) ? (_jsxs("button", { className: `${styles.actionButton} ${styles.disconnectButton}`, onClick: () => disconnectBrowserInput(input.id), children: [_jsx("i", { className: "fas fa-unlink" }), theme !== 'minimal' && 'Disconnect'] })) : (_jsxs("button", { className: `${styles.actionButton} ${styles.connectButton}`, onClick: () => connectBrowserInput(input.id), children: [_jsx("i", { className: "fas fa-link" }), theme !== 'minimal' && 'Connect'] })) })] }, input.id))), _jsxs("button", { className: styles.refreshButton, onClick: refreshDevices, disabled: isRefreshing, children: [isRefreshing ? (_jsx("i", { className: "fas fa-spinner fa-spin" })) : (_jsx("i", { className: "fas fa-sync-alt" })), "Refresh"] })] })) }) })] }), _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardHeader, children: _jsxs("h3", { children: [theme === 'artsnob' && 'OSC Configuration: Network Dialogue', theme === 'standard' && 'OSC Configuration', theme === 'minimal' && 'OSC'] }) }), _jsxs("div", { className: styles.cardBody, children: [_jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "oscHost", children: "Host Address:" }), _jsx("input", { type: "text", id: "oscHost", value: oscConfig.host, onChange: (e) => setOscConfig({ ...oscConfig, host: e.target.value }), placeholder: "127.0.0.1" })] }), _jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "oscPort", children: "Port:" }), _jsx("input", { type: "number", id: "oscPort", value: oscConfig.port, onChange: (e) => setOscConfig({ ...oscConfig, port: parseInt(e.target.value) }), placeholder: "8000" })] }), _jsxs("button", { className: styles.saveButton, onClick: handleSaveOscConfig, children: [_jsx("i", { className: "fas fa-save" }), theme === 'artsnob' && 'Commit to Memory', theme === 'standard' && 'Save Configuration', theme === 'minimal' && 'Save'] })] })] }), _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardHeader, children: _jsxs("h3", { children: [theme === 'artsnob' && 'MIDI Mappings: The Digital Correspondences', theme === 'standard' && 'MIDI Mappings', theme === 'minimal' && 'Mappings'] }) }), _jsxs("div", { className: styles.cardBody, children: [_jsxs("button", { className: styles.forgetAllButton, onClick: handleForgetAllMappings, children: [_jsx("i", { className: "fas fa-trash-alt" }), theme === 'artsnob' && 'Dissolve All Correspondences', theme === 'standard' && 'Remove All Mappings', theme === 'minimal' && 'Clear All'] }), _jsxs("p", { className: styles.mappingInstructions, children: [theme === 'artsnob' && 'To establish a digital correspondence, click "MIDI Learn" on any DMX channel and move a control on your MIDI device.', theme === 'standard' && 'Click "MIDI Learn" on any DMX channel and move a control on your MIDI device to create a mapping.', theme === 'minimal' && 'Use MIDI Learn on DMX channels to map controls.'] })] })] }), _jsxs("div", { className: `${styles.card} ${styles.fullWidth}`, children: [_jsxs("div", { className: styles.cardHeader, children: [_jsxs("h3", { children: [theme === 'artsnob' && 'Incoming Messages: The Whispers of Digital Muses', theme === 'standard' && 'MIDI Messages', theme === 'minimal' && 'Messages'] }), _jsxs("button", { className: styles.clearButton, onClick: handleClearMidiMessages, children: [_jsx("i", { className: "fas fa-eraser" }), theme !== 'minimal' && 'Clear'] })] }), _jsxs("div", { className: styles.cardBody, children: [_jsx(MidiVisualizer, {}), _jsx("div", { className: styles.midiMessages, children: midiMessages.length === 0 ? (_jsx("div", { className: styles.emptyMessages, children: _jsx("p", { children: "No MIDI messages received yet. Try pressing keys or moving controls on your MIDI device." }) })) : (midiMessages.slice(-50).map((msg, index) => (_jsxs("div", { className: styles.midiMessage, children: [_jsx("span", { className: styles.timestamp, children: new Date().toLocaleTimeString() }), _jsxs("span", { className: `${styles.messageType} ${styles[msg._type]} ${msg.source === 'browser' ? styles.browser : ''}`, children: [msg._type, " ", msg.source === 'browser' ? '(browser)' : ''] }), msg._type === 'noteon' || msg._type === 'noteoff' ? (_jsxs("span", { className: styles.messageContent, children: ["Ch: ", msg.channel, ", Note: ", msg.note, ", Vel: ", msg.velocity] })) : msg._type === 'cc' ? (_jsxs("span", { className: styles.messageContent, children: ["Ch: ", msg.channel, ", CC: ", msg.controller, ", Val: ", msg.value] })) : (_jsx("span", { className: styles.messageContent, children: JSON.stringify(msg) }))] }, index))).reverse()) })] })] })] })] }));
};
