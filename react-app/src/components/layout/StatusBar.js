import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { NetworkStatus } from './NetworkStatus';
import styles from './StatusBar.module.scss';
export const StatusBar = () => {
    const artNetStatus = useStore((state) => state.artNetStatus);
    const { connected } = useSocket();
    const { theme } = useTheme();
    const [showNetworkModal, setShowNetworkModal] = useState(false);
    // Local state for MIDI activity indicators
    const [midiInActive, setMidiInActive] = useState(false);
    const [midiOutActive, setMidiOutActive] = useState(false);
    const [oscInActive, setOscInActive] = useState(false);
    const [oscOutActive, setOscOutActive] = useState(false);
    // Monitor MIDI messages to show activity
    const midiMessages = useStore((state) => state.midiMessages);
    useEffect(() => {
        if (midiMessages.length > 0) {
            const lastMessage = midiMessages[midiMessages.length - 1];
            // Flash the MIDI in indicator
            setMidiInActive(true);
            setTimeout(() => setMidiInActive(false), 300);
        }
    }, [midiMessages]);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: styles.statusBar, children: [_jsx("div", { className: styles.left, children: _jsxs("button", { onClick: () => setShowNetworkModal(true), className: styles.networkButton, title: "Show Network Status", children: [_jsx("i", { className: "fas fa-network-wired" }), theme !== 'minimal' && _jsx("span", { children: "Network Status" })] }) }), _jsx("div", { className: styles.right, children: _jsxs("div", { className: `${styles.connectionStatus} ${connected ? styles.connected : styles.disconnected}`, children: [_jsx("i", { className: `fas fa-${connected ? 'plug' : 'plug-circle-xmark'}` }), _jsx("span", { children: connected ? 'Connected' : 'Disconnected' })] }) })] }), showNetworkModal && (_jsx(NetworkStatus, { isModal: true, onClose: () => setShowNetworkModal(false) }))] }));
};
