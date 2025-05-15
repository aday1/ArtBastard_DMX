import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useStore } from '../../store';
import { sendTestNoteOnMessage, sendTestCCMessage, testMidiLearnWorkflow } from '../../hooks/useMidiTestUtils';
import styles from './MidiLearnButton.module.scss';
const MidiDebugger = () => {
    const [isOpen, setIsOpen] = useState(false);
    const midiMessages = useStore(state => state.midiMessages);
    const midiMappings = useStore(state => state.midiMappings);
    const midiLearnChannel = useStore(state => state.midiLearnChannel);
    const toggleDebugger = () => {
        setIsOpen(!isOpen);
    };
    return (_jsxs("div", { className: styles.midiDebugger, children: [_jsx("button", { onClick: toggleDebugger, className: styles.debuggerButton, children: isOpen ? 'Hide MIDI Debug' : 'Show MIDI Debug' }), isOpen && (_jsxs("div", { className: styles.debuggerContent, children: [_jsx("h3", { children: "MIDI Debug Information" }), _jsxs("div", { className: styles.debugSection, children: [_jsx("h4", { children: "Current Learn Status" }), _jsxs("p", { children: ["Learning Channel: ", midiLearnChannel !== null ? midiLearnChannel : 'None'] })] }), _jsxs("div", { className: styles.debugSection, children: [_jsxs("h4", { children: ["MIDI Mappings (", Object.keys(midiMappings).length, ")"] }), _jsx("ul", { children: Object.entries(midiMappings).map(([channel, mapping]) => (_jsxs("li", { children: ["Channel ", channel, ": ", mapping.controller !== undefined
                                            ? `CC ${mapping.channel}:${mapping.controller}`
                                            : `Note ${mapping.channel}:${mapping.note}`] }, channel))) })] }), _jsxs("div", { className: styles.debugSection, children: [_jsxs("h4", { children: ["Recent MIDI Messages (", midiMessages.length, ")"] }), _jsx("div", { className: styles.messagesContainer, children: midiMessages.slice(-10).map((message, idx) => (_jsx("pre", { children: JSON.stringify(message, null, 2) }, idx))) })] }), "          ", _jsxs("div", { className: styles.debugSection, children: [_jsx("h4", { children: "MIDI Test" }), _jsxs("div", { className: styles.testButtons, children: [_jsx("button", { onClick: () => sendTestNoteOnMessage(0, 60, 127), className: styles.testButton, children: "Send Test Note" }), _jsx("button", { onClick: () => sendTestCCMessage(0, 7, 127), className: styles.testButton, children: "Send Test CC" }), _jsx("button", { onClick: () => {
                                            const channel = prompt('Enter DMX channel to test (0-511):', '0');
                                            if (channel !== null) {
                                                const dmxChannel = parseInt(channel, 10);
                                                if (!isNaN(dmxChannel) && dmxChannel >= 0 && dmxChannel <= 511) {
                                                    const msgType = prompt('Enter MIDI message type (note/cc):', 'note');
                                                    testMidiLearnWorkflow(dmxChannel, msgType === 'cc' ? 'cc' : 'note');
                                                }
                                            }
                                        }, className: styles.testButton, children: "Test MIDI Learn Workflow" })] })] })] }))] }));
};
export default MidiDebugger;
