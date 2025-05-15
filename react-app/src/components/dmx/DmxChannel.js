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
    // State for MIDI range limiting
    const [showMidiRangeControls, setShowMidiRangeControls] = useState(false);
    const [midiRangeMapping, setMidiRangeMapping] = useState({
        inputMin: 0,
        inputMax: 127,
        outputMin: 0,
        outputMax: 255,
        curve: 1 // Linear by default
    });
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
    // Apply MIDI range settings to the MidiDmxProcessor
    const applyMidiRangeSettings = () => {
        if (window.midiDmxProcessor && typeof window.midiDmxProcessor.setChannelRangeMapping === 'function') {
            window.midiDmxProcessor.setChannelRangeMapping(index, midiRangeMapping);
        }
    };
    // Handle changes to MIDI range values
    const handleMidiRangeChange = (field, value) => {
        setMidiRangeMapping(prev => {
            const newMapping = { ...prev, [field]: value };
            // Ensure min doesn't exceed max
            if (field === 'inputMin' && value > prev.inputMax) {
                newMapping.inputMin = prev.inputMax;
            }
            if (field === 'inputMax' && value < prev.inputMin) {
                newMapping.inputMax = prev.inputMin;
            }
            if (field === 'outputMin' && value > prev.outputMax) {
                newMapping.outputMin = prev.outputMax;
            }
            if (field === 'outputMax' && value < prev.outputMin) {
                newMapping.outputMax = prev.outputMin;
            }
            return newMapping;
        });
    };
    // Apply MIDI range settings whenever they change
    useEffect(() => {
        applyMidiRangeSettings();
    }, [midiRangeMapping, index]);
    // When the component mounts, check if there are existing range mappings
    useEffect(() => {
        if (window.midiDmxProcessor && typeof window.midiDmxProcessor.getChannelRangeMappings === 'function') {
            const mappings = window.midiDmxProcessor.getChannelRangeMappings();
            if (mappings && mappings[index]) {
                setMidiRangeMapping(prev => ({
                    ...prev,
                    ...mappings[index]
                }));
            }
        }
    }, [index]);
    // Listen for DMX channel update events from MidiDmxProcessor
    useEffect(() => {
        const handleDmxChannelUpdate = (event) => {
            const customEvent = event;
            // Log all received events for debugging
            console.log(`[DmxChannel] Received event for channel ${customEvent.detail?.channel}, current channel: ${index}`);
            if (customEvent.detail && customEvent.detail.channel === index) {
                console.log(`[DmxChannel ${index}] Handling update event with value:`, customEvent.detail.value);
                // Update DMX channel value directly through the store
                setDmxChannel(index, customEvent.detail.value);
            }
        };
        // Add event listener
        window.addEventListener('dmxChannelUpdate', handleDmxChannelUpdate);
        // Clean up
        return () => {
            window.removeEventListener('dmxChannelUpdate', handleDmxChannelUpdate);
        };
    }, [index, setDmxChannel]);
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
                        }, children: _jsx("i", { className: `fas fa-${showDetails ? 'chevron-up' : 'chevron-down'}` }) })] }), _jsx("div", { className: styles.value, style: { backgroundColor: getBackgroundColor() }, children: value }), _jsx("div", { className: styles.slider, children: _jsx("input", { type: "range", min: "0", max: "255", value: value, onChange: handleValueChange, onClick: (e) => e.stopPropagation() }) }), showDetails && (_jsxs("div", { className: styles.details, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: styles.directInput, children: [_jsx("label", { htmlFor: `dmx-value-${index}`, children: "Value:" }), _jsx("input", { id: `dmx-value-${index}`, type: "number", min: "0", max: "255", value: value, onChange: handleDirectInput })] }), _jsxs("div", { className: styles.oscAddressInput, children: [_jsx("label", { htmlFor: `osc-address-${index}`, children: "OSC Address:" }), _jsx("input", { id: `osc-address-${index}`, type: "text", value: localOscAddress, onChange: handleOscAddressChange, onBlur: handleOscAddressBlur, onKeyPress: handleOscAddressKeyPress, placeholder: "/dmx/channel/X", className: activityIndicator ? styles.oscActive : '' })] }), currentOscValue !== undefined && (_jsxs("div", { className: styles.oscActivityDisplay, children: ["Last OSC: ", currentOscValue.toFixed(3), lastOscTimestamp && (_jsxs("span", { className: styles.oscTimestamp, children: ["(", new Date(lastOscTimestamp).toLocaleTimeString(), ")"] }))] })), _jsx(MidiLearnButton, { channelIndex: index }), _jsxs("div", { className: styles.midiRangeSection, children: [_jsxs("div", { className: styles.midiRangeHeader, children: [_jsx("span", { children: "MIDI Range Limiting" }), _jsx("button", { className: styles.midiRangeToggle, onClick: () => setShowMidiRangeControls(!showMidiRangeControls), children: _jsx("i", { className: `fas fa-${showMidiRangeControls ? 'chevron-up' : 'cog'}` }) })] }), showMidiRangeControls && (_jsxs("div", { className: styles.midiRangeControls, children: [_jsxs("div", { className: styles.rangeRow, children: [_jsx("label", { children: "MIDI In:" }), _jsxs("div", { className: styles.rangeInputs, children: [_jsx("div", { className: styles.rangeValueDisplay, children: midiRangeMapping.inputMin }), _jsxs("div", { className: styles.rangeSliderContainer, children: [_jsx("div", { className: styles.rangeSliderTrack, children: _jsx("div", { className: styles.rangeSliderActiveTrack, style: {
                                                                        left: `${(midiRangeMapping.inputMin / 127) * 100}%`,
                                                                        width: `${((midiRangeMapping.inputMax - midiRangeMapping.inputMin) / 127) * 100}%`
                                                                    } }) }), _jsx("input", { type: "range", min: "0", max: "127", value: midiRangeMapping.inputMin, onChange: (e) => handleMidiRangeChange('inputMin', parseInt(e.target.value, 10)), className: styles.rangeSliderLeft }), _jsx("input", { type: "range", min: "0", max: "127", value: midiRangeMapping.inputMax, onChange: (e) => handleMidiRangeChange('inputMax', parseInt(e.target.value, 10)), className: styles.rangeSliderRight })] }), _jsx("div", { className: styles.rangeValueDisplay, children: midiRangeMapping.inputMax })] })] }), _jsxs("div", { className: styles.rangeRow, children: [_jsx("label", { children: "DMX Out:" }), _jsxs("div", { className: styles.rangeInputs, children: [_jsx("div", { className: styles.rangeValueDisplay, children: midiRangeMapping.outputMin }), _jsxs("div", { className: styles.rangeSliderContainer, children: [_jsx("div", { className: styles.rangeSliderTrack, children: _jsx("div", { className: styles.rangeSliderActiveTrack, style: {
                                                                        left: `${(midiRangeMapping.outputMin / 255) * 100}%`,
                                                                        width: `${((midiRangeMapping.outputMax - midiRangeMapping.outputMin) / 255) * 100}%`
                                                                    } }) }), _jsx("input", { type: "range", min: "0", max: "255", value: midiRangeMapping.outputMin, onChange: (e) => handleMidiRangeChange('outputMin', parseInt(e.target.value, 10)), className: styles.rangeSliderLeft }), _jsx("input", { type: "range", min: "0", max: "255", value: midiRangeMapping.outputMax, onChange: (e) => handleMidiRangeChange('outputMax', parseInt(e.target.value, 10)), className: styles.rangeSliderRight })] }), _jsx("div", { className: styles.rangeValueDisplay, children: midiRangeMapping.outputMax })] })] }), _jsxs("div", { className: styles.rangeRow, children: [_jsx("label", { children: "Curve:" }), _jsxs("div", { className: styles.rangeInputs, children: [_jsx("span", { className: styles.curveLabel, children: "Log" }), _jsxs("div", { className: styles.rangeSliderContainer, children: [_jsx("div", { className: styles.curveTrack, children: _jsx("div", { className: styles.curveVisualizer, style: {
                                                                        clipPath: midiRangeMapping.curve && midiRangeMapping.curve < 1
                                                                            ? `polygon(0 100%, 0 ${100 - Math.pow(0.2, midiRangeMapping.curve) * 100}%, 20% ${100 - Math.pow(0.4, midiRangeMapping.curve) * 100}%, 40% ${100 - Math.pow(0.6, midiRangeMapping.curve) * 100}%, 60% ${100 - Math.pow(0.8, midiRangeMapping.curve) * 100}%, 100% 0%, 100% 100%)`
                                                                            : `polygon(0 100%, 0 ${100 - Math.pow(0, midiRangeMapping.curve || 1) * 100}%, 20% ${100 - Math.pow(0.2, midiRangeMapping.curve || 1) * 100}%, 40% ${100 - Math.pow(0.4, midiRangeMapping.curve || 1) * 100}%, 60% ${100 - Math.pow(0.6, midiRangeMapping.curve || 1) * 100}%, 80% ${100 - Math.pow(0.8, midiRangeMapping.curve || 1) * 100}%, 100% 0%, 100% 100%)`
                                                                    } }) }), _jsx("input", { type: "range", min: "0.1", max: "5", step: "0.1", value: midiRangeMapping.curve || 1, onChange: (e) => handleMidiRangeChange('curve', parseFloat(e.target.value)), className: styles.curveSlider })] }), _jsx("span", { className: styles.curveLabel, children: "Exp" }), _jsx("div", { className: styles.rangeValueDisplay, children: (midiRangeMapping.curve || 1).toFixed(1) })] })] }), _jsx("div", { className: styles.rangeActions, children: _jsx("button", { className: styles.resetButton, onClick: () => {
                                                setMidiRangeMapping({
                                                    inputMin: 0,
                                                    inputMax: 127,
                                                    outputMin: 0,
                                                    outputMax: 255,
                                                    curve: 1
                                                });
                                            }, children: "Reset" }) })] }))] }), _jsxs("div", { className: styles.valueDisplay, children: [_jsxs("div", { className: styles.valueHex, children: ["HEX: ", value.toString(16).padStart(2, '0').toUpperCase()] }), _jsxs("div", { className: styles.valuePercent, children: [Math.round((value / 255) * 100), "%"] })] })] }))] }));
};
