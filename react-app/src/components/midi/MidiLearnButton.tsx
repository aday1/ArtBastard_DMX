import React from 'react'
import { useMidiLearn } from '../../hooks/useMidiLearn'
import { useStore } from '../../store'
import useStoreUtils from '../../store/storeUtils'
import styles from './MidiLearnButton.module.scss'

interface MidiLearnButtonProps {
  channelIndex: number
  className?: string
}

export const MidiLearnButton: React.FC<MidiLearnButtonProps> = ({ channelIndex, className }) => {
  const { isLearning, learnStatus, currentLearningChannel, startLearn, cancelLearn } = useMidiLearn()
  const midiMappings = useStore(state => state.midiMappings)
  
  // Check if this channel has a mapping
  const hasMapping = !!midiMappings[channelIndex]
  const mapping = midiMappings[channelIndex]
  
  // Check if this channel is in learn mode
  const isChannelLearning = isLearning && currentLearningChannel === channelIndex
  
  // Handle learn button click
  const handleClick = () => {
    if (isChannelLearning) {
      // If already learning, cancel
      cancelLearn()
    } else {
      // Start learning
      startLearn(channelIndex)
    }
  }
  
  // Get the button text based on current state
  const getButtonText = () => {
    if (isChannelLearning) {
      return 'Cancel'
    }
    
    if (hasMapping) {
      if (mapping?.controller !== undefined) {
        return `CC ${mapping.channel}:${mapping.controller}`
      } else if (mapping?.note !== undefined) {
        return `Note ${mapping.channel}:${mapping.note}`
      }
      return 'MIDI Mapped'
    }
    
    return 'MIDI Learn'
  }
  
  // Get button class based on current state
  const getButtonClass = () => {
    if (isChannelLearning) {
      if (learnStatus === 'learning') {
        return styles.learning
      } else if (learnStatus === 'success') {
        return styles.success
      } else if (learnStatus === 'timeout') {
        return styles.error
      }
    }
    
    if (hasMapping) {
      return styles.mapped
    }
    
    return styles.default
  }
  
  return (
    <button
      className={`${styles.learnButton} ${getButtonClass()} ${className || ''}`}
      onClick={handleClick}
      title={hasMapping ? 'Click to remap or right-click to remove' : 'Click to assign MIDI control'}
      onContextMenu={(e) => {
        e.preventDefault()
        if (hasMapping) {
          // Remove mapping on right-click
          useStoreUtils.getState().removeMidiMapping(channelIndex)
        }
      }}
    >
      {isChannelLearning && learnStatus === 'learning' && (
        <div className={styles.pulsingDot} />
      )}
      <span>{getButtonText()}</span>
    </button>
  )
}