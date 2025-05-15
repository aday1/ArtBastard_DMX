import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { useMidiScaling } from '../../hooks/useMidiScaling';
/**
 * This component doesn't render anything but processes MIDI messages
 * and converts them to DMX channel changes
 */
export const MidiDmxProcessor = () => {
    const midiMappings = useStore(state => state.midiMappings);
    const midiMessages = useStore(state => state.midiMessages);
    const setDmxChannel = useStore(state => state.setDmxChannel);
    const { scaleValue } = useMidiScaling();
    // Log when MIDI mappings change, helpful for debugging
    useEffect(() => {
        console.log('[MidiDmxProcessor] MIDI mappings updated:', midiMappings);
    }, [midiMappings]);
    // Listen for new MIDI mappings
    useEffect(() => {
        const handleMidiMappingCreated = (event) => {
            const customEvent = event;
            console.log(`[MidiDmxProcessor] New MIDI mapping created for channel ${customEvent.detail?.channel}:`, customEvent.detail?.mapping);
            // We don't need to do anything special here as the store will be updated automatically.
            // This is just for debugging and to confirm that the event is caught.
        };
        // Add event listener
        window.addEventListener('midiMappingCreated', handleMidiMappingCreated);
        // Clean up
        return () => {
            window.removeEventListener('midiMappingCreated', handleMidiMappingCreated);
        };
    }, []);
    // Keep track of the last processed message to prevent duplicates
    const [lastProcessedMessage, setLastProcessedMessage] = useState(0);
    // Keep track of custom range mappings for each channel
    const [channelRangeMappings, setChannelRangeMappings] = useState({});
    // Process MIDI messages and update DMX channels
    useEffect(() => {
        if (!midiMessages || midiMessages.length === 0)
            return;
        const latestMessage = midiMessages[midiMessages.length - 1];
        // Skip if we've already processed this message
        // We use the length of the messages array as a simple ID
        if (midiMessages.length <= lastProcessedMessage)
            return;
        setLastProcessedMessage(midiMessages.length);
        // Only process CC messages for now (you can add note handling if needed)
        if (latestMessage._type === 'cc' && typeof latestMessage.value === 'number') {
            console.log('[MidiDmxProcessor] Processing CC message:', latestMessage);
            // Look for channels mapped to this controller
            let matchFound = false;
            Object.entries(midiMappings).forEach(([dmxChannelStr, mapping]) => {
                const dmxChannel = parseInt(dmxChannelStr, 10);
                if (mapping &&
                    mapping.channel === latestMessage.channel &&
                    mapping.controller === latestMessage.controller) {
                    matchFound = true;
                    // Get any custom range mapping for this channel
                    const rangeMapping = channelRangeMappings[dmxChannel] || {};
                    // Scale MIDI value (0-127) to DMX value (0-255) with custom range and curve if specified
                    const scalingOptions = {
                        inputMin: rangeMapping.inputMin,
                        inputMax: rangeMapping.inputMax,
                        outputMin: rangeMapping.outputMin,
                        outputMax: rangeMapping.outputMax,
                        curve: rangeMapping.curve
                    };
                    // Only include properties that are actually set
                    Object.keys(scalingOptions).forEach(key => {
                        if (scalingOptions[key] === undefined) {
                            delete scalingOptions[key];
                        }
                    });
                    const scaledValue = scaleValue(latestMessage.value, scalingOptions);
                    console.log(`[MidiDmxProcessor] Updating DMX channel ${dmxChannel} to ${scaledValue} (from MIDI CC value ${latestMessage.value})`, Object.keys(scalingOptions).length > 0 ? `with custom scaling: ${JSON.stringify(scalingOptions)}` : '');
                    // Update the DMX channel - force value to a number within valid range
                    const boundedValue = Math.max(0, Math.min(255, Math.round(scaledValue)));
                    setDmxChannel(dmxChannel, boundedValue);
                    // Dispatch a custom event to ensure the UI updates for this channel
                    if (typeof window !== 'undefined') {
                        console.log(`[MidiDmxProcessor] Dispatching dmxChannelUpdate event for channel ${dmxChannel} with value ${boundedValue}`);
                        window.dispatchEvent(new CustomEvent('dmxChannelUpdate', {
                            detail: { channel: dmxChannel, value: boundedValue }
                        }));
                    }
                }
            });
            // If no matching channel was found, log it
            if (!matchFound && Object.keys(midiMappings).length > 0) {
                console.log(`[MidiDmxProcessor] No DMX channel mapped to CC ${latestMessage.channel}:${latestMessage.controller}`);
            }
        }
        else if (latestMessage._type === 'noteon' && typeof latestMessage.note === 'number') {
            console.log('[MidiDmxProcessor] Processing Note On message:', latestMessage);
            // Look for channels mapped to this note
            Object.entries(midiMappings).forEach(([dmxChannelStr, mapping]) => {
                const dmxChannel = parseInt(dmxChannelStr, 10);
                if (mapping &&
                    mapping.channel === latestMessage.channel &&
                    mapping.note === latestMessage.note &&
                    latestMessage.velocity !== undefined) {
                    // Get any custom range mapping for this channel
                    const rangeMapping = channelRangeMappings[dmxChannel] || {};
                    // Scale MIDI velocity (0-127) to DMX value (0-255) with custom range and curve if specified
                    const scalingOptions = {
                        inputMin: rangeMapping.inputMin,
                        inputMax: rangeMapping.inputMax,
                        outputMin: rangeMapping.outputMin,
                        outputMax: rangeMapping.outputMax,
                        curve: rangeMapping.curve
                    };
                    // Only include properties that are actually set
                    Object.keys(scalingOptions).forEach(key => {
                        if (scalingOptions[key] === undefined) {
                            delete scalingOptions[key];
                        }
                    });
                    const scaledValue = scaleValue(latestMessage.velocity, scalingOptions);
                    console.log(`[MidiDmxProcessor] Updating DMX channel ${dmxChannel} to ${scaledValue} (from MIDI note velocity ${latestMessage.velocity})`, Object.keys(scalingOptions).length > 0 ? `with custom scaling: ${JSON.stringify(scalingOptions)}` : '');
                    // Update the DMX channel - force value to a number within valid range
                    const boundedValue = Math.max(0, Math.min(255, Math.round(scaledValue)));
                    setDmxChannel(dmxChannel, boundedValue);
                    // Dispatch a custom event to ensure the UI updates for this channel
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('dmxChannelUpdate', {
                            detail: { channel: dmxChannel, value: boundedValue }
                        }));
                    }
                }
            });
        }
    }, [midiMessages, midiMappings, setDmxChannel, scaleValue, channelRangeMappings]);
    /**
     * Set a custom range mapping for a specific DMX channel
     */
    const setChannelRangeMapping = (dmxChannel, mapping) => {
        setChannelRangeMappings(prev => ({
            ...prev,
            [dmxChannel]: {
                ...prev[dmxChannel],
                ...mapping
            }
        }));
    };
    // Expose methods to parent components via window for testing
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // @ts-ignore
            window.midiDmxProcessor = {
                setChannelRangeMapping,
                getChannelRangeMappings: () => channelRangeMappings
            };
        }
        return () => {
            if (typeof window !== 'undefined') {
                // @ts-ignore
                delete window.midiDmxProcessor;
            }
        };
    }, [channelRangeMappings]);
    // This component doesn't render anything
    return null;
};
export default MidiDmxProcessor;
