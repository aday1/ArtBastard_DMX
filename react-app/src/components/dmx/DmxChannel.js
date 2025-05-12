import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useStore } from '../../store';
import { MidiLearnButton } from '../midi/MidiLearnButton';
import styles from './DmxChannel.module.scss';
export const DmxChannel = ({ index }) => {
    const { dmxChannels, channelNames, selectedChannels, toggleChannelSelection, setDmxChannel } = useStore(state => ({
        dmxChannels: state.dmxChannels,
        channelNames: state.channelNames,
        selectedChannels: state.selectedChannels,
        toggleChannelSelection: state.toggleChannelSelection,
        setDmxChannel: state.setDmxChannel
    }));
    const [showDetails, setShowDetails] = useState(false);
    // Get the channel value and name
    const value = dmxChannels[index] || 0;
    const name = channelNames[index] || `CH ${index + 1}`;
    // Check if this channel is selected
    const isSelected = selectedChannels.includes(index);
    // Handle value change
    const handleValueChange = (e) => {
        const newValue = parseInt(e.target.value, 10);
        setDmxChannel(index, newValue);
    };
    // Handle direct input change
    const handleDirectInput = (e) => {
        const newValue = parseInt(e.target.value, 10);
        if (!isNaN(newValue) && newValue >= 0 && newValue <= 255) {
            setDmxChannel(index, newValue);
        }
    };
    // Get appropriate background color based on value
    const getBackgroundColor = () => {
        const hue = value === 0 ? 240 : 200;
        const lightness = 20 + (value / 255) * 50;
        return `hsl(${hue}, 80%, ${lightness}%)`;
    };
    // Format to DMX address (1-based)
    const dmxAddress = index + 1;
    return (_jsxs("div", { className: `${styles.channel} ${isSelected ? styles.selected : ''}`, onClick: () => toggleChannelSelection(index), children: [_jsxs("div", { className: styles.header, children: [_jsx("div", { className: styles.address, children: dmxAddress }), _jsx("div", { className: styles.name, children: name }), _jsx("button", { className: styles.detailsToggle, onClick: (e) => {
                            e.stopPropagation();
                            setShowDetails(!showDetails);
                        }, children: _jsx("i", { className: `fas fa-${showDetails ? 'chevron-up' : 'chevron-down'}` }) })] }), _jsx("div", { className: styles.value, style: { backgroundColor: getBackgroundColor() }, children: value }), _jsx("div", { className: styles.slider, children: _jsx("input", { type: "range", min: "0", max: "255", value: value, onChange: handleValueChange, onClick: (e) => e.stopPropagation() }) }), showDetails && (_jsxs("div", { className: styles.details, onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: styles.directInput, children: _jsx("input", { type: "number", min: "0", max: "255", value: value, onChange: handleDirectInput }) }), _jsx(MidiLearnButton, { channelIndex: index }), _jsxs("div", { className: styles.valueDisplay, children: [_jsxs("div", { className: styles.valueHex, children: ["HEX: ", value.toString(16).padStart(2, '0').toUpperCase()] }), _jsxs("div", { className: styles.valuePercent, children: [Math.round((value / 255) * 100), "%"] })] })] }))] }));
};
