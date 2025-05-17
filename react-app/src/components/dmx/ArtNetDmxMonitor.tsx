\
import React, { useState, useEffect } from 'react';
import styles from './ArtNetDmxMonitor.module.scss';
// Assuming you have a way to receive Art-Net DMX data, e.g., via SocketContext
// import { useSocket } from '../../context/SocketContext';

interface DmxChannelData {
  channel: number;
  value: number;
}

interface ArtNetPacket {
  universe: number;
  data: DmxChannelData[]; // Or simply number[] if you get raw DMX values
  timestamp: number;
}

const ArtNetDmxMonitor: React.FC = () => {
  const [dmxPackets, setDmxPackets] = useState<ArtNetPacket[]>([]);
  const [activeUniverse, setActiveUniverse] = useState<number>(0); // Example: default to universe 0
  // const socket = useSocket(); // Example: Replace with your actual Art-Net data source

  // useEffect(() => {
  //   // Example: Replace with your actual Art-Net message listener
  //   const handleArtNetData = (packet: { universe: number; data: number[] /* or DmxChannelData[] */ }) => {
  //     // For simplicity, this example assumes data is an array of numbers (DMX values)
  //     // You might need to transform it into DmxChannelData[] if your source provides it differently
  //     const formattedData: DmxChannelData[] = packet.data.map((value, index) => ({ channel: index + 1, value }));
      
  //     setDmxPackets(prevPackets => [
  //       { universe: packet.universe, data: formattedData, timestamp: Date.now() },
  //       ...prevPackets.filter(p => p.universe !== packet.universe).slice(0, 4), // Keep last 5 unique universes or packets
  //     ]);
  //     if(packet.universe === activeUniverse) {
  //       // If the incoming packet is for the active universe, update immediately
  //       // This part might need more sophisticated state management if you want to display multiple universes
  //       // or a specific one selected by the user.
  //     }
  //   };

  //   if (socket) {
  //     socket.on('artnet_data', handleArtNetData); // Replace 'artnet_data' with your event name
  //     return () => {
  //       socket.off('artnet_data', handleArtNetData);
  //     };
  //   }
  // }, [socket, activeUniverse]);

  const currentPacket = dmxPackets.find(p => p.universe === activeUniverse);

  return (
    <div className={styles.artNetDmxMonitor}>
      <h3>Art-Net DMX Monitor (Universe: {activeUniverse})</h3>
      {/* Add a way to select universe if needed */}
      {/* <select onChange={(e) => setActiveUniverse(Number(e.target.value))} value={activeUniverse}>
        {[...new Set(dmxPackets.map(p => p.universe))].sort((a,b) => a-b).map(u => 
          <option key={u} value={u}>Universe {u}</option>
        )}
      </select> */} 
      <div className={styles.channelGrid}>
        {currentPacket ? (
          currentPacket.data.map(ch => (
            <div key={ch.channel} className={styles.channelItem}>
              <div className={styles.channelNumber}>{ch.channel}</div>
              <div className={styles.channelValue}>{ch.value}</div>
              <div className={styles.valueBarContainer}>
                <div 
                  className={styles.valueBar}
                  style={{ width: `${(ch.value / 255) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p>No Art-Net DMX data received for universe {activeUniverse} yet.</p>
        )}
      </div>
    </div>
  );
};

export default ArtNetDmxMonitor;
