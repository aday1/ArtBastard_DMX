import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import useStoreUtils from '../../store/storeUtils';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import styles from './Settings.module.scss';
export const Settings = () => {
    const { theme, setTheme, darkMode, toggleDarkMode } = useTheme();
    const { socket, connected } = useSocket();
    const { artNetConfig } = useStore(state => ({
        artNetConfig: state.artNetConfig
    }));
    const [artNetSettings, setArtNetSettings] = useState({ ...artNetConfig });
    const [exportInProgress, setExportInProgress] = useState(false);
    const [importInProgress, setImportInProgress] = useState(false);
    // Update ArtNet configuration
    const updateArtNetConfig = () => {
        try {
            useStoreUtils.getState().updateArtNetConfig(artNetSettings);
            useStoreUtils.getState().showStatusMessage('ArtNet configuration updated - testing connection...', 'info');
            // Test connection after update
            if (socket && connected) {
                socket.emit('testArtNetConnection', artNetSettings.ip);
            }
        }
        catch (error) {
            useStoreUtils.getState().showStatusMessage(`Failed to update ArtNet config: ${error}`, 'error');
        }
    };
    // Handle ArtNet settings change
    const handleArtNetChange = (key, value) => {
        setArtNetSettings(prev => ({ ...prev, [key]: value }));
    };
    // Export all settings
    const exportSettings = () => {
        setExportInProgress(true);
        if (socket && connected) {
            // Type assertion for socket.emit
            socket.emit('exportSettings')(socket).once('settingsExported', (filePath) => {
                useStoreUtils.getState().showStatusMessage(`Settings exported to ${filePath}`, 'success');
                setExportInProgress(false);
            })(socket).once('exportError', (error) => {
                useStoreUtils.getState().showStatusMessage(`Export error: ${error}`, 'error');
                setExportInProgress(false);
            });
        }
        else {
            useStoreUtils.getState().showStatusMessage('Cannot export settings: not connected to server', 'error');
            setExportInProgress(false);
        }
    };
    // Import settings
    const importSettings = () => {
        if (!window.confirm('Importing settings will overwrite your current configuration. Continue?')) {
            return;
        }
        setImportInProgress(true);
        if (socket && connected) {
            // Type assertion for socket.emit
            socket.emit('importSettings')(socket).once('settingsImported', (data) => {
                // Update store with imported data
                useStoreUtils.setState({
                    artNetConfig: data.artNetConfig || artNetConfig,
                    midiMappings: data.midiMappings || {},
                    scenes: data.scenes || []
                });
                setArtNetSettings(data.artNetConfig || artNetConfig);
                useStoreUtils.getState().showStatusMessage('Settings imported successfully', 'success');
                setImportInProgress(false);
            })(socket).once('importError', (error) => {
                useStoreUtils.getState().showStatusMessage(`Import error: ${error}`, 'error');
                setImportInProgress(false);
            });
        }
        else {
            useStoreUtils.getState().showStatusMessage('Cannot import settings: not connected to server', 'error');
            setImportInProgress(false);
        }
    };
    // Test ArtNet connection
    const testArtNetConnection = () => {
        if (socket && connected) {
            // Type assertion for socket.emit
            socket.emit('testArtNetConnection', artNetSettings.ip);
            useStore.getState().showStatusMessage('Testing ArtNet connection...', 'info');
        }
        else {
            useStore.getState().showStatusMessage('Cannot test connection: not connected to server', 'error');
        }
    };
    // Handle ArtNet status changes
    useEffect(() => {
        if (!socket)
            return;
        const handleArtNetStatus = (status) => {
            switch (status.status) {
                case 'alive':
                    useStore.getState().showStatusMessage('ArtNet device is responding', 'success');
                    break;
                case 'unreachable':
                    useStore.getState().showStatusMessage(status.message || 'ArtNet device is not responding', 'error');
                    break;
                case 'timeout':
                    useStore.getState().showStatusMessage('Connection attempt timed out - check IP and network', 'error');
                    break;
                case 'error':
                    useStore.getState().showStatusMessage(`ArtNet error: ${status.message || 'Unknown error'}`, 'error');
                    break;
            }
        };
        // Type assertion for socket.on and socket.off
        socket.on('artnetStatus', handleArtNetStatus);
        return () => {
            socket.off('artnetStatus', handleArtNetStatus);
        };
    }, [socket]);
    return (_jsxs("div", { className: styles.settings, children: [_jsxs("h2", { className: styles.sectionTitle, children: [theme === 'artsnob' && 'Avant-Garde Settings: The Technical Underpinnings', theme === 'standard' && 'Settings', theme === 'minimal' && 'Settings'] }), _jsxs("div", { className: styles.settingsGrid, children: [_jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardHeader, children: _jsxs("h3", { children: [theme === 'artsnob' && 'ArtNet Configuration: The Network of Light', theme === 'standard' && 'ArtNet Configuration', theme === 'minimal' && 'ArtNet'] }) }), _jsxs("div", { className: styles.cardBody, children: [_jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "artnetIp", children: "IP Address:" }), _jsx("input", { type: "text", id: "artnetIp", value: artNetSettings.ip, onChange: (e) => handleArtNetChange('ip', e.target.value), placeholder: "192.168.1.199" })] }), _jsxs("div", { className: styles.formRow, children: [_jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "artnetSubnet", children: "Subnet:" }), _jsx("input", { type: "number", id: "artnetSubnet", value: artNetSettings.subnet, onChange: (e) => handleArtNetChange('subnet', parseInt(e.target.value)), min: "0", max: "15" })] }), _jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "artnetUniverse", children: "Universe:" }), _jsx("input", { type: "number", id: "artnetUniverse", value: artNetSettings.universe, onChange: (e) => handleArtNetChange('universe', parseInt(e.target.value)), min: "0", max: "15" })] }), _jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "artnetNet", children: "Net:" }), _jsx("input", { type: "number", id: "artnetNet", value: artNetSettings.net, onChange: (e) => handleArtNetChange('net', parseInt(e.target.value)), min: "0", max: "127" })] })] }), _jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "artnetPort", children: "Port:" }), _jsx("input", { type: "number", id: "artnetPort", value: artNetSettings.port, onChange: (e) => handleArtNetChange('port', parseInt(e.target.value)), min: "1024", max: "65535" })] }), _jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "artnetRefresh", children: "Refresh Interval (ms):" }), _jsx("input", { type: "number", id: "artnetRefresh", value: artNetSettings.base_refresh_interval, onChange: (e) => handleArtNetChange('base_refresh_interval', parseInt(e.target.value)), min: "33", max: "5000" })] }), _jsxs("div", { className: styles.buttonGroup, children: [_jsxs("button", { className: styles.primaryButton, onClick: updateArtNetConfig, children: [_jsx("i", { className: "fas fa-save" }), theme === 'artsnob' && 'Commit Configuration', theme === 'standard' && 'Save Configuration', theme === 'minimal' && 'Save'] }), _jsxs("button", { className: styles.secondaryButton, onClick: testArtNetConnection, children: [_jsx("i", { className: "fas fa-network-wired" }), theme === 'artsnob' && 'Test Connection', theme === 'standard' && 'Test Connection', theme === 'minimal' && 'Test'] })] })] })] }), _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardHeader, children: _jsxs("h3", { children: [theme === 'artsnob' && 'Interface Aesthetic: Visual Vocabulary', theme === 'standard' && 'Interface Theme', theme === 'minimal' && 'Theme'] }) }), _jsxs("div", { className: styles.cardBody, children: [_jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "themeSelect", children: "Theme:" }), _jsxs("div", { className: styles.themeOptions, children: [_jsxs("div", { className: `${styles.themeOption} ${theme === 'artsnob' ? styles.active : ''}`, onClick: () => setTheme('artsnob'), children: [_jsxs("div", { className: styles.themePreview, "data-theme": "artsnob", children: [_jsx("div", { className: styles.themePreviewHeader }), _jsxs("div", { className: styles.themePreviewBody, children: [_jsx("div", { className: styles.themePreviewLine }), _jsx("div", { className: styles.themePreviewLine })] })] }), _jsx("span", { className: styles.themeName, children: "Art Critic" })] }), _jsxs("div", { className: `${styles.themeOption} ${theme === 'standard' ? styles.active : ''}`, onClick: () => setTheme('standard'), children: [_jsxs("div", { className: styles.themePreview, "data-theme": "standard", children: [_jsx("div", { className: styles.themePreviewHeader }), _jsxs("div", { className: styles.themePreviewBody, children: [_jsx("div", { className: styles.themePreviewLine }), _jsx("div", { className: styles.themePreviewLine })] })] }), _jsx("span", { className: styles.themeName, children: "Standard" })] }), _jsxs("div", { className: `${styles.themeOption} ${theme === 'minimal' ? styles.active : ''}`, onClick: () => setTheme('minimal'), children: [_jsxs("div", { className: styles.themePreview, "data-theme": "minimal", children: [_jsx("div", { className: styles.themePreviewHeader }), _jsxs("div", { className: styles.themePreviewBody, children: [_jsx("div", { className: styles.themePreviewLine }), _jsx("div", { className: styles.themePreviewLine })] })] }), _jsx("span", { className: styles.themeName, children: "Minimal" })] })] })] }), _jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "colorModeToggle", children: "Color Mode:" }), _jsxs("div", { className: styles.toggleSwitch, children: [_jsx("input", { type: "checkbox", id: "colorModeToggle", checked: darkMode, onChange: toggleDarkMode }), _jsxs("label", { htmlFor: "colorModeToggle", className: styles.toggleLabel, children: [_jsx("span", { className: styles.toggleDot, children: _jsx("i", { className: `fas ${darkMode ? 'fa-moon' : 'fa-sun'}` }) }), _jsx("span", { className: styles.toggleText, children: darkMode ? 'Dark Mode' : 'Light Mode' })] })] })] }), _jsxs("div", { className: styles.themeDescription, children: [theme === 'artsnob' && (_jsx("p", { children: "The \"Art Critic\" theme adopts the verbose, pretentious language and aesthetic of a French art critic, with elaborate descriptions and artistic flourishes." })), theme === 'standard' && (_jsx("p", { children: "The \"Standard\" theme provides a professional, direct interface for DMX control with technical terminology and a functional industrial appearance." })), theme === 'minimal' && (_jsx("p", { children: "The \"Minimal\" theme reduces all text to the essential minimum, focusing solely on core functionality with a clean, uncluttered design." }))] })] })] }), _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardHeader, children: _jsxs("h3", { children: [theme === 'artsnob' && 'Configuration Management: Preserving Brilliance', theme === 'standard' && 'Configuration Management', theme === 'minimal' && 'Config'] }) }), _jsxs("div", { className: styles.cardBody, children: [_jsxs("div", { className: styles.configActions, children: [_jsxs("button", { className: styles.primaryButton, onClick: exportSettings, disabled: exportInProgress || !connected, children: [exportInProgress ? (_jsx("i", { className: "fas fa-spinner fa-spin" })) : (_jsx("i", { className: "fas fa-download" })), theme === 'artsnob' && 'Archive All Settings', theme === 'standard' && 'Export Settings', theme === 'minimal' && 'Export'] }), _jsxs("button", { className: styles.secondaryButton, onClick: importSettings, disabled: importInProgress || !connected, children: [importInProgress ? (_jsx("i", { className: "fas fa-spinner fa-spin" })) : (_jsx("i", { className: "fas fa-upload" })), theme === 'artsnob' && 'Resurrect Settings', theme === 'standard' && 'Import Settings', theme === 'minimal' && 'Import'] }), _jsxs("button", { className: styles.dangerButton, onClick: () => {
                                                    if (window.confirm('This will reset all settings to default values. Are you sure?')) {
                                                        // Reset everything to defaults
                                                        useStore.setState({
                                                            dmxChannels: new Array(512).fill(0),
                                                            midiMappings: {},
                                                            fixtures: [],
                                                            groups: [],
                                                            scenes: [],
                                                            artNetConfig: {
                                                                ip: "192.168.1.199",
                                                                subnet: 0,
                                                                universe: 0,
                                                                net: 0,
                                                                port: 6454,
                                                                base_refresh_interval: 1000
                                                            }
                                                        });
                                                        setArtNetSettings({
                                                            ip: "192.168.1.199",
                                                            subnet: 0,
                                                            universe: 0,
                                                            net: 0,
                                                            port: 6454,
                                                            base_refresh_interval: 1000
                                                        });
                                                        useStore.getState().showStatusMessage('All settings reset to defaults', 'success');
                                                    }
                                                }, children: [_jsx("i", { className: "fas fa-bomb" }), theme === 'artsnob' && 'Obliterate All Settings', theme === 'standard' && 'Reset to Default', theme === 'minimal' && 'Reset'] })] }), _jsxs("div", { className: styles.configNote, children: [_jsx("i", { className: "fas fa-info-circle" }), _jsx("p", { children: theme === 'artsnob'
                                                    ? 'The archive preserves your artistic configurations for future resurrections.'
                                                    : 'Export saves all your configurations to a file for backup or transfer.' })] })] })] }), _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardHeader, children: _jsxs("h3", { children: [theme === 'artsnob' && 'Performance Calibration: The Artistry of Efficiency', theme === 'standard' && 'Performance Settings', theme === 'minimal' && 'Performance'] }) }), _jsxs("div", { className: styles.cardBody, children: [_jsxs("div", { className: styles.formGroup, children: [_jsx("label", { children: "Graphics Quality:" }), _jsxs("div", { className: styles.radioGroup, children: [_jsxs("label", { className: styles.radioLabel, children: [_jsx("input", { type: "radio", name: "graphicsQuality", value: "high", defaultChecked: true }), _jsx("span", { children: theme === 'artsnob' ? 'Sublime Fidelity' : 'High' })] }), _jsxs("label", { className: styles.radioLabel, children: [_jsx("input", { type: "radio", name: "graphicsQuality", value: "medium" }), _jsx("span", { children: theme === 'artsnob' ? 'Balanced Expression' : 'Medium' })] }), _jsxs("label", { className: styles.radioLabel, children: [_jsx("input", { type: "radio", name: "graphicsQuality", value: "low" }), _jsx("span", { children: theme === 'artsnob' ? 'Essential Form' : 'Low' })] })] })] }), _jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "enableWebGL", children: "WebGL Visualizations:" }), _jsxs("div", { className: styles.toggleSwitch, children: [_jsx("input", { type: "checkbox", id: "enableWebGL", defaultChecked: true }), _jsxs("label", { htmlFor: "enableWebGL", className: styles.toggleLabel, children: [_jsx("span", { className: styles.toggleDot }), _jsx("span", { className: styles.toggleText, children: theme === 'artsnob' ? 'Computational Canvas Enabled' : 'Enabled' })] })] })] }), _jsxs("div", { className: styles.formGroup, children: [_jsx("label", { htmlFor: "enable3D", children: "3D Fixture Visualization:" }), _jsxs("div", { className: styles.toggleSwitch, children: [_jsx("input", { type: "checkbox", id: "enable3D", defaultChecked: true }), _jsxs("label", { htmlFor: "enable3D", className: styles.toggleLabel, children: [_jsx("span", { className: styles.toggleDot }), _jsx("span", { className: styles.toggleText, children: theme === 'artsnob' ? 'Spatial Rendering Enabled' : 'Enabled' })] })] })] }), _jsxs("div", { className: styles.performanceNote, children: [_jsx("i", { className: "fas fa-lightbulb" }), _jsx("p", { children: theme === 'artsnob'
                                                    ? 'Adjusting these parameters allows for the optimization of the computational aesthetic experience.'
                                                    : 'Lower settings improve performance on less powerful devices.' })] })] })] })] }), _jsxs("div", { className: styles.aboutSection, children: [_jsxs("h3", { children: [theme === 'artsnob' && 'About This Digital Atelier', theme === 'standard' && 'About ArtBastard DMX512FTW', theme === 'minimal' && 'About'] }), _jsx("p", { className: styles.versionInfo, children: "Version 2.0.0 - React Edition with WebGL" }), _jsx("p", { className: styles.aboutText, children: theme === 'artsnob'
                            ? 'ArtBastard DMX512FTW represents the convergence of technological prowess and artistic vision, manifesting as a sublime digital interface for the orchestration of luminescent expressions.'
                            : 'ArtBastard DMX512FTW is an advanced DMX lighting controller with MIDI integration, WebGL visualization, and 3D fixture placement.' }), _jsx("p", { className: styles.copyright, children: "\u00A9 2025 ArtBastard Studio" })] })] }));
};
