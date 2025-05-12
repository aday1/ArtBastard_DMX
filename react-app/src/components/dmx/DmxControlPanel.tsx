import React, { useState } from 'react'
import { useStore } from '../../store'
import { useTheme } from '../../context/ThemeContext'
import { DmxWebglVisualizer } from './DmxWebglVisualizer'
import { DmxChannel } from './DmxChannel'
import { ColorPalette } from './ColorPalette'
import styles from './DmxControlPanel.module.scss'

export const DmxControlPanel: React.FC = () => {
  const { theme } = useTheme()
  const [filterText, setFilterText] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [channelsPerPage, setChannelsPerPage] = useState(32)
  
  const {
    dmxChannels,
    selectedChannels,
    selectAllChannels,
    deselectAllChannels,
    invertChannelSelection,
  } = useStore((state) => ({
    dmxChannels: state.dmxChannels,
    selectedChannels: state.selectedChannels,
    selectAllChannels: state.selectAllChannels,
    deselectAllChannels: state.deselectAllChannels,
    invertChannelSelection: state.invertChannelSelection,
  }))
  
  // Calculate total pages
  const totalPages = Math.ceil(512 / channelsPerPage)
  
  // Filter and paginate channels
  const startIdx = currentPage * channelsPerPage
  const endIdx = Math.min(startIdx + channelsPerPage, 512)
  const displayedChannels = Array.from({ length: endIdx - startIdx }, (_, i) => i + startIdx)
  
  // Calculate completion for progress bar
  const nonZeroChannels = dmxChannels.filter(val => val > 0).length
  const completion = (nonZeroChannels / 512) * 100
  
  return (
    <div className={styles.dmxControlPanel}>
      <h2 className={styles.sectionTitle}>
        {theme === 'artsnob' && 'DMX Channels: The Elemental Brushstrokes'}
        {theme === 'standard' && 'DMX Channel Control'}
        {theme === 'minimal' && 'DMX Channels'}
      </h2>      {/* WebGL DMX Visualizer - sticky state will be managed by component */}
      <DmxWebglVisualizer sticky={localStorage.getItem('dmxVisualizerSticky') !== 'false'} />
      
      {/* Status bar showing active channels */}
      <div className={styles.statusBar}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${completion}%` }}
          ></div>
        </div>
        <div className={styles.stats}>
          <span>{nonZeroChannels} active channels</span>
          <span>{selectedChannels.length} selected</span>
        </div>
      </div>
      
      {/* Control toolbar */}
      <div className={styles.controlToolbar}>
        <div className={styles.selectionControls}>
          <button onClick={selectAllChannels} className={styles.toolbarButton}>
            <i className="fas fa-check-double"></i>
            {theme !== 'minimal' && <span>Select All</span>}
          </button>
          <button onClick={deselectAllChannels} className={styles.toolbarButton}>
            <i className="fas fa-times"></i>
            {theme !== 'minimal' && <span>Deselect All</span>}
          </button>
          <button onClick={invertChannelSelection} className={styles.toolbarButton}>
            <i className="fas fa-exchange-alt"></i>
            {theme !== 'minimal' && <span>Invert</span>}
          </button>
        </div>
        
        <div className={styles.pageControls}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className={styles.pageButton}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <select 
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className={styles.pageSelect}
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <option key={i} value={i}>
                {i * channelsPerPage + 1}-{Math.min((i + 1) * channelsPerPage, 512)}
              </option>
            ))}
          </select>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1}
            className={styles.pageButton}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        
        <div className={styles.viewControls}>
          <select 
            value={channelsPerPage}
            onChange={(e) => {
              setChannelsPerPage(Number(e.target.value))
              setCurrentPage(0) // Reset to first page when changing view
            }}
            className={styles.viewSelect}
          >
            <option value={16}>16 channels</option>
            <option value={32}>32 channels</option>
            <option value={64}>64 channels</option>
            <option value={128}>128 channels</option>
          </select>
          
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Filter channels..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className={styles.searchInput}
            />
            {filterText && (
              <button 
                onClick={() => setFilterText('')}
                className={styles.clearSearch}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Color palette for selection */}
      <ColorPalette />
      
      {/* DMX Channels grid */}
      <div className={styles.channelsGrid}>
        {displayedChannels.map((index) => (
          <DmxChannel key={index} index={index} />
        ))}
      </div>
      
      {/* Pagination controls at bottom */}
      <div className={styles.pagination}>
        <button 
          onClick={() => setCurrentPage(0)}
          disabled={currentPage === 0}
          className={styles.paginationButton}
        >
          <i className="fas fa-angle-double-left"></i>
        </button>
        <button 
          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
          disabled={currentPage === 0}
          className={styles.paginationButton}
        >
          <i className="fas fa-angle-left"></i>
        </button>
        
        <div className={styles.pageIndicator}>
          Page {currentPage + 1} of {totalPages}
        </div>
        
        <button 
          onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
          disabled={currentPage === totalPages - 1}
          className={styles.paginationButton}
        >
          <i className="fas fa-angle-right"></i>
        </button>
        <button 
          onClick={() => setCurrentPage(totalPages - 1)}
          disabled={currentPage === totalPages - 1}
          className={styles.paginationButton}
        >
          <i className="fas fa-angle-double-right"></i>
        </button>
      </div>
    </div>
  )
}