import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { MidiLearnButton } from '../midi/MidiLearnButton';
import styles from './DmxChannel.module.scss';
export const DmxChannel = ({ index }) => {
    const { dmxChannels, channelNames, selectedChannels, toggleChannelSelection, setDmxChannel, oscAssignments, setOscAssignment, oscActivity, } = useStore(state => ({
        dmxChannels: state.dmxChannels,
        channelNames: state.channelNames,
        selectedChannels: state.selectedChannels,
        toggleChannelSelection: state.toggleChannelSelection,
        setDmxChannel: state.setDmxChannel,
        oscAssignments: state.oscAssignments,
        setOscAssignment: state.setOscAssignment,
        oscActivity: state.oscActivity,
    }));
    const [showDetails, setShowDetails] = useState(false);
    const [localOscAddress, setLocalOscAddress] = useState('');
    const [activityIndicator, setActivityIndicator] = useState(false);
    const activityTimeoutRef = useRef(null);
    useEffect(() => {
        if (oscAssignments && oscAssignments[index]) {
            setLocalOscAddress(oscAssignments[index]);
        }
    }, [oscAssignments, index]);
    useEffect(() => {
        const currentActivity = oscActivity[index];
        if (currentActivity && currentActivity.value > 0) {
            setActivityIndicator(true);
            if (activityTimeoutRef.current) {
                clearTimeout(activityTimeoutRef.current);
            }
            activityTimeoutRef.current = setTimeout(() => {
                setActivityIndicator(false);
            }, 300);
        }
        return () => {
            if (activityTimeoutRef.current) {
                clearTimeout(activityTimeoutRef.current);
            }
        };
    }, [oscActivity, index]);
    const value = dmxChannels[index] || 0;
    const name = channelNames[index] || `CH ${index + 1}`;
    const isSelected = selectedChannels.includes(index);
    const handleValueChange = (e) => {
        const newValue = parseInt(e.target.value, 10);
        setDmxChannel(index, newValue);
    };
    const handleDirectInput = (e) => {
        const newValue = parseInt(e.target.value, 10);
        if (!isNaN(newValue) && newValue >= 0 && newValue <= 255) {
            setDmxChannel(index, newValue);
        }
    };
    const handleOscAddressChange = (e) => {
        setLocalOscAddress(e.target.value);
    };
    const handleOscAddressBlur = () => {
        if (setOscAssignment && oscAssignments[index] !== localOscAddress) {
            setOscAssignment(index, localOscAddress);
        }
    };
    const handleOscAddressKeyPress = (e) => {
        if (e.key === 'Enter') {
            if (setOscAssignment && oscAssignments[index] !== localOscAddress) {
                setOscAssignment(index, localOscAddress);
                e.target.blur();
            }
        }
    };
    const getBackgroundColor = () => {
        const hue = value === 0 ? 240 : 200;
        const lightness = 20 + (value / 255) * 50;
        return `hsl(${hue}, 80%, ${lightness}%)`;
    };
    const dmxAddress = index + 1;
    const currentOscValue = oscActivity[index]?.value;
    const lastOscTimestamp = oscActivity[index]?.timestamp;
    return (_jsxs("div", { className: `${styles.channel} ${isSelected ? styles.selected : ''}`, onClick: () => toggleChannelSelection(index), children: [_jsxs("div", { className: styles.header, children: [_jsx("div", { className: styles.address, children: dmxAddress }), _jsx("div", { className: styles.name, children: name }), _jsx("button", { className: styles.detailsToggle, onClick: (e) => {
                            e.stopPropagation();
                            setShowDetails(!showDetails);
                        }, children: _jsx("i", { className: `fas fa-${showDetails ? 'chevron-up' : 'chevron-down'}` }) })] }), _jsx("div", { className: styles.value, style: { backgroundColor: getBackgroundColor() }, children: value }), _jsx("div", { className: styles.slider, children: _jsx("input", { type: "range", min: "0", max: "255", value: value, onChange: handleValueChange, onClick: (e) => e.stopPropagation() }) }), showDetails && (_jsxs("div", { className: styles.details, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: styles.directInput, children: [_jsx("label", { htmlFor: `dmx-value-${index}`, children: "Value:" }), _jsx("input", { id: `dmx-value-${index}`, type: "number", min: "0", max: "255", value: value, onChange: handleDirectInput })] }), _jsxs("div", { className: styles.oscAddressInput, children: [_jsx("label", { htmlFor: `osc-address-${index}`, children: "OSC Address:" }), _jsx("input", { id: `osc-address-${index}`, type: "text", value: localOscAddress, onChange: handleOscAddressChange, onBlur: handleOscAddressBlur, onKeyPress: handleOscAddressKeyPress, placeholder: "/dmx/channel/X", className: activityIndicator ? styles.oscActive : '' })] }), currentOscValue !== undefined && (_jsxs("div", { className: styles.oscActivityDisplay, children: ["Last OSC: ", currentOscValue.toFixed(3), lastOscTimestamp && (_jsxs("span", { className: styles.oscTimestamp, children: ["(", new Date(lastOscTimestamp).toLocaleTimeString(), ")"] }))] })), _jsx(MidiLearnButton, { channelIndex: index }), _jsxs("div", { className: styles.valueDisplay, children: [_jsxs("div", { className: styles.valueHex, children: ["HEX: ", value.toString(16).padStart(2, '0').toUpperCase()] }), _jsxs("div", { className: styles.valuePercent, children: [Math.round((value / 255) * 100), "%"] })] })] }))] }));
};
