import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store';
import { useSocket } from '../context/SocketContext';
export const useVisualizationData = () => {
    const { socket } = useSocket();
    const dmxChannels = useStore(state => state.dmxChannels);
    const midiMessages = useStore(state => state.midiMessages);
    const [visualizationData, setVisualizationData] = useState({
        dmxValues: new Array(512).fill(0),
        midiActivity: [],
        oscMessages: []
    });
    // Update DMX values
    useEffect(() => {
        setVisualizationData(prev => ({
            ...prev,
            dmxValues: [...dmxChannels]
        }));
    }, [dmxChannels]);
    // Handle MIDI messages
    useEffect(() => {
        if (midiMessages.length > 0) {
            const latestMessage = midiMessages[midiMessages.length - 1];
            setVisualizationData(prev => ({
                ...prev,
                midiActivity: [
                    ...prev.midiActivity.slice(-50),
                    {
                        timestamp: Date.now(),
                        type: latestMessage._type,
                        channel: latestMessage.channel,
                        value: latestMessage.value || latestMessage.velocity
                    }
                ]
            }));
        }
    }, [midiMessages]);
    // Handle OSC messages
    useEffect(() => {
        if (!socket)
            return;
        const handleOscMessage = (msg) => {
            setVisualizationData(prev => ({
                ...prev,
                oscMessages: [
                    ...prev.oscMessages.slice(-50),
                    {
                        timestamp: Date.now(),
                        address: msg.address,
                        direction: msg.direction || 'in',
                        args: msg.args
                    }
                ]
            }));
        };
        socket.on('oscMessage', handleOscMessage);
        socket.on('oscOutgoing', (msg) => handleOscMessage({ ...msg, direction: 'out' }));
        return () => {
            socket.off('oscMessage', handleOscMessage);
            socket.off('oscOutgoing');
        };
    }, [socket]);
    // Clear data
    const clearData = useCallback(() => {
        setVisualizationData({
            dmxValues: new Array(512).fill(0),
            midiActivity: [],
            oscMessages: []
        });
    }, []);
    return {
        data: visualizationData,
        clearData
    };
};
