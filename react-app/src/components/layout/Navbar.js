import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { NetworkStatus } from './NetworkStatus';
import { DmxChannelStats } from '../dmx/DmxChannelStats';
import styles from './Navbar.module.scss';
const navItems = [
    {
        id: 'main',
        icon: 'fa-lightbulb',
        title: {
            artsnob: 'Luminous Canvas',
            standard: 'Main Control',
            minimal: 'Main'
        }
    },
    {
        id: 'midiOsc',
        icon: 'fa-sliders-h',
        title: {
            artsnob: 'MIDI/OSC Atelier',
            standard: 'MIDI/OSC Setup',
            minimal: 'I/O'
        }
    },
    {
        id: 'fixture',
        icon: 'fa-object-group',
        title: {
            artsnob: 'Fixture Composition',
            standard: 'Fixture Setup',
            minimal: 'Fix'
        }
    },
    {
        id: 'scenes',
        icon: 'fa-theater-masks',
        title: {
            artsnob: 'Scene Gallery',
            standard: 'Scenes',
            minimal: 'Scn'
        }
    },
    {
        id: 'oscDebug',
        icon: 'fa-wave-square',
        title: {
            artsnob: 'OSC Critique',
            standard: 'OSC Debug',
            minimal: 'OSC'
        }
    },
    {
        id: 'misc',
        icon: 'fa-cog',
        title: {
            artsnob: 'Avant-Garde Settings',
            standard: 'Settings',
            minimal: 'Cfg'
        }
    }
];
export const Navbar = () => {
    const { theme } = useTheme();
    const [activeView, setActiveView] = useState('main');
    const handleViewChange = (view) => {
        setActiveView(view);
        window.dispatchEvent(new CustomEvent('changeView', {
            detail: { view }
        }));
    };
    return (_jsxs("nav", { className: styles.navbar, children: [_jsxs("div", { className: styles.navButtons, children: [navItems.map((item) => (_jsxs("button", { className: `${styles.navButton} ${activeView === item.id ? styles.active : ''}`, onClick: () => handleViewChange(item.id), title: item.title.standard, children: [_jsx("i", { className: `fas ${item.icon}` }), _jsx("span", { children: item.title[theme] })] }, item.id))), "      "] }), _jsxs("div", { className: styles.rightSideContainer, children: [_jsx("div", { className: styles.dmxStatsContainer, children: _jsx(DmxChannelStats, { compact: true }) }), _jsx("div", { className: styles.networkStatusContainer, children: _jsx(NetworkStatus, { compact: true }) })] })] }));
};
