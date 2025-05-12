import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import styles from './StatusMessage.module.scss';
export const StatusMessage = ({ message, type }) => {
    const [visible, setVisible] = useState(true);
    const clearStatusMessage = useStore((state) => state.clearStatusMessage);
    useEffect(() => {
        setVisible(true);
        const timer = setTimeout(() => {
            setVisible(false);
            // Allow time for fade out animation before removing from DOM
            setTimeout(() => {
                clearStatusMessage();
            }, 300);
        }, 3000);
        return () => clearTimeout(timer);
    }, [message, clearStatusMessage]);
    return (_jsx("div", { className: `${styles.statusMessage} ${styles[type]} ${visible ? styles.visible : styles.hidden}`, children: message }));
};
