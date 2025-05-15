import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { OscWebGLVisualizer } from './OscWebGLVisualizer';
import styles from './OscDebug.module.scss';
export const OscDebug = () => {
    const { theme } = useTheme();
    const { socket, connected } = useSocket();
    const [messages, setMessages] = useState([]);
    const [messageTypes, setMessageTypes] = useState({
        incoming: true,
        outgoing: true
    });
    const [maxMessages, setMaxMessages] = useState(100);
    const [paused, setPaused] = useState(false);
    useEffect(() => {
        if (!socket || !connected)
            return;
        const handleOscMessage = (msg) => {
            if (paused)
                return;
            setMessages(prev => {
                const newMessages = [...prev, { ...msg, timestamp: Date.now() }];
                return newMessages.slice(-maxMessages);
            });
        };
        socket.on('oscMessage', handleOscMessage);
        socket.on('oscOutgoing', (msg) => handleOscMessage({ ...msg, direction: 'out' }));
        return () => {
            socket.off('oscMessage', handleOscMessage);
            socket.off('oscOutgoing');
        };
    }, [socket, connected, maxMessages, paused]);
    const formatTimestamp = (timestamp) => {
        // Format without fractional seconds since it's not supported in toLocaleTimeString
        const timeStr = new Date(timestamp).toLocaleTimeString(undefined, {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        // Add milliseconds manually
        const ms = String(timestamp % 1000).padStart(3, '0');
        return `${timeStr}.${ms}`;
    };
    const filterMessage = (msg) => {
        if (msg.direction === 'out' && !messageTypes.outgoing)
            return false;
        if (msg.direction === 'in' && !messageTypes.incoming)
            return false;
        return true;
    };
    const clearMessages = () => {
        setMessages([]);
    };
    return (_jsxs("div", { className: styles.oscDebug, children: [_jsxs("h2", { className: styles.sectionTitle, children: [theme === 'artsnob' && 'OSC Message Observatory', theme === 'standard' && 'OSC Debug Console', theme === 'minimal' && 'OSC Debug'] }), _jsx(OscWebGLVisualizer, {}), _jsxs("div", { className: styles.controls, children: [_jsxs("div", { className: styles.messageTypes, children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: messageTypes.incoming, onChange: () => setMessageTypes(prev => ({
                                            ...prev,
                                            incoming: !prev.incoming
                                        })) }), "Incoming"] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: messageTypes.outgoing, onChange: () => setMessageTypes(prev => ({
                                            ...prev,
                                            outgoing: !prev.outgoing
                                        })) }), "Outgoing"] })] }), _jsxs("div", { className: styles.messageControls, children: [_jsxs("button", { className: styles.clearButton, onClick: clearMessages, children: [_jsx("i", { className: "fas fa-eraser" }), "Clear"] }), _jsxs("button", { className: `${styles.pauseButton} ${paused ? styles.paused : ''}`, onClick: () => setPaused(!paused), children: [_jsx("i", { className: `fas fa-${paused ? 'play' : 'pause'}` }), paused ? 'Resume' : 'Pause'] }), _jsxs("div", { className: styles.maxMessages, children: [_jsx("label", { children: "Max Messages:" }), _jsx("input", { type: "number", value: maxMessages, onChange: (e) => setMaxMessages(Math.max(1, parseInt(e.target.value) || 100)), min: "1" })] })] })] }), _jsx("div", { className: styles.messageList, children: messages.filter(filterMessage).map((msg, index) => (_jsxs("div", { className: `${styles.oscMessage} ${msg.direction === 'out' ? styles.outgoing : styles.incoming}`, children: [_jsxs("div", { className: styles.messageHeader, children: [_jsx("span", { className: styles.direction, children: msg.direction === 'out' ? 'OUT' : 'IN' }), _jsx("span", { className: styles.timestamp, children: formatTimestamp(msg.timestamp) })] }), _jsxs("div", { className: styles.messageContent, children: [_jsx("div", { className: styles.address, children: msg.address }), _jsx("div", { className: styles.args, children: msg.args.map((arg, i) => (_jsxs("div", { className: styles.arg, children: [_jsxs("span", { className: styles.argType, children: [arg.type, ":"] }), _jsx("span", { className: styles.argValue, children: JSON.stringify(arg.value) })] }, i))) })] })] }, index))) })] }));
};
