import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { useStore } from '../../store';
import { useTheme } from '../../context/ThemeContext';
import { DmxWebglVisualizer } from './DmxWebglVisualizer';
import { DmxChannel } from './DmxChannel';
import { ColorPalette } from './ColorPalette';
import styles from './DmxControlPanel.module.scss';
export const DmxControlPanel = () => {
    const { theme } = useTheme();
    const [filterText, setFilterText] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [channelsPerPage, setChannelsPerPage] = useState(32);
    const { dmxChannels, selectedChannels, selectAllChannels, deselectAllChannels, invertChannelSelection, } = useStore((state) => ({
        dmxChannels: state.dmxChannels,
        selectedChannels: state.selectedChannels,
        selectAllChannels: state.selectAllChannels,
        deselectAllChannels: state.deselectAllChannels,
        invertChannelSelection: state.invertChannelSelection,
    }));
    // Calculate total pages
    const totalPages = Math.ceil(512 / channelsPerPage);
    // Filter and paginate channels
    const startIdx = currentPage * channelsPerPage;
    const endIdx = Math.min(startIdx + channelsPerPage, 512);
    const displayedChannels = Array.from({ length: endIdx - startIdx }, (_, i) => i + startIdx);
    // Calculate completion for progress bar
    const nonZeroChannels = dmxChannels.filter(val => val > 0).length;
    const completion = (nonZeroChannels / 512) * 100;
    return (_jsxs("div", { className: styles.dmxControlPanel, children: [_jsxs("h2", { className: styles.sectionTitle, children: [theme === 'artsnob' && 'DMX Channels: The Elemental Brushstrokes', theme === 'standard' && 'DMX Channel Control', theme === 'minimal' && 'DMX Channels'] }), "      ", _jsx(DmxWebglVisualizer, { sticky: localStorage.getItem('dmxVisualizerSticky') !== 'false' }), _jsxs("div", { className: styles.statusBar, children: [_jsx("div", { className: styles.progressBar, children: _jsx("div", { className: styles.progressFill, style: { width: `${completion}%` } }) }), _jsxs("div", { className: styles.stats, children: [_jsxs("span", { children: [nonZeroChannels, " active channels"] }), _jsxs("span", { children: [selectedChannels.length, " selected"] })] })] }), _jsxs("div", { className: styles.controlToolbar, children: [_jsxs("div", { className: styles.selectionControls, children: [_jsxs("button", { onClick: selectAllChannels, className: styles.toolbarButton, children: [_jsx("i", { className: "fas fa-check-double" }), theme !== 'minimal' && _jsx("span", { children: "Select All" })] }), _jsxs("button", { onClick: deselectAllChannels, className: styles.toolbarButton, children: [_jsx("i", { className: "fas fa-times" }), theme !== 'minimal' && _jsx("span", { children: "Deselect All" })] }), _jsxs("button", { onClick: invertChannelSelection, className: styles.toolbarButton, children: [_jsx("i", { className: "fas fa-exchange-alt" }), theme !== 'minimal' && _jsx("span", { children: "Invert" })] })] }), _jsxs("div", { className: styles.pageControls, children: [_jsx("button", { onClick: () => setCurrentPage(prev => Math.max(0, prev - 1)), disabled: currentPage === 0, className: styles.pageButton, children: _jsx("i", { className: "fas fa-chevron-left" }) }), _jsx("select", { value: currentPage, onChange: (e) => setCurrentPage(Number(e.target.value)), className: styles.pageSelect, children: Array.from({ length: totalPages }, (_, i) => (_jsxs("option", { value: i, children: [i * channelsPerPage + 1, "-", Math.min((i + 1) * channelsPerPage, 512)] }, i))) }), _jsx("button", { onClick: () => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1)), disabled: currentPage === totalPages - 1, className: styles.pageButton, children: _jsx("i", { className: "fas fa-chevron-right" }) })] }), _jsxs("div", { className: styles.viewControls, children: [_jsxs("select", { value: channelsPerPage, onChange: (e) => {
                                    setChannelsPerPage(Number(e.target.value));
                                    setCurrentPage(0); // Reset to first page when changing view
                                }, className: styles.viewSelect, children: [_jsx("option", { value: 16, children: "16 channels" }), _jsx("option", { value: 32, children: "32 channels" }), _jsx("option", { value: 64, children: "64 channels" }), _jsx("option", { value: 128, children: "128 channels" })] }), _jsxs("div", { className: styles.searchBox, children: [_jsx("input", { type: "text", placeholder: "Filter channels...", value: filterText, onChange: (e) => setFilterText(e.target.value), className: styles.searchInput }), filterText && (_jsx("button", { onClick: () => setFilterText(''), className: styles.clearSearch, children: _jsx("i", { className: "fas fa-times" }) }))] })] })] }), _jsx(ColorPalette, {}), _jsx("div", { className: styles.channelsGrid, children: displayedChannels.map((index) => (_jsx(DmxChannel, { index: index }, index))) }), _jsxs("div", { className: styles.pagination, children: [_jsx("button", { onClick: () => setCurrentPage(0), disabled: currentPage === 0, className: styles.paginationButton, children: _jsx("i", { className: "fas fa-angle-double-left" }) }), _jsx("button", { onClick: () => setCurrentPage(prev => Math.max(0, prev - 1)), disabled: currentPage === 0, className: styles.paginationButton, children: _jsx("i", { className: "fas fa-angle-left" }) }), _jsxs("div", { className: styles.pageIndicator, children: ["Page ", currentPage + 1, " of ", totalPages] }), _jsx("button", { onClick: () => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1)), disabled: currentPage === totalPages - 1, className: styles.paginationButton, children: _jsx("i", { className: "fas fa-angle-right" }) }), _jsx("button", { onClick: () => setCurrentPage(totalPages - 1), disabled: currentPage === totalPages - 1, className: styles.paginationButton, children: _jsx("i", { className: "fas fa-angle-double-right" }) })] })] }));
};
