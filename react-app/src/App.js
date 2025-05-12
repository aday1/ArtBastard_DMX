import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { useStore } from './store';
import MainPage from './pages/MainPage';
function App() {
    const fetchInitialState = useStore((state) => state.fetchInitialState);
    useEffect(() => {
        // Initialize global store reference
        if (typeof window !== 'undefined' && !window.useStore) {
            window.useStore = useStore;
            console.log('Global store reference initialized in App component');
        }
        // Fetch initial state
        fetchInitialState();
    }, [fetchInitialState]);
    return (_jsx(ThemeProvider, { children: _jsx(SocketProvider, { children: _jsx(Layout, { children: _jsx(MainPage, {}) }) }) }));
}
export default App;
