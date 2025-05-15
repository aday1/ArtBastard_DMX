/**
 * MIDI Range Testing Utility
 *
 * This file provides utility functions to test the MIDI range limiting feature
 * of the ArtBastard DMX application.
 */
/**
 * Send a simulated MIDI CC message with a specified value
 *
 * @param {number} channel - MIDI channel (0-15)
 * @param {number} controller - CC controller number (0-127)
 * @param {number} value - CC value (0-127)
 */
export function sendTestCCWithValue(channel = 0, controller = 7, value = 0) {
    try {
        if (typeof window !== 'undefined' && window.useStore) {
            // Get access to the store
            const store = window.useStore.getState();
            // Create a MIDI message
            const message = {
                _type: 'cc',
                channel,
                controller,
                value,
                source: 'MIDI Range Test Utility'
            };
            // Add it to the store
            if (store.addMidiMessage) {
                store.addMidiMessage(message);
                console.log(`[MIDI Test] Sent CC message Ch:${channel} CC:${controller} Value:${value}`);
            }
            else {
                console.error('[MIDI Test] Could not access addMidiMessage in store');
            }
        }
        else {
            console.error('[MIDI Test] Could not access global store');
        }
    }
    catch (error) {
        console.error('[MIDI Test] Error sending test CC message:', error);
    }
}
/**
 * Send a sequence of CC values over time to simulate turning a knob
 *
 * @param {number} channel - MIDI channel (0-15)
 * @param {number} controller - CC controller number (0-127)
 * @param {number} startValue - Starting CC value (0-127)
 * @param {number} endValue - Ending CC value (0-127)
 * @param {number} steps - Number of steps between start and end values
 * @param {number} interval - Milliseconds between each step
 */
export function sendCCSequence(channel = 0, controller = 7, startValue = 0, endValue = 127, steps = 20, interval = 100) {
    let currentStep = 0;
    const stepSize = (endValue - startValue) / steps;
    console.log(`[MIDI Test] Starting CC sequence from ${startValue} to ${endValue} in ${steps} steps`);
    const intervalId = setInterval(() => {
        if (currentStep > steps) {
            clearInterval(intervalId);
            console.log('[MIDI Test] CC sequence complete');
            return;
        }
        const value = Math.round(startValue + stepSize * currentStep);
        sendTestCCWithValue(channel, controller, Math.min(127, Math.max(0, value)));
        currentStep++;
    }, interval);
    return intervalId; // Allow caller to cancel if needed
}
/**
 * Test MIDI range limiting by sending sequences with different range configurations
 *
 * @param {number} dmxChannel - DMX channel to test
 * @param {number} midiChannel - MIDI channel (0-15)
 * @param {number} controller - CC controller number (0-127)
 */
export async function testMidiRangeLimiting(dmxChannel = 0, midiChannel = 0, controller = 7) {
    // First make sure we have the midiDmxProcessor available
    if (!window.midiDmxProcessor) {
        console.error('[MIDI Test] midiDmxProcessor not found in window object');
        return;
    }
    console.log('[MIDI Test] Starting MIDI range limiting test sequence');
    // Test 1: Full range (default)
    console.log('[MIDI Test] Test 1: Full range (0-127 → 0-255)');
    window.midiDmxProcessor.setChannelRangeMapping(dmxChannel, {
        inputMin: 0,
        inputMax: 127,
        outputMin: 0,
        outputMax: 255
    });
    await new Promise(resolve => {
        sendCCSequence(midiChannel, controller, 0, 127, 10, 100);
        setTimeout(resolve, 2000);
    });
    // Test 2: Limited output range (0-127 → 100-200)
    console.log('[MIDI Test] Test 2: Limited output range (0-127 → 100-200)');
    window.midiDmxProcessor.setChannelRangeMapping(dmxChannel, {
        inputMin: 0,
        inputMax: 127,
        outputMin: 100,
        outputMax: 200
    });
    await new Promise(resolve => {
        sendCCSequence(midiChannel, controller, 0, 127, 10, 100);
        setTimeout(resolve, 2000);
    });
    // Test 3: Limited input range (30-90 → 0-255)
    console.log('[MIDI Test] Test 3: Limited input range (30-90 → 0-255)');
    window.midiDmxProcessor.setChannelRangeMapping(dmxChannel, {
        inputMin: 30,
        inputMax: 90,
        outputMin: 0,
        outputMax: 255
    });
    await new Promise(resolve => {
        sendCCSequence(midiChannel, controller, 0, 127, 10, 100);
        setTimeout(resolve, 2000);
    });
    // Test 4: Both limited (30-90 → 50-200)
    console.log('[MIDI Test] Test 4: Both limited (30-90 → 50-200)');
    window.midiDmxProcessor.setChannelRangeMapping(dmxChannel, {
        inputMin: 30,
        inputMax: 90,
        outputMin: 50,
        outputMax: 200
    });
    await new Promise(resolve => {
        sendCCSequence(midiChannel, controller, 0, 127, 10, 100);
        setTimeout(resolve, 2000);
    });
    console.log('[MIDI Test] All tests complete');
}
// Make the functions available in the global scope for testing in console
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.midiTests = {
        sendTestCCWithValue,
        sendCCSequence,
        testMidiRangeLimiting
    };
    console.log('[MIDI Test] MIDI testing utilities added to window.midiTests');
}
