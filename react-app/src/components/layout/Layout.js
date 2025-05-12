import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useStore } from '../../store';
import { useTheme } from '../../context/ThemeContext';
import { StatusBar } from './StatusBar';
import { Navbar } from './Navbar';
import { StatusMessage } from './StatusMessage';
import FancyQuotes from './FancyQuotes';
import styles from './Layout.module.scss';
export const Layout = ({ children }) => {
    const { theme, darkMode, toggleDarkMode } = useTheme();
    const statusMessage = useStore((state) => state.statusMessage);
    return (_jsxs("div", { className: `${styles.layout} ${styles[theme]} ${darkMode ? styles.dark : styles.light}`, children: [_jsx(Navbar, {}), _jsxs("div", { className: styles.contentWrapper, children: [_jsx("div", { className: styles.themeToggle, onClick: toggleDarkMode, title: "Toggle Light/Dark Mode", children: _jsx("i", { className: `fas ${darkMode ? 'fa-moon' : 'fa-sun'}` }) }), _jsxs("div", { className: styles.mainContent, children: [_jsxs("h1", { className: styles.title, children: ["ArtBastard DMX512FTW:", theme === 'artsnob' && _jsx("span", { children: "The Luminary Palette" }), theme === 'standard' && _jsx("span", { children: "DMX Controller" }), theme === 'minimal' && _jsx("span", { children: "DMX" })] }), theme === 'artsnob' && (_jsx(FancyQuotes, { intervalSeconds: 30, animate: true })), statusMessage && (_jsx(StatusMessage, { message: statusMessage.text, type: statusMessage.type })), _jsx("main", { className: styles.contentArea, children: children })] })] }), _jsx(StatusBar, {})] }));
};
