import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import styles from './MidiMonitor.module.scss';
export const MidiMonitor = () => {
    const midiMessages = useStore(state => state.midiMessages);
    const [lastMessages, setLastMessages] = useState([]);
    const [visible, setVisible] = useState(true);
    const [flashActive, setFlashActive] = useState(false);
    // Update the displayed messages when new MIDI messages arrive
    useEffect(() => {
        if (midiMessages.length > 0) {
            // Get the last 5 messages (or fewer if less are available)
            const recentMessages = midiMessages.slice(-5);
            setLastMessages(recentMessages);
            // Flash the monitor to indicate new activity
            setFlashActive(true);
            const timer = setTimeout(() => setFlashActive(false), 200);
            return () => clearTimeout(timer);
        }
    }, [midiMessages]);
    // No messages to display
    if (lastMessages.length === 0) {
        return (_jsxs("div", { className: `${styles.midiMonitor} ${visible ? '' : styles.collapsed}`, children: [_jsxs("div", { className: styles.header, onClick: () => setVisible(!visible), children: [_jsx("span", { className: styles.title, children: "MIDI Monitor" }), _jsx("span", { className: styles.toggle, children: visible ? '▼' : '◀' })] }), visible && (_jsxs("div", { className: styles.content, children: [_jsx("p", { className: styles.noData, children: "No MIDI messages received yet." }), _jsx("p", { className: styles.noData, children: "Try moving controls on your MIDI device." })] }))] }));
    }
    return (_jsxs("div", { className: `${styles.midiMonitor} ${flashActive ? styles.flash : ''} ${visible ? '' : styles.collapsed}`, children: [_jsxs("div", { className: styles.header, onClick: () => setVisible(!visible), children: [_jsx("span", { className: styles.title, children: "MIDI Monitor" }), _jsxs("span", { className: styles.status, children: ["Recent: ", midiMessages.length] }), _jsx("span", { className: styles.toggle, children: visible ? '▼' : '◀' })] }), visible && (_jsx("div", { className: styles.content, children: lastMessages.map((msg, index) => (_jsxs("div", { className: styles.messageRow, children: [msg._type === 'cc' && (_jsxs(_Fragment, { children: [_jsx("span", { className: styles.type, children: "CC" }), _jsxs("span", { className: styles.channel, children: ["Ch ", msg.channel + 1] }), _jsxs("span", { className: styles.controller, children: ["CC ", msg.controller] }), _jsx("span", { className: styles.value, children: msg.value }), _jsx("span", { className: styles.source, children: msg.source })] })), msg._type === 'noteon' && (_jsxs(_Fragment, { children: [_jsx("span", { className: styles.type, children: "Note" }), _jsxs("span", { className: styles.channel, children: ["Ch ", msg.channel + 1] }), _jsxs("span", { className: styles.note, children: ["Note ", msg.note] }), _jsxs("span", { className: styles.velocity, children: ["Vel ", msg.velocity] }), _jsx("span", { className: styles.source, children: msg.source })] })), msg._type !== 'cc' && msg._type !== 'noteon' && (_jsxs("span", { children: ["Other: ", JSON.stringify(msg)] }))] }, index))) }))] }));
};
export default MidiMonitor;
