/**
 * Helper functions for MIDI debugging
 * 
 * This file contains functions to help debug MIDI functionality
 * by simulating MIDI messages and testing MIDI learn functionality
 */

// Make this file a proper TypeScript module
export {};

/**
 * Simulates a MIDI note-on message being received
 * 
 * @param {number} channel - MIDI channel (0-15)
 * @param {number} note - MIDI note number (0-127)
 * @param {number} velocity - Note velocity (0-127)
 */
export function sendTestNoteOnMessage(channel = 0, note = 60, velocity = 127) {
  if (typeof window === 'undefined' || !window.useStore) {
    console.error('Global store not available for MIDI test');
    return;
  }
  
  console.log(`Sending test MIDI Note On message: channel=${channel}, note=${note}, velocity=${velocity}`);
  
  const testMessage = {
    _type: 'noteon',
    channel,
    note,
    velocity,
    source: 'MIDI Test Function'
  };
  
  try {
    const { addMidiMessage } = window.useStore.getState();
    if (addMidiMessage) {
      addMidiMessage(testMessage);
      console.log('Test MIDI message dispatched to store:', testMessage);
    } else {
      console.error('addMidiMessage not available in store');
    }
  } catch (err) {
    console.error('Error dispatching test MIDI message:', err);
  }
}

/**
 * Simulates a MIDI Control Change (CC) message being received
 * 
 * @param {number} channel - MIDI channel (0-15)
 * @param {number} controller - CC controller number (0-127)
 * @param {number} value - CC value (0-127)
 */
export function sendTestCCMessage(channel = 0, controller = 1, value = 127) {
  if (typeof window === 'undefined' || !window.useStore) {
    console.error('Global store not available for MIDI test');
    return;
  }
  
  console.log(`Sending test MIDI CC message: channel=${channel}, controller=${controller}, value=${value}`);
  
  const testMessage = {
    _type: 'cc',
    channel,
    controller,
    value,
    source: 'MIDI Test Function'
  };
  
  try {
    const { addMidiMessage } = window.useStore.getState();
    if (addMidiMessage) {
      addMidiMessage(testMessage);
      console.log('Test MIDI message dispatched to store:', testMessage);
    } else {
      console.error('addMidiMessage not available in store');
    }
  } catch (err) {
    console.error('Error dispatching test MIDI message:', err);
  }
}

/**
 * Tests the MIDI learn workflow by activating learn mode on a channel
 * and then sending a test MIDI message to map to that channel
 * 
 * @param {number} dmxChannel - DMX channel to map (0-511)
 * @param {string} messageType - Type of MIDI message to send ('note' or 'cc')
 */
export function testMidiLearnWorkflow(dmxChannel = 0, messageType = 'note') {
  if (typeof window === 'undefined' || !window.useStore) {
    console.error('Global store not available for MIDI learn test');
    return;
  }
  
  try {
    // Get functions from store
    const { startMidiLearn } = window.useStore.getState();
    
    if (!startMidiLearn) {
      console.error('startMidiLearn not available in store');
      return;
    }
    
    // Start MIDI learn on the channel
    console.log(`Starting MIDI learn on DMX channel ${dmxChannel}`);
    startMidiLearn(dmxChannel);
    
    // Wait 500ms and then send a test message
    setTimeout(() => {
      if (messageType === 'note') {
        sendTestNoteOnMessage(0, 60, 127);
      } else {
        sendTestCCMessage(0, 7, 127);
      }
      
      // Wait another 500ms and check if mapping was created
      setTimeout(() => {
        const { midiMappings } = window.useStore.getState();
        if (midiMappings && midiMappings[dmxChannel]) {
          console.log(`Success! MIDI mapping created for channel ${dmxChannel}:`, midiMappings[dmxChannel]);
        } else {
          console.error(`Failed to create MIDI mapping for channel ${dmxChannel}`);
        }
      }, 500);
    }, 500);
  } catch (err) {
    console.error('Error in testMidiLearnWorkflow:', err);
  }
}
