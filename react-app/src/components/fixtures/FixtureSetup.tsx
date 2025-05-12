import React, { useState } from 'react'
import { useStore } from '../../store'
import useStoreUtils from '../../store/storeUtils'
import { useTheme } from '../../context/ThemeContext'
import { FixtureVisualizer3D } from './FixtureVisualizer3D'
import styles from './FixtureSetup.module.scss'

interface FixtureChannel {
  name: string
  type: 'dimmer' | 'red' | 'green' | 'blue' | 'pan' | 'tilt' | 'gobo' | 'other'
}

interface FixtureFormData {
  name: string
  startAddress: number
  channels: FixtureChannel[]
}

const channelTypes = [
  { value: 'dimmer', label: 'Dimmer/Intensity' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'pan', label: 'Pan' },
  { value: 'tilt', label: 'Tilt' },
  { value: 'gobo', label: 'Gobo' },
  { value: 'other', label: 'Other' }
]

export const FixtureSetup: React.FC = () => {
  const { theme } = useTheme()
  const fixtures = useStore(state => state.fixtures)
  const groups = useStore(state => state.groups)
  
  const [showCreateFixture, setShowCreateFixture] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [fixtureForm, setFixtureForm] = useState<FixtureFormData>({
    name: '',
    startAddress: 1,
    channels: [{ name: 'Intensity', type: 'dimmer' }]
  })
  const [groupForm, setGroupForm] = useState({
    name: '',
    fixtureIndices: [] as number[]
  })
  
  // Handle fixture form changes
  const handleFixtureChange = (key: keyof FixtureFormData, value: any) => {
    setFixtureForm(prev => ({ ...prev, [key]: value }))
  }
  
  // Handle channel changes
  const handleChannelChange = (index: number, key: keyof FixtureChannel, value: any) => {
    const updatedChannels = [...fixtureForm.channels]
    updatedChannels[index] = { ...updatedChannels[index], [key]: value }
    setFixtureForm(prev => ({ ...prev, channels: updatedChannels }))
  }
  
  // Add a new channel to the fixture
  const addChannel = () => {
    setFixtureForm(prev => ({
      ...prev,
      channels: [...prev.channels, { name: `Channel ${prev.channels.length + 1}`, type: 'other' }]
    }))
  }
  
  // Remove a channel from the fixture
  const removeChannel = (index: number) => {
    setFixtureForm(prev => ({
      ...prev,
      channels: prev.channels.filter((_, i) => i !== index)
    }))
  }
  
  // Save fixture to store
  const saveFixture = () => {
    const newFixture = {
      name: fixtureForm.name,
      startAddress: fixtureForm.startAddress,
      channels: fixtureForm.channels
    }
    
    useStoreUtils.setState(state => ({
      fixtures: [...state.fixtures, newFixture]
    }))
    
    // Reset form and hide it
    setFixtureForm({
      name: '',
      startAddress: fixtures.length > 0 
        ? Math.max(...fixtures.map(f => f.startAddress + f.channels.length)) + 1 
        : 1,
      channels: [{ name: 'Intensity', type: 'dimmer' }]
    })
    setShowCreateFixture(false)
    
    // Show success message
    useStoreUtils.getState().showStatusMessage(`Fixture "${newFixture.name}" created`, 'success')
  }
  
  // Toggle fixture selection for group
  const toggleFixtureForGroup = (index: number) => {
    setGroupForm(prev => {
      const isSelected = prev.fixtureIndices.includes(index)
      return {
        ...prev,
        fixtureIndices: isSelected
          ? prev.fixtureIndices.filter(i => i !== index)
          : [...prev.fixtureIndices, index]
      }
    })
  }
  
  // Save group to store
  const saveGroup = () => {
    const newGroup = {
      name: groupForm.name,
      fixtureIndices: [...groupForm.fixtureIndices]
    }
    
    useStoreUtils.setState(state => ({
      groups: [...state.groups, newGroup]
    }))
    
    // Reset form and hide it
    setGroupForm({
      name: '',
      fixtureIndices: []
    })
    setShowCreateGroup(false)
    
    // Show success message
    useStoreUtils.getState().showStatusMessage(`Group "${newGroup.name}" created`, 'success')
  }
  
  return (
    <div className={styles.fixtureSetup}>
      <h2 className={styles.sectionTitle}>
        {theme === 'artsnob' && 'Fixture Composition: The Architecture of Light'}
        {theme === 'standard' && 'Fixture Setup'}
        {theme === 'minimal' && 'Fixtures'}
      </h2>
      
      {/* 3D Fixture Visualizer */}
      <FixtureVisualizer3D />
      
      <div className={styles.setupGrid}>
        {/* Fixture Management Section */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>
              {theme === 'artsnob' && 'Existing Fixtures: The Gallery of Light Instruments'}
              {theme === 'standard' && 'Fixtures'}
              {theme === 'minimal' && 'Fixtures'}
            </h3>
          </div>
          <div className={styles.cardBody}>
            {fixtures.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-lightbulb"></i>
                <p>No fixtures have been created yet</p>
              </div>
            ) : (
              <div className={styles.fixtureList}>
                {fixtures.map((fixture, index) => (
                  <div key={index} className={styles.fixtureItem}>
                    <div className={styles.fixtureHeader}>
                      <h4>{fixture.name}</h4>
                      <span className={styles.fixtureDmx}>
                        DMX: {fixture.startAddress}-{fixture.startAddress + fixture.channels.length - 1}
                      </span>
                    </div>
                    <div className={styles.fixtureChannels}>
                      {fixture.channels.map((channel, chIndex) => (
                        <div key={chIndex} className={styles.channelTag}>
                          <span className={`${styles.channelType} ${styles[channel.type]}`}>
                            {channel.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {showCreateFixture ? (
              <div className={styles.fixtureForm}>
                <h4>
                  {theme === 'artsnob' && 'Create New Fixture: Birth of a Light Vessel'}
                  {theme === 'standard' && 'New Fixture'}
                  {theme === 'minimal' && 'New Fixture'}
                </h4>
                
                <div className={styles.formGroup}>
                  <label htmlFor="fixtureName">Name:</label>
                  <input
                    type="text"
                    id="fixtureName"
                    value={fixtureForm.name}
                    onChange={(e) => handleFixtureChange('name', e.target.value)}
                    placeholder="Enter fixture name"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="fixtureStartAddress">Start Address:</label>
                  <input
                    type="number"
                    id="fixtureStartAddress"
                    value={fixtureForm.startAddress}
                    onChange={(e) => handleFixtureChange('startAddress', parseInt(e.target.value) || 1)}
                    min="1"
                    max="512"
                  />
                </div>
                
                <h5>
                  {theme === 'artsnob' && 'Channels: The Dimensions of Control'}
                  {theme === 'standard' && 'Channels'}
                  {theme === 'minimal' && 'Channels'}
                </h5>
                
                <div className={styles.channelsList}>
                  {fixtureForm.channels.map((channel, index) => (
                    <div key={index} className={styles.channelForm}>
                      <div className={styles.channelFormRow}>
                        <input
                          type="text"
                          value={channel.name}
                          onChange={(e) => handleChannelChange(index, 'name', e.target.value)}
                          placeholder="Channel name"
                        />
                        
                        <select
                          value={channel.type}
                          onChange={(e) => handleChannelChange(index, 'type', e.target.value)}
                        >
                          {channelTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        
                        <button
                          className={styles.removeButton}
                          onClick={() => removeChannel(index)}
                          disabled={fixtureForm.channels.length === 1}
                          title="Remove channel"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className={styles.formActions}>
                  <button 
                    className={styles.addChannelButton} 
                    onClick={addChannel}
                  >
                    <i className="fas fa-plus"></i> Add Channel
                  </button>
                  
                  <div className={styles.saveActions}>
                    <button 
                      className={styles.cancelButton}
                      onClick={() => setShowCreateFixture(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className={styles.saveButton}
                      onClick={saveFixture}
                      disabled={!fixtureForm.name || fixtureForm.channels.length === 0}
                    >
                      <i className="fas fa-save"></i>
                      {theme === 'artsnob' && 'Immortalize Fixture'}
                      {theme === 'standard' && 'Save Fixture'}
                      {theme === 'minimal' && 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                className={styles.createButton}
                onClick={() => {
                  setShowCreateFixture(true)
                  // Set next available DMX address
                  if (fixtures.length > 0) {
                    const lastFixture = fixtures[fixtures.length - 1]
                    const nextAddress = lastFixture.startAddress + lastFixture.channels.length
                    setFixtureForm(prev => ({ ...prev, startAddress: nextAddress }))
                  }
                }}
              >
                <i className="fas fa-plus"></i>
                {theme === 'artsnob' && 'Create New Fixture'}
                {theme === 'standard' && 'Add Fixture'}
                {theme === 'minimal' && 'Add'}
              </button>
            )}
          </div>
        </div>
        
        {/* Group Management Section */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>
              {theme === 'artsnob' && 'Fixture Groups: The Constellations of Light'}
              {theme === 'standard' && 'Groups'}
              {theme === 'minimal' && 'Groups'}
            </h3>
          </div>
          <div className={styles.cardBody}>
            {groups.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-object-group"></i>
                <p>No groups have been created yet</p>
              </div>
            ) : (
              <div className={styles.groupList}>
                {groups.map((group, index) => (
                  <div key={index} className={styles.groupItem}>
                    <div className={styles.groupHeader}>
                      <h4>{group.name}</h4>
                      <span className={styles.groupCount}>
                        {group.fixtureIndices.length} fixture{group.fixtureIndices.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className={styles.groupFixtures}>
                      {group.fixtureIndices.map(fixtureIndex => (
                        <div key={fixtureIndex} className={styles.groupFixtureTag}>
                          {fixtures[fixtureIndex]?.name || `Fixture #${fixtureIndex}`}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {showCreateGroup ? (
              <div className={styles.groupForm}>
                <h4>
                  {theme === 'artsnob' && 'Create Fixture Group: The Collective Expression'}
                  {theme === 'standard' && 'New Group'}
                  {theme === 'minimal' && 'New Group'}
                </h4>
                
                <div className={styles.formGroup}>
                  <label htmlFor="groupName">Name:</label>
                  <input
                    type="text"
                    id="groupName"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter group name"
                  />
                </div>
                
                <h5>
                  {theme === 'artsnob' && 'Select Fixtures: Choose Your Instruments'}
                  {theme === 'standard' && 'Select Fixtures'}
                  {theme === 'minimal' && 'Fixtures'}
                </h5>
                
                {fixtures.length === 0 ? (
                  <p className={styles.noFixturesMessage}>No fixtures available to add to group</p>
                ) : (
                  <div className={styles.fixtureSelection}>
                    {fixtures.map((fixture, index) => (
                      <div 
                        key={index}
                        className={`${styles.selectableFixture} ${
                          groupForm.fixtureIndices.includes(index) ? styles.selected : ''
                        }`}
                        onClick={() => toggleFixtureForGroup(index)}
                      >
                        <div className={styles.fixtureCheckbox}>
                          <input
                            type="checkbox"
                            checked={groupForm.fixtureIndices.includes(index)}
                            onChange={() => {}} // Handled by the div click
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className={styles.fixtureInfo}>
                          <span className={styles.fixtureName}>{fixture.name}</span>
                          <span className={styles.fixtureDmx}>
                            DMX: {fixture.startAddress}-{fixture.startAddress + fixture.channels.length - 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className={styles.formActions}>
                  <button 
                    className={styles.cancelButton}
                    onClick={() => setShowCreateGroup(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.saveButton}
                    onClick={saveGroup}
                    disabled={!groupForm.name || groupForm.fixtureIndices.length === 0}
                  >
                    <i className="fas fa-save"></i>
                    {theme === 'artsnob' && 'Establish Collective'}
                    {theme === 'standard' && 'Save Group'}
                    {theme === 'minimal' && 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className={styles.createButton}
                onClick={() => setShowCreateGroup(true)}
                disabled={fixtures.length === 0}
              >
                <i className="fas fa-plus"></i>
                {theme === 'artsnob' && 'Create Fixture Group'}
                {theme === 'standard' && 'Add Group'}
                {theme === 'minimal' && 'Add'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}