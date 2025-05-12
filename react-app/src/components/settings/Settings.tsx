import React, { useState, useEffect } from 'react'
import { useStore } from '../../store'
import useStoreUtils from '../../store/storeUtils'
import { useTheme } from '../../context/ThemeContext'
import { useSocket } from '../../context/SocketContext'
import { Socket } from 'socket.io-client'
import styles from './Settings.module.scss'

export const Settings: React.FC = () => {
  const { theme, setTheme, darkMode, toggleDarkMode } = useTheme()
  const { socket, connected } = useSocket()
  
  const { artNetConfig } = useStore(state => ({
    artNetConfig: state.artNetConfig
  }))
  
  const [artNetSettings, setArtNetSettings] = useState({ ...artNetConfig })
  const [exportInProgress, setExportInProgress] = useState(false)
  const [importInProgress, setImportInProgress] = useState(false)
  
  // Update ArtNet configuration
  const updateArtNetConfig = () => {
    try {
      useStoreUtils.getState().updateArtNetConfig(artNetSettings)
      useStoreUtils.getState().showStatusMessage('ArtNet configuration updated - testing connection...', 'info')
      
      // Test connection after update
      if (socket && connected) {
        (socket as any).emit('testArtNetConnection', artNetSettings.ip)
      }
    } catch (error) {
      useStoreUtils.getState().showStatusMessage(`Failed to update ArtNet config: ${error}`, 'error')
    }
  }

  // Handle ArtNet settings change
  const handleArtNetChange = (key: keyof typeof artNetSettings, value: any) => {
    setArtNetSettings(prev => ({ ...prev, [key]: value }))
  }
  
  // Export all settings
  const exportSettings = () => {
    setExportInProgress(true)
    
    if (socket && connected) {
      // Type assertion for socket.emit
      (socket as any).emit('exportSettings')
      
      // Type assertion to avoid TypeScript error with socket.once
      (socket as any).once('settingsExported', (filePath: string) => {
        useStoreUtils.getState().showStatusMessage(`Settings exported to ${filePath}`, 'success')
        setExportInProgress(false)
      })
      
      (socket as any).once('exportError', (error: string) => {
        useStoreUtils.getState().showStatusMessage(`Export error: ${error}`, 'error')
        setExportInProgress(false)
      })
    } else {
      useStoreUtils.getState().showStatusMessage('Cannot export settings: not connected to server', 'error')
      setExportInProgress(false)
    }
  }
  
  // Import settings
  const importSettings = () => {
    if (!window.confirm('Importing settings will overwrite your current configuration. Continue?')) {
      return
    }
    
    setImportInProgress(true)
    
    if (socket && connected) {
      // Type assertion for socket.emit
      (socket as any).emit('importSettings')
      
      (socket as any).once('settingsImported', (data: any) => {
        // Update store with imported data
        useStoreUtils.setState({
          artNetConfig: data.artNetConfig || artNetConfig,
          midiMappings: data.midiMappings || {},
          scenes: data.scenes || []
        })
        
        setArtNetSettings(data.artNetConfig || artNetConfig)
        useStoreUtils.getState().showStatusMessage('Settings imported successfully', 'success')
        setImportInProgress(false)
      })
      
      (socket as any).once('importError', (error: string) => {
        useStoreUtils.getState().showStatusMessage(`Import error: ${error}`, 'error')
        setImportInProgress(false)
      })
    } else {
      useStoreUtils.getState().showStatusMessage('Cannot import settings: not connected to server', 'error')
      setImportInProgress(false)
    }
  }
  
  // Test ArtNet connection
  const testArtNetConnection = () => {
    if (socket && connected) {
      // Type assertion for socket.emit
      (socket as any).emit('testArtNetConnection', artNetSettings.ip)
      useStore.getState().showStatusMessage('Testing ArtNet connection...', 'info')
    } else {
      useStore.getState().showStatusMessage('Cannot test connection: not connected to server', 'error')
    }
  }

  // Handle ArtNet status changes
  useEffect(() => {
    if (!socket) return

    const handleArtNetStatus = (status: { status: string; message?: string }) => {
      switch (status.status) {
        case 'alive':
          useStore.getState().showStatusMessage('ArtNet device is responding', 'success')
          break
        case 'unreachable':
          useStore.getState().showStatusMessage(
            status.message || 'ArtNet device is not responding',
            'error'
          )
          break
        case 'timeout':
          useStore.getState().showStatusMessage(
            'Connection attempt timed out - check IP and network',
            'error'
          )
          break
        case 'error':
          useStore.getState().showStatusMessage(
            `ArtNet error: ${status.message || 'Unknown error'}`,
            'error'
          )
          break
      }
    }

    // Type assertion for socket.on and socket.off
    (socket as any).on('artnetStatus', handleArtNetStatus)
    return () => {
      (socket as any).off('artnetStatus', handleArtNetStatus)
    }
  }, [socket])
  
  return (
    <div className={styles.settings}>
      <h2 className={styles.sectionTitle}>
        {theme === 'artsnob' && 'Avant-Garde Settings: The Technical Underpinnings'}
        {theme === 'standard' && 'Settings'}
        {theme === 'minimal' && 'Settings'}
      </h2>
      
      <div className={styles.settingsGrid}>
        {/* ArtNet Configuration */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>
              {theme === 'artsnob' && 'ArtNet Configuration: The Network of Light'}
              {theme === 'standard' && 'ArtNet Configuration'}
              {theme === 'minimal' && 'ArtNet'}
            </h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label htmlFor="artnetIp">IP Address:</label>
              <input
                type="text"
                id="artnetIp"
                value={artNetSettings.ip}
                onChange={(e) => handleArtNetChange('ip', e.target.value)}
                placeholder="192.168.1.199"
              />
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="artnetSubnet">Subnet:</label>
                <input
                  type="number"
                  id="artnetSubnet"
                  value={artNetSettings.subnet}
                  onChange={(e) => handleArtNetChange('subnet', parseInt(e.target.value))}
                  min="0"
                  max="15"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="artnetUniverse">Universe:</label>
                <input
                  type="number"
                  id="artnetUniverse"
                  value={artNetSettings.universe}
                  onChange={(e) => handleArtNetChange('universe', parseInt(e.target.value))}
                  min="0"
                  max="15"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="artnetNet">Net:</label>
                <input
                  type="number"
                  id="artnetNet"
                  value={artNetSettings.net}
                  onChange={(e) => handleArtNetChange('net', parseInt(e.target.value))}
                  min="0"
                  max="127"
                />
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="artnetPort">Port:</label>
              <input
                type="number"
                id="artnetPort"
                value={artNetSettings.port}
                onChange={(e) => handleArtNetChange('port', parseInt(e.target.value))}
                min="1024"
                max="65535"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="artnetRefresh">Refresh Interval (ms):</label>
              <input
                type="number"
                id="artnetRefresh"
                value={artNetSettings.base_refresh_interval}
                onChange={(e) => handleArtNetChange('base_refresh_interval', parseInt(e.target.value))}
                min="33"
                max="5000"
              />
            </div>
            
            <div className={styles.buttonGroup}>
              <button
                className={styles.primaryButton}
                onClick={updateArtNetConfig}
              >
                <i className="fas fa-save"></i>
                {theme === 'artsnob' && 'Commit Configuration'}
                {theme === 'standard' && 'Save Configuration'}
                {theme === 'minimal' && 'Save'}
              </button>
              
              <button
                className={styles.secondaryButton}
                onClick={testArtNetConnection}
              >
                <i className="fas fa-network-wired"></i>
                {theme === 'artsnob' && 'Test Connection'}
                {theme === 'standard' && 'Test Connection'}
                {theme === 'minimal' && 'Test'}
              </button>
            </div>
          </div>
        </div>
        
        {/* UI Theme Settings */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>
              {theme === 'artsnob' && 'Interface Aesthetic: Visual Vocabulary'}
              {theme === 'standard' && 'Interface Theme'}
              {theme === 'minimal' && 'Theme'}
            </h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label htmlFor="themeSelect">Theme:</label>
              <div className={styles.themeOptions}>
                <div 
                  className={`${styles.themeOption} ${theme === 'artsnob' ? styles.active : ''}`}
                  onClick={() => setTheme('artsnob')}
                >
                  <div className={styles.themePreview} data-theme="artsnob">
                    <div className={styles.themePreviewHeader}></div>
                    <div className={styles.themePreviewBody}>
                      <div className={styles.themePreviewLine}></div>
                      <div className={styles.themePreviewLine}></div>
                    </div>
                  </div>
                  <span className={styles.themeName}>Art Critic</span>
                </div>
                
                <div 
                  className={`${styles.themeOption} ${theme === 'standard' ? styles.active : ''}`}
                  onClick={() => setTheme('standard')}
                >
                  <div className={styles.themePreview} data-theme="standard">
                    <div className={styles.themePreviewHeader}></div>
                    <div className={styles.themePreviewBody}>
                      <div className={styles.themePreviewLine}></div>
                      <div className={styles.themePreviewLine}></div>
                    </div>
                  </div>
                  <span className={styles.themeName}>Standard</span>
                </div>
                
                <div 
                  className={`${styles.themeOption} ${theme === 'minimal' ? styles.active : ''}`}
                  onClick={() => setTheme('minimal')}
                >
                  <div className={styles.themePreview} data-theme="minimal">
                    <div className={styles.themePreviewHeader}></div>
                    <div className={styles.themePreviewBody}>
                      <div className={styles.themePreviewLine}></div>
                      <div className={styles.themePreviewLine}></div>
                    </div>
                  </div>
                  <span className={styles.themeName}>Minimal</span>
                </div>
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="colorModeToggle">Color Mode:</label>
              <div className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  id="colorModeToggle"
                  checked={darkMode}
                  onChange={toggleDarkMode}
                />
                <label htmlFor="colorModeToggle" className={styles.toggleLabel}>
                  <span className={styles.toggleDot}>
                    <i className={`fas ${darkMode ? 'fa-moon' : 'fa-sun'}`}></i>
                  </span>
                  <span className={styles.toggleText}>
                    {darkMode ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </label>
              </div>
            </div>
            
            <div className={styles.themeDescription}>
              {theme === 'artsnob' && (
                <p>The "Art Critic" theme adopts the verbose, pretentious language and aesthetic of a French art critic, with elaborate descriptions and artistic flourishes.</p>
              )}
              {theme === 'standard' && (
                <p>The "Standard" theme provides a professional, direct interface for DMX control with technical terminology and a functional industrial appearance.</p>
              )}
              {theme === 'minimal' && (
                <p>The "Minimal" theme reduces all text to the essential minimum, focusing solely on core functionality with a clean, uncluttered design.</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Configuration Management */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>
              {theme === 'artsnob' && 'Configuration Management: Preserving Brilliance'}
              {theme === 'standard' && 'Configuration Management'}
              {theme === 'minimal' && 'Config'}
            </h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.configActions}>
              <button
                className={styles.primaryButton}
                onClick={exportSettings}
                disabled={exportInProgress || !connected}
              >
                {exportInProgress ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-download"></i>
                )}
                {theme === 'artsnob' && 'Archive All Settings'}
                {theme === 'standard' && 'Export Settings'}
                {theme === 'minimal' && 'Export'}
              </button>
              
              <button
                className={styles.secondaryButton}
                onClick={importSettings}
                disabled={importInProgress || !connected}
              >
                {importInProgress ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-upload"></i>
                )}
                {theme === 'artsnob' && 'Resurrect Settings'}
                {theme === 'standard' && 'Import Settings'}
                {theme === 'minimal' && 'Import'}
              </button>
              
              <button
                className={styles.dangerButton}
                onClick={() => {
                  if (window.confirm('This will reset all settings to default values. Are you sure?')) {
                    // Reset everything to defaults
                    useStore.setState({
                      dmxChannels: new Array(512).fill(0),
                      midiMappings: {},
                      fixtures: [],
                      groups: [],
                      scenes: [],
                      artNetConfig: {
                        ip: "192.168.1.199",
                        subnet: 0,
                        universe: 0,
                        net: 0,
                        port: 6454,
                        base_refresh_interval: 1000
                      }
                    })
                    
                    setArtNetSettings({
                      ip: "192.168.1.199",
                      subnet: 0,
                      universe: 0,
                      net: 0,
                      port: 6454,
                      base_refresh_interval: 1000
                    })
                    
                    useStore.getState().showStatusMessage('All settings reset to defaults', 'success')
                  }
                }}
              >
                <i className="fas fa-bomb"></i>
                {theme === 'artsnob' && 'Obliterate All Settings'}
                {theme === 'standard' && 'Reset to Default'}
                {theme === 'minimal' && 'Reset'}
              </button>
            </div>
            
            <div className={styles.configNote}>
              <i className="fas fa-info-circle"></i>
              <p>
                {theme === 'artsnob' 
                  ? 'The archive preserves your artistic configurations for future resurrections.' 
                  : 'Export saves all your configurations to a file for backup or transfer.'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Performance Settings */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>
              {theme === 'artsnob' && 'Performance Calibration: The Artistry of Efficiency'}
              {theme === 'standard' && 'Performance Settings'}
              {theme === 'minimal' && 'Performance'}
            </h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label>Graphics Quality:</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="graphicsQuality"
                    value="high"
                    defaultChecked
                  />
                  <span>
                    {theme === 'artsnob' ? 'Sublime Fidelity' : 'High'}
                  </span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="graphicsQuality"
                    value="medium"
                  />
                  <span>
                    {theme === 'artsnob' ? 'Balanced Expression' : 'Medium'}
                  </span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="graphicsQuality"
                    value="low"
                  />
                  <span>
                    {theme === 'artsnob' ? 'Essential Form' : 'Low'}
                  </span>
                </label>
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="enableWebGL">WebGL Visualizations:</label>
              <div className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  id="enableWebGL"
                  defaultChecked
                />
                <label htmlFor="enableWebGL" className={styles.toggleLabel}>
                  <span className={styles.toggleDot}></span>
                  <span className={styles.toggleText}>
                    {theme === 'artsnob' ? 'Computational Canvas Enabled' : 'Enabled'}
                  </span>
                </label>
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="enable3D">3D Fixture Visualization:</label>
              <div className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  id="enable3D"
                  defaultChecked
                />
                <label htmlFor="enable3D" className={styles.toggleLabel}>
                  <span className={styles.toggleDot}></span>
                  <span className={styles.toggleText}>
                    {theme === 'artsnob' ? 'Spatial Rendering Enabled' : 'Enabled'}
                  </span>
                </label>
              </div>
            </div>
            
            <div className={styles.performanceNote}>
              <i className="fas fa-lightbulb"></i>
              <p>
                {theme === 'artsnob' 
                  ? 'Adjusting these parameters allows for the optimization of the computational aesthetic experience.' 
                  : 'Lower settings improve performance on less powerful devices.'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.aboutSection}>
        <h3>
          {theme === 'artsnob' && 'About This Digital Atelier'}
          {theme === 'standard' && 'About ArtBastard DMX512FTW'}
          {theme === 'minimal' && 'About'}
        </h3>
        
        <p className={styles.versionInfo}>
          Version 2.0.0 - React Edition with WebGL
        </p>
        
        <p className={styles.aboutText}>
          {theme === 'artsnob' 
            ? 'ArtBastard DMX512FTW represents the convergence of technological prowess and artistic vision, manifesting as a sublime digital interface for the orchestration of luminescent expressions.'
            : 'ArtBastard DMX512FTW is an advanced DMX lighting controller with MIDI integration, WebGL visualization, and 3D fixture placement.'}
        </p>
        
        <p className={styles.copyright}>
          &copy; 2025 ArtBastard Studio
        </p>
      </div>
    </div>
  )
}