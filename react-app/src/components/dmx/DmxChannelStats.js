import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useStore } from '../../store';
import styles from './DmxChannelStats.module.scss';
export const DmxChannelStats = ({ compact = false }) => {
    const dmxChannels = useStore(state => state.dmxChannels);
    const selectedChannels = useStore(state => state.selectedChannels);
    const stats = useMemo(() => {
        let activeCount = 0;
        let maxValue = 0;
        let avgValue = 0;
        let sum = 0;
        // Ensure dmxChannels is an array before iterating
        if (Array.isArray(dmxChannels)) {
            for (let i = 0; i < dmxChannels.length; i++) {
                const value = dmxChannels[i];
                if (value > 0) {
                    activeCount++;
                    sum += value;
                    maxValue = Math.max(maxValue, value);
                }
            }
        }
        avgValue = activeCount > 0 ? Math.round(sum / activeCount) : 0;
        const totalChannels = Array.isArray(dmxChannels) ? dmxChannels.length : 0;
        return {
            activeCount,
            maxValue,
            avgValue,
            totalChannels,
            selectedCount: selectedChannels?.length || 0
        };
    }, [dmxChannels, selectedChannels]);
    if (compact) {
        return (_jsxs("div", { className: styles.compactStats, children: [_jsxs("span", { className: styles.statItem, title: `Active DMX Channels: ${stats.activeCount} of ${stats.totalChannels}\nSelected Channels: ${stats.selectedCount}`, children: [_jsx("i", { className: "fas fa-chart-line" }), _jsxs("span", { className: stats.activeCount > 0 ? styles.active : '', children: [stats.activeCount, "/", stats.totalChannels] })] }), _jsxs("span", { className: styles.statItem, title: `Maximum Value: ${stats.maxValue}\nAverage Value: ${stats.avgValue}`, children: [_jsx("i", { className: "fas fa-tachometer-alt" }), _jsxs("span", { children: [stats.maxValue, _jsx("span", { className: styles.maxLabel, children: "max" })] })] })] }));
    }
    return (_jsxs("div", { className: styles.channelStats, children: [_jsxs("div", { className: styles.statCard, children: [_jsx("div", { className: styles.statValue, children: stats.activeCount }), _jsx("div", { className: styles.statLabel, children: "Active Channels" }), _jsxs("div", { className: styles.statSecondary, children: ["of ", stats.totalChannels, " total"] })] }), _jsxs("div", { className: styles.statCard, children: [_jsx("div", { className: styles.statValue, children: stats.selectedCount }), _jsx("div", { className: styles.statLabel, children: "Selected" })] }), _jsxs("div", { className: styles.statCard, children: [_jsx("div", { className: styles.statValue, children: stats.maxValue }), _jsx("div", { className: styles.statLabel, children: "Max Value" })] }), _jsxs("div", { className: styles.statCard, children: [_jsx("div", { className: styles.statValue, children: stats.avgValue }), _jsx("div", { className: styles.statLabel, children: "Average" }), _jsx("div", { className: styles.statSecondary, children: "of active channels" })] })] }));
};
