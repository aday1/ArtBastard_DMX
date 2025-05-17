import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../../store';
import { MidiLearnButton } from '../midi/MidiLearnButton';
import styles from './DmxChannel.module.scss';

// We're now using the globally declared MidiRangeMapping type from types/midi-dmx-processor.d.ts
interface DmxChannelProps {
  index: number;
  key?: number | string;
}

// Extended MidiRangeMapping to include curve parameter
interface ExtendedMidiRangeMapping extends MidiRangeMapping {
  curve?: number;
}

export const DmxChannel: React.FC<DmxChannelProps> = ({ index }) => {
  const {
    dmxChannels,
    channelNames,
    selectedChannels,
    toggleChannelSelection,
    setDmxChannel,
    oscAssignments,
    setOscAssignment,
    oscActivity,
  } = useStore(state => ({
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
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State for MIDI range limiting
  const [showMidiRangeControls, setShowMidiRangeControls] = useState(false);
  const [midiRangeMapping, setMidiRangeMapping] = useState<ExtendedMidiRangeMapping>({
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
  const handleMidiRangeChange = (field: keyof ExtendedMidiRangeMapping, value: number) => {
    setMidiRangeMapping(prev => {
      const newMapping = { ...prev, [field]: value };
      
      // Ensure min doesn't exceed max
      if (field === 'inputMin' && value > prev.inputMax!) {
        newMapping.inputMin = prev.inputMax;
      }
      if (field === 'inputMax' && value < prev.inputMin!) {
        newMapping.inputMax = prev.inputMin;
      }
      if (field === 'outputMin' && value > prev.outputMax!) {
        newMapping.outputMin = prev.outputMax;
      }
      if (field === 'outputMax' && value < prev.outputMin!) {
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
    const handleDmxChannelUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{channel: number, value: number}>;
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
    console.log(`[DmxChannel ${index}] Added dmxChannelUpdate event listener`);
    
    // Clean up
    return () => {
      window.removeEventListener('dmxChannelUpdate', handleDmxChannelUpdate);
    };
  }, [index, setDmxChannel]);

  const value = dmxChannels[index] || 0;
  const name = channelNames[index] || `CH ${index + 1}`;
  const isSelected = selectedChannels.includes(index);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setDmxChannel(index, newValue);
  };

  const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= 0 && newValue <= 255) {
      setDmxChannel(index, newValue);
    }
  };

  const handleOscAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalOscAddress(e.target.value);
  };

  const handleOscAddressBlur = () => {
    if (setOscAssignment && oscAssignments[index] !== localOscAddress) {
      setOscAssignment(index, localOscAddress);
    }
  };

  const handleOscAddressKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (setOscAssignment && oscAssignments[index] !== localOscAddress) {
        setOscAssignment(index, localOscAddress);
        (e.target as HTMLInputElement).blur();
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

  return (
    <div
      className={`${styles.channel} ${isSelected ? styles.selected : ''} ${showDetails ? styles.expanded : ''}`}
      onClick={() => toggleChannelSelection(index)}
    >
      <div className={styles.header}>
        <div className={styles.address}>{dmxAddress}</div>
        <div className={styles.name}>{name}</div>
        <button
          className={styles.detailsToggle}
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
        >
          <i className={`fas fa-${showDetails ? 'chevron-up' : 'chevron-down'}`}></i>
        </button>
      </div>

      <div className={`${styles.value} ${showDetails ? styles.expandedValue : ''}`} style={{ backgroundColor: getBackgroundColor() }}>
        {value}
        {showDetails && <span className={styles.valuePercentOverlay}>{Math.round((value / 255) * 100)}%</span>}
      </div>

      <div className={`${styles.slider} ${showDetails ? styles.expandedSlider : ''}`} data-dmx-channel={index}>
        <input
          type="range"
          min="0"
          max="255"
          value={value}
          onChange={handleValueChange}
          onClick={(e) => e.stopPropagation()}
          data-slider-index={index}
        />
      </div>

      {showDetails && (
        <div className={styles.details} onClick={(e) => e.stopPropagation()}>
          <div className={styles.directInput}>
            <label htmlFor={`dmx-value-${index}`}>Value:</label>
            <input
              id={`dmx-value-${index}`}
              type="number"
              min="0"
              max="255"
              value={value}
              onChange={handleDirectInput}
            />
          </div>

          <div className={styles.oscAddressInput}>
            <label htmlFor={`osc-address-${index}`}>OSC Address:</label>
            <input
              id={`osc-address-${index}`}
              type="text"
              value={localOscAddress}
              onChange={handleOscAddressChange}
              onBlur={handleOscAddressBlur}
              onKeyPress={handleOscAddressKeyPress}
              placeholder="/dmx/channel/X"
              className={activityIndicator ? styles.oscActive : ''}
            />
          </div>

          {currentOscValue !== undefined && (
            <div className={styles.oscActivityDisplay}>
              Last OSC: {currentOscValue.toFixed(3)}
              {lastOscTimestamp && (
                <span className={styles.oscTimestamp}>
                  ({new Date(lastOscTimestamp).toLocaleTimeString()})
                </span>
              )}
            </div>
          )}

          <MidiLearnButton channelIndex={index} />

          <div className={styles.midiRangeSection}>
            <div className={styles.midiRangeHeader}>
              <span>MIDI Range Limiting</span>
              <button 
                className={styles.midiRangeToggle} 
                onClick={() => setShowMidiRangeControls(!showMidiRangeControls)}
              >
                <i className={`fas fa-${showMidiRangeControls ? 'chevron-up' : 'cog'}`}></i>
              </button>
            </div>
            
            {showMidiRangeControls && (
              <div className={styles.midiRangeControls}>
                <div className={styles.rangeRow}>
                  <label>MIDI In:</label>
                  <div className={styles.rangeInputs}>
                    <div className={styles.rangeValueDisplay}>
                      {midiRangeMapping.inputMin}
                    </div>
                    <div className={styles.rangeSliderContainer}>
                      <div className={styles.rangeSliderTrack}>
                        <div 
                          className={styles.rangeSliderActiveTrack}
                          style={{
                            left: `${(midiRangeMapping.inputMin / 127) * 100}%`, 
                            width: `${((midiRangeMapping.inputMax - midiRangeMapping.inputMin) / 127) * 100}%`
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="127"
                        value={midiRangeMapping.inputMin}
                        onChange={(e) => handleMidiRangeChange('inputMin', parseInt(e.target.value, 10))}
                        className={styles.rangeSliderLeft}
                      />
                      <input
                        type="range"
                        min="0"
                        max="127"
                        value={midiRangeMapping.inputMax}
                        onChange={(e) => handleMidiRangeChange('inputMax', parseInt(e.target.value, 10))}
                        className={styles.rangeSliderRight}
                      />
                    </div>
                    <div className={styles.rangeValueDisplay}>
                      {midiRangeMapping.inputMax}
                    </div>
                  </div>
                </div>
                
                <div className={styles.rangeRow}>
                  <label>DMX Out:</label>
                  <div className={styles.rangeInputs}>
                    <div className={styles.rangeValueDisplay}>
                      {midiRangeMapping.outputMin}
                    </div>
                    <div className={styles.rangeSliderContainer}>
                      <div className={styles.rangeSliderTrack}>
                        <div 
                          className={styles.rangeSliderActiveTrack}
                          style={{
                            left: `${(midiRangeMapping.outputMin / 255) * 100}%`, 
                            width: `${((midiRangeMapping.outputMax - midiRangeMapping.outputMin) / 255) * 100}%`
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={midiRangeMapping.outputMin}
                        onChange={(e) => handleMidiRangeChange('outputMin', parseInt(e.target.value, 10))}
                        className={styles.rangeSliderLeft}
                      />
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={midiRangeMapping.outputMax}
                        onChange={(e) => handleMidiRangeChange('outputMax', parseInt(e.target.value, 10))}
                        className={styles.rangeSliderRight}
                      />
                    </div>
                    <div className={styles.rangeValueDisplay}>
                      {midiRangeMapping.outputMax}
                    </div>
                  </div>
                </div>

                <div className={styles.rangeRow}>
                  <label>Curve:</label>
                  <div className={styles.rangeInputs}>
                    <span className={styles.curveLabel}>Log</span>
                    <div className={styles.rangeSliderContainer}>
                      <div className={styles.curveTrack}>
                        <div 
                          className={styles.curveVisualizer}
                          style={{
                            clipPath: midiRangeMapping.curve && midiRangeMapping.curve < 1 
                              ? `polygon(0 100%, 0 ${100 - Math.pow(0.2, midiRangeMapping.curve) * 100}%, 20% ${100 - Math.pow(0.4, midiRangeMapping.curve) * 100}%, 40% ${100 - Math.pow(0.6, midiRangeMapping.curve) * 100}%, 60% ${100 - Math.pow(0.8, midiRangeMapping.curve) * 100}%, 100% 0%, 100% 100%)`
                              : `polygon(0 100%, 0 ${100 - Math.pow(0, midiRangeMapping.curve || 1) * 100}%, 20% ${100 - Math.pow(0.2, midiRangeMapping.curve || 1) * 100}%, 40% ${100 - Math.pow(0.4, midiRangeMapping.curve || 1) * 100}%, 60% ${100 - Math.pow(0.6, midiRangeMapping.curve || 1) * 100}%, 80% ${100 - Math.pow(0.8, midiRangeMapping.curve || 1) * 100}%, 100% 0%, 100% 100%)`
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={midiRangeMapping.curve || 1}
                        onChange={(e) => handleMidiRangeChange('curve', parseFloat(e.target.value))}
                        className={styles.curveSlider}
                      />
                    </div>
                    <span className={styles.curveLabel}>Exp</span>
                    <div className={styles.rangeValueDisplay}>
                      {(midiRangeMapping.curve || 1).toFixed(1)}
                    </div>
                  </div>
                </div>
                
                <div className={styles.rangeActions}>
                  <button 
                    className={styles.resetButton}
                    onClick={() => {
                      setMidiRangeMapping({
                        inputMin: 0,
                        inputMax: 127,
                        outputMin: 0,
                        outputMax: 255,
                        curve: 1
                      });
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.valueDisplay}>
            <div className={styles.valueHex}>
              HEX: {value.toString(16).padStart(2, '0').toUpperCase()}
            </div>
            <div className={styles.valuePercent}>
              {Math.round((value / 255) * 100)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};