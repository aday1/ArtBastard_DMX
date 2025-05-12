import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useStore } from '../../store';
import styles from './MidiVisualizer.module.scss';
export const MidiVisualizer = () => {
    const { socket } = useSocket();
    const [messages, setMessages] = useState([]);
    const [activeNotes, setActiveNotes] = useState({});
    const theme = useStore(state => state.theme);
    // Keep only last 100 messages
    const addMessage = useCallback((msg) => {
        setMessages(prev => [...prev.slice(-99), { ...msg, timestamp: Date.now() }]);
    }, []);
    useEffect(() => {
        if (!socket)
            return;
        const handleMidiMessage = (msg) => {
            // Update active notes for visualization
            if (msg._type === 'noteon' && typeof msg.note === 'number' && typeof msg.velocity === 'number') {
                const noteKey = `${msg.source || 'unknown'}-${msg.channel}-${msg.note}`;
                const noteValue = {
                    note: msg.note,
                    velocity: msg.velocity,
                    source: msg.source || 'unknown',
                    timestamp: Date.now()
                };
                setActiveNotes(prev => {
                    const newState = { ...prev };
                    newState[noteKey] = noteValue;
                    return newState;
                });
            }
            else if (msg._type === 'noteoff' && typeof msg.note === 'number') {
                setActiveNotes(prev => {
                    const newState = { ...prev };
                    delete newState[`${msg.source || 'unknown'}-${msg.channel}-${msg.note}`];
                    return newState;
                });
            }
            addMessage(msg);
        };
        socket.on('midiMessage', handleMidiMessage);
        return () => {
            socket.off('midiMessage', handleMidiMessage);
        };
    }, [socket, addMessage]);
    // Clean up stale notes (over 2 seconds old)
    useEffect(() => {
        const cleanup = setInterval(() => {
            const now = Date.now();
            setActiveNotes(prev => {
                const newState = { ...prev };
                Object.entries(newState).forEach(([key, note]) => {
                    // Use type assertion to tell TypeScript that note is an ActiveNote
                    const activeNote = note;
                    if (now - activeNote.timestamp > 2000) {
                        delete newState[key];
                    }
                });
                return newState;
            });
        }, 1000);
        return () => clearInterval(cleanup);
    }, []);
    return (_jsxs("div", { className: styles.visualizer, children: [_jsx("div", { className: styles.header, children: _jsxs("h3", { children: [theme === 'artsnob' && 'MIDI Signal Interpretation', theme === 'standard' && 'MIDI Activity', theme === 'minimal' && 'MIDI'] }) }), _jsx("div", { className: styles.activeNotes, children: Object.values(activeNotes).map((note) => {
                    // Use type assertion to help TypeScript understand the note type
                    const activeNote = note;
                    return (_jsx("div", { className: styles.activeNote, style: {
                            height: `${(activeNote.velocity / 127) * 100}%`,
                            opacity: Math.max(0.3, activeNote.velocity / 127)
                        }, children: _jsxs("span", { className: styles.noteLabel, children: [activeNote.note, " (", activeNote.source, ")"] }) }, `${activeNote.source}-${activeNote.note}`));
                }) }), _jsx("div", { className: styles.messageLog, children: messages.slice().reverse().map((msg, idx) => (_jsxs("div", { className: styles.message, children: [_jsx("span", { className: styles.timestamp, children: new Date(msg.timestamp || Date.now()).toLocaleTimeString() }), _jsx("span", { className: styles.source, children: msg.source || 'unknown' }), _jsx("span", { className: styles.type, children: msg._type }), _jsxs("span", { className: styles.details, children: ["ch:", msg.channel, msg.note !== undefined && ` note:${msg.note}`, msg.velocity !== undefined && ` vel:${msg.velocity}`, msg.controller !== undefined && ` cc:${msg.controller}`, msg.value !== undefined && ` val:${msg.value}`] })] }, `${msg.timestamp}-${idx}`))) })] }));
};
