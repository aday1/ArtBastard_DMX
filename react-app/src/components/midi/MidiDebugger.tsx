import React, { useState } from 'react';
import { useStore } from '../../store';
import { sendTestNoteOnMessage, sendTestCCMessage, testMidiLearnWorkflow } from '../../hooks/useMidiTestUtils';
import styles from './MidiLearnButton.module.scss';

const MidiDebugger: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const midiMessages = useStore(state => state.midiMessages);
  const midiMappings = useStore(state => state.midiMappings);
  const midiLearnChannel = useStore(state => state.midiLearnChannel);

  const toggleDebugger = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={styles.midiDebugger}>
      <button onClick={toggleDebugger} className={styles.debuggerButton}>
        {isOpen ? 'Hide MIDI Debug' : 'Show MIDI Debug'}
      </button>
      
      {isOpen && (
        <div className={styles.debuggerContent}>
          <h3>MIDI Debug Information</h3>
          
          <div className={styles.debugSection}>
            <h4>Current Learn Status</h4>
            <p>Learning Channel: {midiLearnChannel !== null ? midiLearnChannel : 'None'}</p>
          </div>
          
          <div className={styles.debugSection}>
            <h4>MIDI Mappings ({Object.keys(midiMappings).length})</h4>
            <ul>
              {Object.entries(midiMappings).map(([channel, mapping]) => (
                <li key={channel}>
                  Channel {channel}: {mapping.controller !== undefined 
                    ? `CC ${mapping.channel}:${mapping.controller}` 
                    : `Note ${mapping.channel}:${mapping.note}`}
                </li>
              ))}
            </ul>
          </div>
          
          <div className={styles.debugSection}>
            <h4>Recent MIDI Messages ({midiMessages.length})</h4>
            <div className={styles.messagesContainer}>
              {midiMessages.slice(-10).map((message, idx) => (
                <pre key={idx}>
                  {JSON.stringify(message, null, 2)}
                </pre>
              ))}
            </div>
          </div>          <div className={styles.debugSection}>
            <h4>MIDI Test</h4>
            <div className={styles.testButtons}>
              <button 
                onClick={() => sendTestNoteOnMessage(0, 60, 127)}
                className={styles.testButton}
              >
                Send Test Note
              </button>
              <button 
                onClick={() => sendTestCCMessage(0, 7, 127)}
                className={styles.testButton}
              >
                Send Test CC
              </button>
              <button 
                onClick={() => {
                  const channel = prompt('Enter DMX channel to test (0-511):', '0');
                  if (channel !== null) {
                    const dmxChannel = parseInt(channel, 10);
                    if (!isNaN(dmxChannel) && dmxChannel >= 0 && dmxChannel <= 511) {
                      const msgType = prompt('Enter MIDI message type (note/cc):', 'note');
                      testMidiLearnWorkflow(dmxChannel, msgType === 'cc' ? 'cc' : 'note');
                    }
                  }
                }}
                className={styles.testButton}
              >
                Test MIDI Learn Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MidiDebugger;
