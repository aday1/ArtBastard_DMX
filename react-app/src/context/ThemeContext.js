import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect } from 'react';
import { useStore } from '../store';
const ThemeContext = createContext({
    theme: 'artsnob',
    darkMode: true,
    setTheme: () => { },
    toggleDarkMode: () => { }
});
export const useTheme = () => useContext(ThemeContext);
export const ThemeProvider = ({ children }) => {
    const { theme, darkMode, setTheme, toggleDarkMode } = useStore(state => ({
        theme: state.theme,
        darkMode: state.darkMode,
        setTheme: state.setTheme,
        toggleDarkMode: state.toggleDarkMode
    }));
    useEffect(() => {
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('theme');
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedTheme) {
            setTheme(savedTheme);
        }
        if (savedDarkMode !== null) {
            if (savedDarkMode === 'true' !== darkMode) {
                toggleDarkMode();
            }
        }
        else {
            // Default to dark mode if not specified
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        // Add theme class to body
        document.body.className = theme;
    }, []);
    useEffect(() => {
        // Update body class when theme changes
        document.body.className = theme;
    }, [theme]);
    return (_jsx(ThemeContext.Provider, { value: { theme, darkMode, setTheme, toggleDarkMode }, children: children }));
};
