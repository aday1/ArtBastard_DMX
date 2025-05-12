import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import styles from './NetworkStatus.module.scss';
export const NetworkStatus = ({ isModal = false, onClose, compact = false }) => {
    const { socket, connected } = useSocket();
    const { theme } = useTheme();
    const [health, setHealth] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                setHealth(data);
                setLastUpdate(new Date());
            }
            catch (error) {
                console.error('Failed to fetch health status:', error);
            }
        };
        // Initial fetch
        fetchHealth();
        // Poll every 10 seconds
        const interval = setInterval(fetchHealth, 10000);
        return () => clearInterval(interval);
    }, []);
    useEffect(() => {
        if (isModal) {
            setShowModal(true);
        }
    }, [isModal]);
    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };
    const formatMemory = (bytes) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    };
    const handleClose = () => {
        setShowModal(false);
        onClose?.();
    };
    const content = (_jsxs("div", { className: styles.networkStatus, children: [_jsxs("div", { className: styles.header, children: [_jsxs("h3", { children: [theme === 'artsnob' && 'Network Telemetry', theme === 'standard' && 'Network Status', theme === 'minimal' && 'Status'] }), lastUpdate && (_jsxs("span", { className: styles.lastUpdate, children: ["Updated: ", lastUpdate.toLocaleTimeString()] })), isModal && (_jsx("button", { className: styles.closeButton, onClick: handleClose, children: _jsx("i", { className: "fas fa-times" }) }))] }), _jsxs("div", { className: styles.statusGrid, children: [_jsxs("div", { className: `${styles.statusItem} ${styles[health?.status || 'unknown']}`, children: [_jsx("i", { className: "fas fa-server" }), _jsxs("div", { className: styles.statusInfo, children: [_jsx("span", { className: styles.label, children: "Server" }), _jsx("span", { className: styles.value, children: health?.serverStatus || 'Unknown' })] })] }), _jsxs("div", { className: `${styles.statusItem} ${styles[connected ? 'ok' : 'degraded']}`, children: [_jsx("i", { className: "fas fa-plug" }), _jsxs("div", { className: styles.statusInfo, children: [_jsx("span", { className: styles.label, children: "WebSocket" }), _jsx("span", { className: styles.value, children: connected ? `Connected (${health?.socketConnections || 0} clients)` : 'Disconnected' })] })] }), _jsxs("div", { className: `${styles.statusItem} ${styles[health?.midiDevicesConnected ? 'ok' : 'unknown']}`, children: [_jsx("i", { className: "fas fa-music" }), _jsxs("div", { className: styles.statusInfo, children: [_jsx("span", { className: styles.label, children: "MIDI Devices" }), _jsxs("span", { className: styles.value, children: [health?.midiDevicesConnected || 0, " connected"] })] })] }), _jsxs("div", { className: `${styles.statusItem} ${styles[health?.artnetStatus === 'initialized' ? 'ok' : 'degraded']}`, children: [_jsx("i", { className: "fas fa-network-wired" }), _jsxs("div", { className: styles.statusInfo, children: [_jsx("span", { className: styles.label, children: "ArtNet" }), _jsx("span", { className: styles.value, children: health?.artnetStatus || 'Unknown' })] })] }), _jsxs("div", { className: styles.statsSection, children: [_jsxs("div", { className: styles.stat, children: [_jsx("span", { className: styles.label, children: "Uptime" }), _jsx("span", { className: styles.value, children: health ? formatUptime(health.uptime) : 'Unknown' })] }), _jsxs("div", { className: styles.stat, children: [_jsx("span", { className: styles.label, children: "Memory" }), _jsx("span", { className: styles.value, children: health?.memoryUsage ? formatMemory(health.memoryUsage.heapUsed) : 'Unknown' })] })] })] })] }));
    if (compact) {
        // Calculate uptime in a readable format
        const formatUptime = (seconds) => {
            if (!seconds)
                return 'Unknown';
            const days = Math.floor(seconds / (24 * 3600));
            const hours = Math.floor((seconds % (24 * 3600)) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            let result = '';
            if (days > 0)
                result += `${days}d `;
            if (hours > 0 || days > 0)
                result += `${hours}h `;
            result += `${minutes}m`;
            return result;
        };
        return (_jsxs("div", { className: styles.compactView, children: [_jsxs("span", { className: `${styles.compactItem} ${styles.statusIndicator}`, title: `Server Status: ${health?.serverStatus || 'Unknown'}\nUptime: ${formatUptime(health?.uptime)}\nLast Update: ${lastUpdate?.toLocaleTimeString() || 'Unknown'}`, children: [_jsx("i", { className: `fas fa-server ${health?.serverStatus === 'ok' ? styles.statusOk : styles.statusDegraded}` }), health?.serverStatus === 'ok' ? 'Online' : 'Degraded'] }), _jsxs("span", { className: `${styles.compactItem} ${styles.connectionIndicator}`, title: `Socket Status: ${connected ? 'Connected' : 'Disconnected'}\nConnections: ${health?.socketConnections || 0}`, children: [_jsx("i", { className: `fas fa-plug ${connected ? styles.statusOk : styles.statusDegraded}` }), connected ? 'Connected' : 'Disconnected'] }), _jsxs("span", { className: `${styles.compactItem} ${styles.midiIndicator}`, title: `MIDI Devices Connected: ${health?.midiDevicesConnected || 0}`, children: [_jsx("i", { className: "fas fa-music" }), " ", health?.midiDevicesConnected || 0, " MIDI"] }), _jsxs("span", { className: `${styles.compactItem} ${styles.artnetIndicator}`, title: `ArtNet Status: ${health?.artnetStatus || 'Unknown'}`, children: [_jsx("i", { className: "fas fa-network-wired" }), " ", health?.artnetStatus || 'Unknown'] })] }));
    }
    if (isModal) {
        return showModal ? (_jsx("div", { className: styles.modalOverlay, children: _jsx("div", { className: styles.modalContent, children: content }) })) : null;
    }
    return content;
};
