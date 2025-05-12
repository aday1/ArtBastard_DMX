import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useVisualizationData } from '../../hooks/useVisualizationData';
import styles from './DigitalIlluminationAtelier.module.scss';
const vertexShader = `
  attribute vec4 position;
  attribute vec2 texCoord;
  attribute vec3 particleVelocity;
  varying vec2 vTexCoord;
  varying float vIntensity;
  varying vec3 vColor;
  uniform float uTime;
  
  void main() {
    vTexCoord = texCoord;
    float time = mod(uTime * 0.001, 3.14159 * 2.0);
    
    // Add swirling motion
    vec4 pos = position;
    pos.x += sin(time + position.y) * 0.1;
    pos.y += cos(time + position.x) * 0.1;
    
    // Add particle velocity
    pos.xyz += particleVelocity * time;
    
    gl_Position = pos;
    gl_PointSize = 4.0;
    
    // Pass color based on position
    vColor = vec3(0.5 + sin(time) * 0.5, 
                  0.5 + cos(time * 0.7) * 0.5,
                  0.5 + sin(time * 1.3) * 0.5);
  }
`;
const fragmentShader = `
  precision mediump float;
  uniform sampler2D uDmxTexture;
  uniform sampler2D uMidiTexture;
  uniform sampler2D uOscTexture;
  uniform float uTime;
  varying vec2 vTexCoord;
  varying vec3 vColor;
  
  float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    vec4 dmx = texture2D(uDmxTexture, vTexCoord);
    vec4 midi = texture2D(uMidiTexture, vTexCoord);
    vec4 osc = texture2D(uOscTexture, vTexCoord);
    
    float time = uTime * 0.001;
    
    // Create sparkling effect
    float sparkle = rand(vTexCoord + vec2(time)) * 0.5 + 0.5;
    
    // Combine data intensities
    float intensity = max(max(dmx.r, midi.g), osc.b);
    
    // Create flowing colors
    vec3 baseColor = mix(
      vec3(0.1, 0.2, 0.3),
      vColor,
      intensity + 0.2 * sin(time)
    );
    
    // Add glow and sparkle
    vec3 finalColor = baseColor + vec3(sparkle * intensity * 0.3);
    
    // Add firework-like particles
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.0, dist);
    
    gl_FragColor = vec4(finalColor, alpha * (intensity + 0.2));
  }
`;
export const DigitalIlluminationAtelier = () => {
    const { theme } = useTheme();
    const { data } = useVisualizationData();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showDmx, setShowDmx] = useState(true);
    const [showMidi, setShowMidi] = useState(true);
    const [showOsc, setShowOsc] = useState(true);
    const canvasRef = useRef(null);
    const glRef = useRef(null);
    const programRef = useRef(null);
    const texturesRef = useRef({ dmx: null, midi: null, osc: null });
    const animationRef = useRef(0);
    const startTimeRef = useRef(Date.now());
    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            const container = document.getElementById('visualizer-container');
            if (container) {
                await container.requestFullscreen();
                setIsFullscreen(true);
            }
        }
        else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    };
    const bindTextures = (gl, program) => {
        ['dmx', 'midi', 'osc'].forEach((name, idx) => {
            gl.activeTexture(gl.TEXTURE0 + idx);
            gl.bindTexture(gl.TEXTURE_2D, texturesRef.current[name]);
            const location = gl.getUniformLocation(program, `u${name.charAt(0).toUpperCase()}${name.slice(1)}Texture`);
            gl.uniform1i(location, idx);
        });
    };
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error('WebGL not available');
            return;
        }
        glRef.current = gl;
        const program = createShaderProgram(gl, vertexShader, fragmentShader);
        if (!program)
            return;
        programRef.current = program;
        texturesRef.current = {
            dmx: createDataTexture(gl),
            midi: createDataTexture(gl),
            osc: createDataTexture(gl)
        };
        setupGeometry(gl, program);
        startTimeRef.current = Date.now();
        render();
        return () => {
            cancelAnimationFrame(animationRef.current);
            if (gl) {
                gl.deleteProgram(program);
                Object.values(texturesRef.current).forEach(texture => {
                    if (texture)
                        gl.deleteTexture(texture);
                });
            }
        };
    }, []);
    useEffect(() => {
        const gl = glRef.current;
        if (!gl || !texturesRef.current.dmx)
            return;
        updateTexture(gl, texturesRef.current.dmx, data.dmxValues);
        if (texturesRef.current.midi && data.midiActivity.length > 0) {
            const midiData = new Float32Array(512);
            data.midiActivity.forEach(msg => {
                const idx = msg.channel * 16 + (msg.type === 'noteon' ? 0 : 8);
                midiData[idx] = msg.value ? msg.value / 127 : 0;
            });
            updateTexture(gl, texturesRef.current.midi, midiData);
        }
        if (texturesRef.current.osc && data.oscMessages.length > 0) {
            const oscData = new Float32Array(512);
            data.oscMessages.forEach((msg, i) => {
                oscData[i % 512] = msg.direction === 'out' ? 0.8 : 0.4;
            });
            updateTexture(gl, texturesRef.current.osc, oscData);
        }
    }, [data]);
    // Add keyboard shortcut handling
    useEffect(() => {
        const handleKeyPress = (event) => {
            // Fullscreen toggle with 'F' key
            if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                toggleFullscreen();
            }
            // Toggle visualizations with number keys
            if (!event.ctrlKey && !event.metaKey) {
                switch (event.key) {
                    case '1':
                        setShowDmx(prev => !prev);
                        break;
                    case '2':
                        setShowMidi(prev => !prev);
                        break;
                    case '3':
                        setShowOsc(prev => !prev);
                        break;
                    default:
                        break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);
    // Update shader uniforms based on toggle states
    useEffect(() => {
        const gl = glRef.current;
        const program = programRef.current;
        if (!gl || !program)
            return;
        gl.useProgram(program);
        gl.uniform1i(gl.getUniformLocation(program, 'uShowDmx'), showDmx ? 1 : 0);
        gl.uniform1i(gl.getUniformLocation(program, 'uShowMidi'), showMidi ? 1 : 0);
        gl.uniform1i(gl.getUniformLocation(program, 'uShowOsc'), showOsc ? 1 : 0);
    }, [showDmx, showMidi, showOsc]);
    const render = () => {
        const gl = glRef.current;
        const program = programRef.current;
        if (!gl || !program)
            return;
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        bindTextures(gl, program);
        const timeLocation = gl.getUniformLocation(program, 'uTime');
        gl.uniform1f(timeLocation, Date.now() - startTimeRef.current);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        animationRef.current = requestAnimationFrame(render);
    };
    return (_jsxs("div", { id: "visualizer-container", className: `${styles.digitalIlluminationAtelier} ${isFullscreen ? styles.fullscreen : ''}`, children: [_jsxs("div", { className: styles.header, children: [_jsxs("h2", { className: styles.title, children: [theme === 'artsnob' && 'Digital Illumination Atelier: A Symphony of Light', theme === 'standard' && 'Real-time Visualization', theme === 'minimal' && 'Visualization'] }), _jsxs("div", { className: styles.controls, children: [_jsxs("div", { className: styles.toggles, children: [_jsx("button", { className: `${styles.toggle} ${showDmx ? styles.active : ''}`, onClick: () => setShowDmx(!showDmx), title: `${theme === 'artsnob' ? 'Toggle Luminous Matrix' : 'Toggle DMX'} [Press 1]`, children: theme === 'artsnob' ? 'Luminous Matrix' : 'DMX' }), _jsx("button", { className: `${styles.toggle} ${showMidi ? styles.active : ''}`, onClick: () => setShowMidi(!showMidi), title: `${theme === 'artsnob' ? 'Toggle Digital Orchestra' : 'Toggle MIDI'} [Press 2]`, children: theme === 'artsnob' ? 'Digital Orchestra' : 'MIDI' }), _jsx("button", { className: `${styles.toggle} ${showOsc ? styles.active : ''}`, onClick: () => setShowOsc(!showOsc), title: `${theme === 'artsnob' ? 'Toggle Network Aether' : 'Toggle OSC'} [Press 3]`, children: theme === 'artsnob' ? 'Network Aether' : 'OSC' })] }), _jsxs("button", { className: styles.fullscreenButton, onClick: toggleFullscreen, title: `${isFullscreen ? 'Exit' : 'Enter'} Fullscreen [Press F]`, children: [_jsx("i", { className: `fas fa-${isFullscreen ? 'compress' : 'expand'}` }), theme === 'artsnob' && (_jsx("span", { children: isFullscreen ? 'Contain the Cosmos' : 'Unleash the Infinite Canvas' }))] })] })] }), theme === 'artsnob' && (_jsx("div", { className: styles.description, children: _jsx("p", { className: styles.artDescription, children: "\"Behold as digital signals transmute into pure light and motion. Each DMX value a brushstroke, every MIDI note a shooting star, and OSC messages rippling through the digital aether like waves in the primordial sea of creation. Here, in this sacred digital space, we witness the convergence of technology and artistry in its most sublime form.\"" }) })), _jsx("canvas", { ref: canvasRef, className: styles.canvas, width: 1024, height: 512 })] }));
};
function createShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader)
        return null;
    const program = gl.createProgram();
    if (!program)
        return null;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Failed to link shader program:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}
function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader)
        return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Failed to compile shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
function createDataTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 32, 16, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
}
function updateTexture(gl, texture, data) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 32, 16, gl.RGBA, gl.FLOAT, new Float32Array(data));
}
function setupGeometry(gl, program) {
    const positions = new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
    ]);
    const texCoords = new Float32Array([
        0, 1,
        1, 1,
        0, 0,
        1, 0
    ]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    const texCoordLoc = gl.getAttribLocation(program, 'texCoord');
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
}
