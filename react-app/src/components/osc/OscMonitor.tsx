\
import React, { useState, useEffect } from 'react';
import styles from './OscMonitor.module.scss';
// Assuming you have a way to receive OSC messages, e.g., via SocketContext
// import { useSocket } from '../../context/SocketContext'; 

interface OscMessage {
  address: string;
  args: any[];
  timestamp: number;
}

const OscMonitor: React.FC = () => {
  const [oscMessages, setOscMessages] = useState<OscMessage[]>([]);
  // const socket = useSocket(); // Example: Replace with your actual OSC data source

  // useEffect(() => {
  //   // Example: Replace with your actual OSC message listener
  //   const handleOscMessage = (message: { address: string; args: any[] }) => {
  //     setOscMessages(prevMessages => [
  //       { ...message, timestamp: Date.now() },
  //       ...prevMessages.slice(0, 19), // Keep last 20 messages
  //     ]);
  //   };

  //   if (socket) {
  //     socket.on('osc_message', handleOscMessage); // Replace 'osc_message' with your event name
  //     return () => {
  //       socket.off('osc_message', handleOscMessage);
  //     };
  //   }
  // }, [socket]);

  return (
    <div className={styles.oscMonitor}>
      <h3>OSC Monitor</h3>
      <div className={styles.messageContainer}>
        {oscMessages.length === 0 && <p>No OSC messages received yet.</p>}
        {oscMessages.map((msg, index) => (
          <div key={index} className={styles.messageItem}>
            <span className={styles.timestamp}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            <span className={styles.address}>{msg.address}</span>
            <span className={styles.args}>{JSON.stringify(msg.args)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OscMonitor;
