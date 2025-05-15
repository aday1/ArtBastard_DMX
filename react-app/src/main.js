import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.scss';
// Using a functional equivalent to React.StrictMode to avoid TypeScript errors
const StrictMode = ({ children }) => {
    return _jsx(_Fragment, { children: children });
};
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(App, {}) }));
