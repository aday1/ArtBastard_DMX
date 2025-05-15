import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { useStore } from '../store';
import { DmxControlPanel } from '../components/dmx/DmxControlPanel';
import { MidiOscSetup } from '../components/midi/MidiOscSetup';
import { OscDebug } from '../components/osc/OscDebug';
import { SceneGallery } from '../components/scenes/SceneGallery';
import { FixtureSetup } from '../components/fixtures/FixtureSetup';
import { DigitalIlluminationAtelier } from '../components/visualizers/DigitalIlluminationAtelier';
import { Settings } from '../components/settings/Settings';
import styles from './MainPage.module.scss';
const MainPage = () => {
    const { theme } = useTheme();
    const socketContext = useSocket();
    const connected = socketContext.connected;
    const showStatusMessage = useStore(state => state.showStatusMessage);
    const [currentView, setCurrentView] = useState('main');
    // Handle view changes from navbar
    useEffect(() => {
        const handleViewChange = (event) => {
            const customEvent = event;
            setCurrentView(customEvent.detail.view);
        };
        window.addEventListener('changeView', handleViewChange);
        return () => window.removeEventListener('changeView', handleViewChange);
    }, []);
    // Handle connection state changes
    useEffect(() => {
        if (!connected) {
            showStatusMessage('Lost connection to server - some features may be limited', 'error');
        }
    }, [connected, showStatusMessage]);
    const renderContent = () => {
        return (_jsxs("div", { className: styles.content, children: [!connected && (_jsxs("div", { className: styles.connectionWarning, children: [_jsx("i", { className: "fas fa-exclamation-triangle" }), "Connection lost - attempting to reconnect..."] })), _jsxs("div", { className: styles.viewContainer, children: [currentView === 'main' && (_jsxs(_Fragment, { children: [_jsx(DigitalIlluminationAtelier, {}), _jsx(DmxControlPanel, {})] })), currentView === 'midiOsc' && _jsx(MidiOscSetup, {}), currentView === 'fixture' && _jsx(FixtureSetup, {}), currentView === 'scenes' && _jsx(SceneGallery, {}), currentView === 'oscDebug' && _jsx(OscDebug, {}), currentView === 'misc' && _jsx(Settings, {})] })] }));
    };
    return renderContent();
};
export default MainPage;
