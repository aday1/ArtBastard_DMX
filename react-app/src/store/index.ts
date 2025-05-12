import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import axios from 'axios'
import { Socket } from 'socket.io-client'

export interface MidiMapping {
  channel: number
  note?: number
  controller?: number
}

export interface Fixture {
  name: string
  startAddress: number
  channels: { name: string; type: string }[]
}

export interface Group {
  name: string
  fixtureIndices: number[]
}

export interface Scene {
  name: string
  channelValues: number[]
  oscAddress: string
  midiMapping?: MidiMapping
}

export interface ArtNetConfig {
  ip: string
  subnet: number
  universe: number
  net: number
  port: number
  base_refresh_interval: number
}

interface State {
  // DMX State
  dmxChannels: number[]
  oscAssignments: string[]
  channelNames: string[]
  selectedChannels: number[]
  
  // MIDI State
  midiInterfaces: string[]
  activeInterfaces: string[]
  midiMappings: Record<number, MidiMapping>
  midiLearnChannel: number | null
  midiLearnScene: string | null
  midiMessages: any[]
  
  // Fixtures and Groups
  fixtures: Fixture[]
  groups: Group[]
  
  // Scenes
  scenes: Scene[]
  
  // ArtNet
  artNetConfig: ArtNetConfig
  artNetStatus: 'connected' | 'disconnected' | 'error' | 'timeout'
  
  // UI State
  theme: 'artsnob' | 'standard' | 'minimal'
  darkMode: boolean
  statusMessage: { text: string; type: 'success' | 'error' | 'info' } | null
  
  // Socket state
  socket: Socket | null
  setSocket: (socket: Socket | null) => void
  
  // Actions
  fetchInitialState: () => Promise<void>
  setDmxChannel: (channel: number, value: number) => void
  selectChannel: (channel: number) => void
  deselectChannel: (channel: number) => void
  toggleChannelSelection: (channel: number) => void
  selectAllChannels: () => void
  deselectAllChannels: () => void
  invertChannelSelection: () => void
  
  // MIDI Actions
  startMidiLearn: (channel: number) => void
  cancelMidiLearn: () => void
  addMidiMapping: (dmxChannel: number, mapping: MidiMapping) => void
  removeMidiMapping: (dmxChannel: number) => void
  clearAllMidiMappings: () => void
  
  // Scene Actions
  saveScene: (name: string, oscAddress: string) => void
  loadScene: (name: string) => void
  deleteScene: (name: string) => void
  
  // Config Actions
  updateArtNetConfig: (config: Partial<ArtNetConfig>) => void
  testArtNetConnection: () => void
  
  // UI Actions
  setTheme: (theme: 'artsnob' | 'standard' | 'minimal') => void
  toggleDarkMode: () => void
  showStatusMessage: (text: string, type: 'success' | 'error' | 'info') => void
  clearStatusMessage: () => void
}

export const useStore = create<State>()(
  devtools(
    (set, get) => ({
      // Initial state
      dmxChannels: new Array(512).fill(0),
      oscAssignments: new Array(512).fill('').map((_, i) => `/fixture/DMX${i + 1}`),
      channelNames: new Array(512).fill('').map((_, i) => `CH ${i + 1}`),
      selectedChannels: [],
      
      midiInterfaces: [],
      activeInterfaces: [],
      midiMappings: {},
      midiLearnChannel: null,
      midiLearnScene: null,
      midiMessages: [],
      
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
      },
      artNetStatus: 'disconnected',
      
      theme: 'artsnob',
      darkMode: true,
      statusMessage: null,
      
      socket: null,
      setSocket: (socket) => set({ socket }),
      
      // Actions
      fetchInitialState: async () => {
        try {
          const response = await axios.get('/api/state', {
            timeout: 5000,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          })
          
          if (response.status === 200 && response.data) {
            const state = response.data
            
            set({
              dmxChannels: state.dmxChannels || new Array(512).fill(0),
              oscAssignments: state.oscAssignments || new Array(512).fill('').map((_, i) => `/fixture/DMX${i + 1}`),
              channelNames: state.channelNames || new Array(512).fill('').map((_, i) => `CH ${i + 1}`),
              fixtures: state.fixtures || [],
              groups: state.groups || [],
              midiMappings: state.midiMappings || {},
              artNetConfig: state.artNetConfig || get().artNetConfig,
              scenes: state.scenes || []
            })

            return // Successfully fetched state
          }
          throw new Error('Invalid response from server')
        } catch (error: any) {
          console.error('Failed to fetch initial state:', error)
          get().showStatusMessage(
            error.code === 'ECONNABORTED' 
              ? 'Connection timeout - please check server status'
              : 'Failed to fetch initial state - using default values',
            'error'
          )
          
          // Set default state if fetch fails
          set({
            dmxChannels: new Array(512).fill(0),
            oscAssignments: new Array(512).fill('').map((_, i) => `/fixture/DMX${i + 1}`),
            channelNames: new Array(512).fill('').map((_, i) => `CH ${i + 1}`),
            fixtures: [],
            groups: [],
            midiMappings: {},
            scenes: []
          })
        }
      },
      
      setDmxChannel: (channel, value) => {
        const dmxChannels = [...get().dmxChannels]
        dmxChannels[channel] = value
        set({ dmxChannels })
        
        // Emit to server
        axios.post('/api/dmx', { channel, value })
          .catch(error => {
            console.error('Failed to update DMX channel:', error)
            get().showStatusMessage('Failed to update DMX channel', 'error')
          })
      },
      
      selectChannel: (channel) => {
        const selectedChannels = [...get().selectedChannels]
        if (!selectedChannels.includes(channel)) {
          selectedChannels.push(channel)
          set({ selectedChannels })
        }
      },
      
      deselectChannel: (channel) => {
        const selectedChannels = get().selectedChannels.filter(ch => ch !== channel)
        set({ selectedChannels })
      },
      
      toggleChannelSelection: (channel) => {
        const selectedChannels = [...get().selectedChannels]
        const index = selectedChannels.indexOf(channel)
        
        if (index === -1) {
          selectedChannels.push(channel)
        } else {
          selectedChannels.splice(index, 1)
        }
        
        set({ selectedChannels })
      },
      
      selectAllChannels: () => {
        const selectedChannels = Array.from({ length: 512 }, (_, i) => i)
        set({ selectedChannels })
      },
      
      deselectAllChannels: () => {
        set({ selectedChannels: [] })
      },
      
      invertChannelSelection: () => {
        const currentSelection = get().selectedChannels
        const allChannels = Array.from({ length: 512 }, (_, i) => i)
        const newSelection = allChannels.filter(ch => !currentSelection.includes(ch))
        set({ selectedChannels: newSelection })
      },
      
      // MIDI Actions
      startMidiLearn: (channel) => {
        set({ midiLearnChannel: channel })
        
        // Emit to server
        axios.post('/api/midi/learn', { channel })
          .catch(error => {
            console.error('Failed to start MIDI learn:', error)
            get().showStatusMessage('Failed to start MIDI learn', 'error')
          })
      },
      
      cancelMidiLearn: () => {
        const channel = get().midiLearnChannel
        set({ midiLearnChannel: null })
        
        if (channel !== null) {
          // Emit to server
          axios.post('/api/midi/cancel-learn', { channel })
            .catch(error => {
              console.error('Failed to cancel MIDI learn:', error)
            })
        }
      },
      
      addMidiMapping: (dmxChannel, mapping) => {
        const midiMappings = { ...get().midiMappings }
        midiMappings[dmxChannel] = mapping
        set({ midiMappings, midiLearnChannel: null })
        
        // Emit to server
        axios.post('/api/midi/mapping', { dmxChannel, mapping })
          .catch(error => {
            console.error('Failed to add MIDI mapping:', error)
            get().showStatusMessage('Failed to add MIDI mapping', 'error')
          })
      },
      
      removeMidiMapping: (dmxChannel) => {
        const midiMappings = { ...get().midiMappings }
        delete midiMappings[dmxChannel]
        set({ midiMappings })
        
        // Emit to server
        axios.delete(`/api/midi/mapping/${dmxChannel}`)
          .catch(error => {
            console.error('Failed to remove MIDI mapping:', error)
            get().showStatusMessage('Failed to remove MIDI mapping', 'error')
          })
      },
      
      clearAllMidiMappings: () => {
        set({ midiMappings: {} })
        
        // Emit to server
        axios.delete('/api/midi/mappings')
          .catch(error => {
            console.error('Failed to clear all MIDI mappings:', error)
            get().showStatusMessage('Failed to clear all MIDI mappings', 'error')
          })
      },
      
      // Scene Actions
      saveScene: (name, oscAddress) => {
        const dmxChannels = get().dmxChannels
        
        // Create a new scene
        const newScene: Scene = {
          name,
          channelValues: [...dmxChannels],
          oscAddress
        }
        
        const scenes = [...get().scenes]
        const existingIndex = scenes.findIndex(s => s.name === name)
        
        if (existingIndex !== -1) {
          scenes[existingIndex] = newScene
        } else {
          scenes.push(newScene)
        }
        
        set({ scenes })
        
        // Emit to server
        axios.post('/api/scenes', newScene)
          .catch(error => {
            console.error('Failed to save scene:', error)
            get().showStatusMessage('Failed to save scene', 'error')
          })
      },
      
      loadScene: (name) => {
        const scenes = get().scenes
        const scene = scenes.find(s => s.name === name)
        
        if (scene) {
          set({ dmxChannels: [...scene.channelValues] })
          
          // Emit to server
          axios.post('/api/scenes/load', { name })
            .catch(error => {
              console.error('Failed to load scene:', error)
              get().showStatusMessage('Failed to load scene', 'error')
            })
        } else {
          get().showStatusMessage(`Scene "${name}" not found`, 'error')
        }
      },
      
      deleteScene: (name) => {
        const scenes = get().scenes.filter(s => s.name !== name)
        set({ scenes })
        
        // Emit to server
        axios.delete(`/api/scenes/${encodeURIComponent(name)}`)
          .catch(error => {
            console.error('Failed to delete scene:', error)
            get().showStatusMessage('Failed to delete scene', 'error')
          })
      },
      
      // Config Actions
      updateArtNetConfig: (config) => {
        const socket = get().socket
        if (socket?.connected) {
          socket.emit('updateArtNetConfig', config)
          set({ artNetConfig: { ...get().artNetConfig, ...config } })
        } else {
          get().showStatusMessage('Cannot update ArtNet config: not connected to server', 'error')
        }
      },

      testArtNetConnection: () => {
        const socket = get().socket
        if (socket?.connected) {
          socket.emit('testArtNetConnection')
          get().showStatusMessage('Testing ArtNet connection...', 'info')
        } else {
          get().showStatusMessage('Cannot test connection: not connected to server', 'error')
        }
      },
      
      // UI Actions
      setTheme: (theme) => {
        set({ theme })
        localStorage.setItem('theme', theme)
      },
      
      toggleDarkMode: () => {
        const darkMode = !get().darkMode
        set({ darkMode })
        localStorage.setItem('darkMode', darkMode.toString())
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
      },
      
      showStatusMessage: (text, type) => {
        set({ statusMessage: { text, type } })
        
        // Auto-clear after 3 seconds
        setTimeout(() => {
          set((state) => {
            if (state.statusMessage?.text === text) {
              return { statusMessage: null }
            }
            return {}
          })
        }, 3000)
      },
      
      clearStatusMessage: () => {
        set({ statusMessage: null })
      }
    }),
    { name: 'artbastard-store' }
  )
)