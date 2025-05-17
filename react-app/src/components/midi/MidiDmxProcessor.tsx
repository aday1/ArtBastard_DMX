import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { useMidiScaling, ScalingOptions } from '../../hooks/useMidiScaling';

// Extended mapping interface to include range limits and curve
interface MidiRangeMapping {
  inputMin?: number;
  inputMax?: number;
  outputMin?: number; 
  outputMax?: number;
  curve?: number;  // 1 = linear, >1 = exponential, <1 = logarithmic
}

/**
 * This component doesn't render anything but processes MIDI messages
 * and converts them to DMX channel changes
 */
export const MidiDmxProcessor: React.FC = () => {
  const midiMappings = useStore(state => state.midiMappings);
  const midiMessages = useStore(state => state.midiMessages);
  const setDmxChannel = useStore(state => state.setDmxChannel);
  const { scaleValue } = useMidiScaling();
  
  // Keep track of the last processed message to prevent duplicates
  const [lastProcessedMessage, setLastProcessedMessage] = useState<number>(0);
  
  // Keep track of custom range mappings for each channel
  const [channelRangeMappings, setChannelRangeMappings] = useState<Record<number, MidiRangeMapping>>({});
  
  // Log when MIDI mappings change, helpful for debugging
  useEffect(() => {
    console.log('[MidiDmxProcessor] MIDI mappings updated in store:', midiMappings);
  }, [midiMappings]);
  
  // Process MIDI messages and update DMX channels
  useEffect(() => {
    if (!midiMessages || midiMessages.length === 0) {
      return;
    }

    const latestMessage = midiMessages[midiMessages.length - 1];

    if (midiMessages.length <= lastProcessedMessage) {
      return;
    }

    console.log(`[MidiDmxProcessor] Attempting to process MIDI message #${midiMessages.length}:`, latestMessage);

    if (latestMessage._type === 'cc' && typeof latestMessage.value === 'number') {
      console.log('[MidiDmxProcessor] Processing CC message:', latestMessage, 'Current Mappings:', midiMappings);
      setLastProcessedMessage(midiMessages.length); // Mark this message length as processed

      let matchFoundThisRun = false;
      Object.entries(midiMappings).forEach(([dmxChannelStr, mapping]) => {
        if (!mapping) return;

        const dmxChannel = parseInt(dmxChannelStr, 10);
        
        // Ensure mapping.controller is defined, as mapping could be for a note
        if (mapping.controller !== undefined &&
            mapping.channel === latestMessage.channel &&
            mapping.controller === latestMessage.controller) {
          
          matchFoundThisRun = true;
          console.log(`[MidiDmxProcessor] Match found for DMX CH ${dmxChannel} with MIDI CH ${latestMessage.channel} CC ${latestMessage.controller}`);

          const currentRangeMapping = channelRangeMappings[dmxChannel] || {};
          const scalingOptions: Partial<ScalingOptions> = {
            inputMin: currentRangeMapping.inputMin,
            inputMax: currentRangeMapping.inputMax,
            outputMin: currentRangeMapping.outputMin,
            outputMax: currentRangeMapping.outputMax,
            curve: currentRangeMapping.curve,
          };
          
          const dmxValue = scaleValue(latestMessage.value, scalingOptions);
          const roundedDmxValue = typeof dmxValue === 'number' ? Math.round(dmxValue) : 0;
          const boundedValue = Math.max(0, Math.min(255, roundedDmxValue));
          
          console.log(`[MidiDmxProcessor] MIDI val ${latestMessage.value} -> Scaled DMX val ${dmxValue} -> Rounded ${roundedDmxValue} -> Bounded DMX val ${boundedValue} for DMX CH ${dmxChannel}`);
          
          setDmxChannel(dmxChannel, boundedValue);
          
          if (typeof window !== 'undefined') {
            console.log(`[MidiDmxProcessor] Dispatching dmxChannelUpdate event for channel ${dmxChannel} with value ${boundedValue}`);
            try {
              const event = new CustomEvent('dmxChannelUpdate', { 
                detail: { channel: dmxChannel, value: boundedValue }
              });
              window.dispatchEvent(event);
            } catch (error) {
              console.error(`[MidiDmxProcessor] Error dispatching event:`, error);
            }
          }
        }
      });

      if (!matchFoundThisRun) {
        console.log('[MidiDmxProcessor] No DMX channel mapped to received CC message:', latestMessage, 'Current Mappings:', midiMappings);
      }
    } else if (latestMessage._type !== 'noteon' && latestMessage._type !== 'noteoff') {
      setLastProcessedMessage(midiMessages.length);
      console.log(`[MidiDmxProcessor] Ignored/marked as processed non-CC message type: ${latestMessage._type}`);
    }
  }, [midiMessages, midiMappings, setDmxChannel, scaleValue, channelRangeMappings, lastProcessedMessage]);

  /**
   * Set a custom range mapping for a specific DMX channel
   */
  const setChannelRangeMapping = (dmxChannel: number, mapping: MidiRangeMapping) => {
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
