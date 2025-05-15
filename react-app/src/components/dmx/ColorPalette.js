import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { useStore } from '../../store';
import { useTheme } from '../../context/ThemeContext';
import styles from './ColorPalette.module.scss';
export const ColorPalette = () => {
    const { theme } = useTheme();
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [customColor, setCustomColor] = useState({
        r: 255,
        g: 255,
        b: 255
    });
    const { selectedChannels, setDmxChannel } = useStore(state => ({
        selectedChannels: state.selectedChannels,
        setDmxChannel: state.setDmxChannel
    }));
    // Predefined color presets
    const colorPresets = [
        { color: '#FF0000', rgb: [255, 0, 0], name: 'Red' },
        { color: '#00FF00', rgb: [0, 255, 0], name: 'Green' },
        { color: '#0000FF', rgb: [0, 0, 255], name: 'Blue' },
        { color: '#FFFF00', rgb: [255, 255, 0], name: 'Yellow' },
        { color: '#FF00FF', rgb: [255, 0, 255], name: 'Magenta' },
        { color: '#00FFFF', rgb: [0, 255, 255], name: 'Cyan' },
        { color: '#FFA500', rgb: [255, 165, 0], name: 'Orange' },
        { color: '#800080', rgb: [128, 0, 128], name: 'Purple' },
        { color: '#008000', rgb: [0, 128, 0], name: 'Dark Green' },
        { color: '#FF1493', rgb: [255, 20, 147], name: 'Pink' },
        { color: '#4B0082', rgb: [75, 0, 130], name: 'Indigo' },
        { color: '#FFFFFF', rgb: [255, 255, 255], name: 'White' },
    ];
    // Apply color to selected channels
    const applyColor = (rgb) => {
        // Find RGB channels among selected channels
        const redChannels = [];
        const greenChannels = [];
        const blueChannels = [];
        // For now, use a simple algorithm: 
        // If 3 consecutive channels are selected, treat them as RGB
        for (let i = 0; i < selectedChannels.length - 2; i++) {
            const channel1 = selectedChannels[i];
            const channel2 = selectedChannels[i + 1];
            const channel3 = selectedChannels[i + 2];
            // Check if they're consecutive
            if (channel2 === channel1 + 1 && channel3 === channel2 + 1) {
                redChannels.push(channel1);
                greenChannels.push(channel2);
                blueChannels.push(channel3);
                i += 2; // Skip the next two channels as we've already processed them
            }
        }
        // If we found RGB channel groups, set their values
        if (redChannels.length > 0) {
            redChannels.forEach(channel => setDmxChannel(channel, rgb[0]));
            greenChannels.forEach(channel => setDmxChannel(channel, rgb[1]));
            blueChannels.forEach(channel => setDmxChannel(channel, rgb[2]));
        }
        else {
            // If no RGB groups found, set all selected channels to the same value
            // Use the perceived brightness of the color
            const brightness = Math.round(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
            selectedChannels.forEach(channel => setDmxChannel(channel, brightness));
        }
    };
    // Handle custom color change
    const handleColorChange = (component, value) => {
        setCustomColor(prev => ({
            ...prev,
            [component]: value
        }));
    };
    // Apply custom color
    const applyCustomColor = () => {
        applyColor([customColor.r, customColor.g, customColor.b]);
        setShowCustomPicker(false);
    };
    return (_jsxs("div", { className: styles.colorPalette, children: [_jsxs("h3", { className: styles.title, children: [theme === 'artsnob' && 'Color Palette: Chromatic Expressions', theme === 'standard' && 'Color Palette', theme === 'minimal' && 'Colors'] }), _jsxs("div", { className: styles.paletteContent, children: [_jsxs("div", { className: styles.presets, children: [colorPresets.map((preset, index) => (_jsx("button", { className: styles.colorPreset, style: { backgroundColor: preset.color }, onClick: () => applyColor(preset.rgb), title: preset.name }, index))), _jsx("button", { className: `${styles.colorPreset} ${styles.customColorButton}`, onClick: () => setShowCustomPicker(!showCustomPicker), title: "Custom Color", children: _jsx("i", { className: "fas fa-plus" }) })] }), showCustomPicker && (_jsxs("div", { className: styles.customColorPicker, children: [_jsxs("div", { className: styles.sliderContainer, children: [_jsx("label", { children: "R:" }), _jsx("input", { type: "range", min: "0", max: "255", value: customColor.r, onChange: (e) => handleColorChange('r', parseInt(e.target.value)), className: styles.redSlider }), _jsx("span", { children: customColor.r })] }), _jsxs("div", { className: styles.sliderContainer, children: [_jsx("label", { children: "G:" }), _jsx("input", { type: "range", min: "0", max: "255", value: customColor.g, onChange: (e) => handleColorChange('g', parseInt(e.target.value)), className: styles.greenSlider }), _jsx("span", { children: customColor.g })] }), _jsxs("div", { className: styles.sliderContainer, children: [_jsx("label", { children: "B:" }), _jsx("input", { type: "range", min: "0", max: "255", value: customColor.b, onChange: (e) => handleColorChange('b', parseInt(e.target.value)), className: styles.blueSlider }), _jsx("span", { children: customColor.b })] }), _jsx("div", { className: styles.colorPreview, style: {
                                    backgroundColor: `rgb(${customColor.r}, ${customColor.g}, ${customColor.b})`
                                } }), _jsxs("button", { className: styles.applyButton, onClick: applyCustomColor, children: [_jsx("i", { className: "fas fa-check" }), " Apply"] })] })), _jsx("div", { className: styles.instructions, children: selectedChannels.length === 0 ? (_jsx("p", { children: "Select DMX channels to apply colors" })) : (_jsxs("p", { children: [selectedChannels.length, " channels selected. Click a color to apply."] })) })] })] }));
};
