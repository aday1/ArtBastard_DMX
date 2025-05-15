import { useState } from 'react';
/**
 * Hook for scaling values between different ranges (e.g., MIDI 0-127 to DMX 0-255)
 * with optional curve adjustment
 */
export const useMidiScaling = () => {
    // Default scaling options
    const [options, setOptions] = useState({
        inputMin: 0,
        inputMax: 127,
        outputMin: 0,
        outputMax: 255,
        curve: 1, // Linear by default
    });
    /**
     * Scale a value from input range to output range with optional curve
     */
    const scaleValue = (value, customOptions) => {
        // Use provided options or defaults
        const opts = { ...options, ...customOptions };
        const { inputMin, inputMax, outputMin, outputMax, curve = 1 } = opts;
        // Clamp input value to range
        const clampedValue = Math.max(inputMin, Math.min(inputMax, value));
        // Normalize to 0-1 range
        const normalizedValue = (clampedValue - inputMin) / (inputMax - inputMin || 1); // Avoid division by zero
        // Apply curve (power function)
        const curvedValue = curve === 1
            ? normalizedValue // Linear
            : Math.pow(normalizedValue, curve);
        // Scale to output range and round to integer for DMX
        return Math.round(outputMin + curvedValue * (outputMax - outputMin));
    };
    /**
     * Set global scaling options
     */
    const setScalingOptions = (newOptions) => {
        setOptions(prev => ({ ...prev, ...newOptions }));
    };
    return { scaleValue, setScalingOptions, options };
    /**
     * Update scaling options
     */
    const updateOptions = (newOptions) => {
        setOptions(prev => ({ ...prev, ...newOptions }));
    };
    return {
        scaleValue,
        updateOptions,
        options
    };
};
