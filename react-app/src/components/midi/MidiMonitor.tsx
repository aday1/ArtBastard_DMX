import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import styles from './MidiMonitor.module.scss';

export const MidiMonitor: React.FC = () => {
  const midiMessages = useStore(state => state.midiMessages);
  const [lastMessages, setLastMessages] = useState<Array<any>>([]);
  const [visible, setVisible] = useState(true);
  const [flashActive, setFlashActive] = useState(false);

  // Update the displayed messages when new MIDI messages arrive
  useEffect(() => {
    if (midiMessages.length > 0) {
      // Get the last 5 messages (or fewer if less are available)
      const recentMessages = midiMessages.slice(-5);
      setLastMessages(recentMessages);
      
      // Flash the monitor to indicate new activity
      setFlashActive(true);
      const timer = setTimeout(() => setFlashActive(false), 200);
      return () => clearTimeout(timer);
    }
  }, [midiMessages]);

  // No messages to display
  if (lastMessages.length === 0) {
    return (
      <div className={`${styles.midiMonitor} ${visible ? '' : styles.collapsed}`}>
        <div className={styles.header} onClick={() => setVisible(!visible)}>
          <span className={styles.title}>MIDI Monitor</span>
          <span className={styles.toggle}>{visible ? '▼' : '◀'}</span>
        </div>
        {visible && (
          <div className={styles.content}>
            <p className={styles.noData}>No MIDI messages received yet.</p>
            <p className={styles.noData}>Try moving controls on your MIDI device.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.midiMonitor} ${flashActive ? styles.flash : ''} ${visible ? '' : styles.collapsed}`}>
      <div className={styles.header} onClick={() => setVisible(!visible)}>
        <span className={styles.title}>MIDI Monitor</span>
        <span className={styles.status}>Recent: {midiMessages.length}</span>
        <span className={styles.toggle}>{visible ? '▼' : '◀'}</span>
      </div>
      {visible && (
        <div className={styles.content}>
          {lastMessages.map((msg, index) => (
            <div key={index} className={styles.messageRow}>
              {msg._type === 'cc' && (
                <>
                  <span className={styles.type}>CC</span>
                  <span className={styles.channel}>Ch {msg.channel + 1}</span>
                  <span className={styles.controller}>CC {msg.controller}</span>
                  <span className={styles.value}>{msg.value}</span>
                  <span className={styles.source}>{msg.source}</span>
                </>
              )}
              {msg._type === 'noteon' && (
                <>
                  <span className={styles.type}>Note</span>
                  <span className={styles.channel}>Ch {msg.channel + 1}</span>
                  <span className={styles.note}>Note {msg.note}</span>
                  <span className={styles.velocity}>Vel {msg.velocity}</span>
                  <span className={styles.source}>{msg.source}</span>
                </>
              )}
              {msg._type !== 'cc' && msg._type !== 'noteon' && (
                <span>Other: {JSON.stringify(msg)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MidiMonitor;
