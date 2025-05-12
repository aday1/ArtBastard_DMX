import React, { useState } from 'react'
import { useStore } from '../../store'
import { useTheme } from '../../context/ThemeContext'
import { MidiLearnButton } from '../midi/MidiLearnButton'
import styles from './SceneGallery.module.scss'

export const SceneGallery: React.FC = () => {
  const { theme } = useTheme()
  const { scenes, dmxChannels, loadScene, deleteScene } = useStore(state => ({
    scenes: state.scenes,
    dmxChannels: state.dmxChannels,
    loadScene: state.loadScene,
    deleteScene: state.deleteScene
  }))
  
  const [newSceneName, setNewSceneName] = useState('')
  const [newSceneOsc, setNewSceneOsc] = useState('/scene/new')
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [transitionTime, setTransitionTime] = useState(1) // seconds
  
  // Save current DMX state as a new scene
  const saveScene = () => {
    if (!newSceneName.trim()) {
      useStore.getState().showStatusMessage('Scene name cannot be empty', 'error')
      return
    }
    
    // Check for duplicate names
    if (scenes.some(s => s.name === newSceneName)) {
      if (!window.confirm(`Scene "${newSceneName}" already exists. Overwrite?`)) {
        return
      }
    }
    
    useStore.getState().saveScene(newSceneName, newSceneOsc)
    
    // Reset form
    setNewSceneName('')
    setNewSceneOsc('/scene/new')
    
    // Show success message
    useStore.getState().showStatusMessage(`Scene "${newSceneName}" saved`, 'success')
  }
  
  // Calculate the number of active channels in a scene
  const getActiveChannelCount = (channelValues: number[]) => {
    return channelValues.filter(v => v > 0).length
  }
  
  // Format time for display
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`
    } else {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}m ${secs.toFixed(0)}s`
    }
  }
  
  return (
    <div className={styles.sceneGallery}>
      <h2 className={styles.sectionTitle}>
        {theme === 'artsnob' && 'Scene Gallery: The Exhibition of Light'}
        {theme === 'standard' && 'Scenes'}
        {theme === 'minimal' && 'Scenes'}
      </h2>
      
      {/* Scene creation form */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>
            {theme === 'artsnob' && 'Create New Scene: Choreography of Light'}
            {theme === 'standard' && 'New Scene'}
            {theme === 'minimal' && 'New Scene'}
          </h3>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.formGroup}>
            <label htmlFor="sceneName">
              {theme === 'artsnob' && 'Title of Masterpiece:'}
              {theme === 'standard' && 'Scene Name:'}
              {theme === 'minimal' && 'Name:'}
            </label>
            <input
              type="text"
              id="sceneName"
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              placeholder={
                theme === 'artsnob' 
                  ? 'Bestow a title upon your luminous creation...'
                  : 'Enter scene name'
              }
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="sceneOsc">OSC Address:</label>
            <input
              type="text"
              id="sceneOsc"
              value={newSceneOsc}
              onChange={(e) => setNewSceneOsc(e.target.value)}
              placeholder="/scene/name"
            />
          </div>
          
          <div className={styles.scenePreview}>
            <div className={styles.previewHeader}>
              <h4>Current DMX State Preview</h4>
              <span className={styles.channelCount}>
                {getActiveChannelCount(dmxChannels)} active channels
              </span>
            </div>
            
            <div className={styles.channelPreview}>
              {dmxChannels.map((value, index) => 
                value > 0 ? (
                  <div 
                    key={index}
                    className={styles.activeChannel}
                    style={{ opacity: value / 255 }}
                    title={`Channel ${index + 1}: ${value}`}
                  >
                    {index + 1}
                  </div>
                ) : null
              )}
            </div>
          </div>
          
          <button 
            className={styles.saveButton}
            onClick={saveScene}
            disabled={!newSceneName.trim()}
          >
            <i className="fas fa-save"></i>
            {theme === 'artsnob' && 'Immortalize Scene'}
            {theme === 'standard' && 'Save Scene'}
            {theme === 'minimal' && 'Save'}
          </button>
        </div>
      </div>
      
      {/* Scene transition controls */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>
            {theme === 'artsnob' && 'Transition: The Temporal Canvas'}
            {theme === 'standard' && 'Transition Controls'}
            {theme === 'minimal' && 'Transition'}
          </h3>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.transitionControls}>
            <div className={styles.transitionTime}>
              <label htmlFor="transitionTime">
                {theme === 'artsnob' && 'Temporal Flow:'}
                {theme === 'standard' && 'Transition Time:'}
                {theme === 'minimal' && 'Time:'}
              </label>
              <div className={styles.timeControl}>
                <input
                  type="range"
                  id="transitionTime"
                  min="0"
                  max="60"
                  step="0.1"
                  value={transitionTime}
                  onChange={(e) => setTransitionTime(parseFloat(e.target.value))}
                />
                <span className={styles.timeDisplay}>{formatTime(transitionTime)}</span>
              </div>
            </div>
            
            <div className={styles.transitionHelp}>
              <p>
                {theme === 'artsnob' && 'Set the duration of the temporal journey between states of luminescence.'}
                {theme === 'standard' && 'Set the time to fade between scenes when loading.'}
                {theme === 'minimal' && 'Fade time between scenes.'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scenes list */}
      <h3 className={styles.galleryTitle}>
        {theme === 'artsnob' && 'The Gallery: Luminous Compositions'}
        {theme === 'standard' && 'Saved Scenes'}
        {theme === 'minimal' && 'Scenes'}
      </h3>
      
      {scenes.length === 0 ? (
        <div className={styles.emptyGallery}>
          <i className="fas fa-theater-masks"></i>
          <p>Your gallery awaits illumination. Create your first scene to begin.</p>
        </div>
      ) : (
        <div className={styles.scenesGrid}>
          {scenes.map((scene, index) => (
            <div 
              key={index}
              className={`${styles.sceneCard} ${activeSceneId === scene.name ? styles.active : ''}`}
            >
              <div className={styles.sceneHeader}>
                <h4>{scene.name}</h4>
                <div className={styles.sceneControls}>
                  <button
                    className={styles.loadButton}
                    onClick={() => {
                      loadScene(scene.name)
                      setActiveSceneId(scene.name)
                    }}
                    title="Load Scene"
                  >
                    <i className="fas fa-play"></i>
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete scene "${scene.name}"?`)) {
                        deleteScene(scene.name)
                        if (activeSceneId === scene.name) {
                          setActiveSceneId(null)
                        }
                      }
                    }}
                    title="Delete Scene"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              
              <div className={styles.sceneInfo}>
                <div className={styles.sceneProperty}>
                  <span className={styles.propertyLabel}>OSC:</span>
                  <span className={styles.propertyValue}>{scene.oscAddress}</span>
                </div>
                
                <div className={styles.sceneProperty}>
                  <span className={styles.propertyLabel}>Channels:</span>
                  <span className={styles.propertyValue}>
                    {getActiveChannelCount(scene.channelValues)} active
                  </span>
                </div>
              </div>
              
              <div className={styles.sceneMidiMapping}>
                <MidiLearnButton
                  channelIndex={index}
                  className={styles.sceneMidiButton}
                />
              </div>
              
              <div className={styles.sceneVisualizer}>
                {scene.channelValues.map((value, chIndex) => 
                  value > 0 ? (
                    <div 
                      key={chIndex}
                      className={styles.channelIndicator}
                      style={{ 
                        opacity: value / 255,
                        backgroundColor: getChannelColor(chIndex, value)
                      }}
                      title={`Channel ${chIndex + 1}: ${value}`}
                    />
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper function to generate colors for channel indicators
function getChannelColor(channelIndex: number, value: number): string {
  // Use a different hue based on channel index
  const hue = (channelIndex * 20) % 360
  return `hsl(${hue}, 80%, ${20 + (value / 255) * 60}%)`
}