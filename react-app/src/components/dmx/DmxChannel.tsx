import React, { useState } from 'react'
import { useStore } from '../../store'
import { MidiLearnButton } from '../midi/MidiLearnButton'
import styles from './DmxChannel.module.scss'

interface DmxChannelProps {
  index: number;
  key?: number | string;
}

export const DmxChannel: React.FC<DmxChannelProps> = ({ index }) => {
  const { 
    dmxChannels, 
    channelNames,
    selectedChannels,
    toggleChannelSelection,
    setDmxChannel
  } = useStore(state => ({
    dmxChannels: state.dmxChannels,
    channelNames: state.channelNames,
    selectedChannels: state.selectedChannels,
    toggleChannelSelection: state.toggleChannelSelection,
    setDmxChannel: state.setDmxChannel
  }))
  
  const [showDetails, setShowDetails] = useState(false)
  
  // Get the channel value and name
  const value = dmxChannels[index] || 0
  const name = channelNames[index] || `CH ${index + 1}`
  
  // Check if this channel is selected
  const isSelected = selectedChannels.includes(index)
  
  // Handle value change
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10)
    setDmxChannel(index, newValue)
  }
  
  // Handle direct input change
  const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10)
    if (!isNaN(newValue) && newValue >= 0 && newValue <= 255) {
      setDmxChannel(index, newValue)
    }
  }
  
  // Get appropriate background color based on value
  const getBackgroundColor = () => {
    const hue = value === 0 ? 240 : 200
    const lightness = 20 + (value / 255) * 50
    return `hsl(${hue}, 80%, ${lightness}%)`
  }
  
  // Format to DMX address (1-based)
  const dmxAddress = index + 1
  
  return (
    <div 
      className={`${styles.channel} ${isSelected ? styles.selected : ''}`}
      onClick={() => toggleChannelSelection(index)}
    >
      <div className={styles.header}>
        <div className={styles.address}>{dmxAddress}</div>
        <div className={styles.name}>{name}</div>
        <button 
          className={styles.detailsToggle}
          onClick={(e) => {
            e.stopPropagation()
            setShowDetails(!showDetails)
          }}
        >
          <i className={`fas fa-${showDetails ? 'chevron-up' : 'chevron-down'}`}></i>
        </button>
      </div>
      
      <div className={styles.value} style={{ backgroundColor: getBackgroundColor() }}>
        {value}
      </div>
      
      <div className={styles.slider}>
        <input 
          type="range"
          min="0"
          max="255"
          value={value}
          onChange={handleValueChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      
      {showDetails && (
        <div className={styles.details} onClick={(e) => e.stopPropagation()}>
          <div className={styles.directInput}>
            <input 
              type="number"
              min="0"
              max="255"
              value={value}
              onChange={handleDirectInput}
            />
          </div>
          
          <MidiLearnButton channelIndex={index} />
          
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
  )
}