import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import styles from './OscWebGLVisualizer.module.scss';
// Vertex shader for particles
const vertexShaderSource = `
  attribute vec3 aPosition;
  attribute vec3 aVelocity;
  attribute float aLife;
  attribute vec3 aColor;
  attribute float aSize;
  
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  uniform float uTime;
  
  varying vec3 vColor;
  varying float vLife;
  
  void main() {
    float t = mod(uTime + aLife, 1.0);
    vec3 pos = aPosition + aVelocity * t;
    
    // Add some swirl
    float swirl = sin(t * 6.28) * 0.2;
    pos.x += sin(pos.y * 3.0 + uTime) * swirl;
    pos.y += cos(pos.x * 3.0 + uTime) * swirl;
    
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (1.0 - t); // Particles shrink as they age
    
    vColor = aColor;
    vLife = t;
  }
`;
// Fragment shader for particles
const fragmentShaderSource = `
  precision mediump float;
  
  varying vec3 vColor;
  varying float vLife;
  
  void main() {
    // Create circular particles
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    // Soft circle with fade
    float alpha = smoothstep(0.5, 0.3, dist);
    
    // Fade out based on life
    alpha *= 1.0 - vLife;
    
    // Add glow effect
    float glow = smoothstep(1.0, 0.0, dist * 2.0) * 0.5;
    vec3 color = mix(vColor, vec3(1.0), glow);
    
    gl_FragColor = vec4(color, alpha);
  }
`;
export const OscWebGLVisualizer = () => {
    const canvasRef = useRef(null);
    const { socket } = useSocket();
    const [messages, setMessages] = useState([]);
    const messageIdRef = useRef(0);
    const animationRef = useRef(0);
    const programInfoRef = useRef(null);
    const startTimeRef = useRef(Date.now());
    const particlesRef = useRef([]);
    const maxParticles = 1000; // Maximum number of particles
    // Initialize WebGL
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const gl = canvas.getContext('webgl', {
            premultipliedAlpha: false,
            alpha: true
        });
        if (!gl) {
            console.error('WebGL not supported');
            return;
        }
        // Enable blending for particles
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // Create shader program
        const shaderProgram = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
        if (!shaderProgram) {
            console.error('Failed to initialize shader program');
            return;
        }
        // Set up program info
        programInfoRef.current = {
            program: shaderProgram,
            attribLocations: {
                position: gl.getAttribLocation(shaderProgram, 'aPosition'),
                velocity: gl.getAttribLocation(shaderProgram, 'aVelocity'),
                life: gl.getAttribLocation(shaderProgram, 'aLife'),
                color: gl.getAttribLocation(shaderProgram, 'aColor'),
                size: gl.getAttribLocation(shaderProgram, 'aSize'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                time: gl.getUniformLocation(shaderProgram, 'uTime'),
            },
        };
        // Start rendering
        startTimeRef.current = Date.now();
        render();
        return () => {
            cancelAnimationFrame(animationRef.current);
        };
    }, []);
    // Listen for OSC messages
    useEffect(() => {
        if (!socket)
            return;
        const handleOscMessage = (msg) => {
            const isOutgoing = msg.direction === 'out';
            const side = isOutgoing ? 1 : -1;
            // Create particle explosion
            createExplosion(msg.address, isOutgoing ? [1.0, 0.5, 0.2] : [0.2, 1.0, 0.5], side);
            // Add floating message
            const id = messageIdRef.current++;
            const x = 50 + (isOutgoing ? 70 : 0) + Math.random() * 30; // Percentage from left
            const y = 20 + Math.random() * 60; // Percentage from top
            setMessages(prev => [...prev, {
                    id,
                    text: msg.address,
                    x,
                    y,
                    direction: isOutgoing ? 'out' : 'in',
                    fadeOut: false
                }]);
            // Start fade out after 2 seconds
            setTimeout(() => {
                setMessages(prev => prev.map(m => m.id === id ? { ...m, fadeOut: true } : m));
                // Remove message after fade animation
                setTimeout(() => {
                    setMessages(prev => prev.filter(m => m.id !== id));
                }, 300);
            }, 2000);
        };
        socket.on('oscMessage', handleOscMessage);
        socket.on('oscOutgoing', (msg) => handleOscMessage({ ...msg, direction: 'out' }));
        return () => {
            socket.off('oscMessage', handleOscMessage);
            socket.off('oscOutgoing');
        };
    }, [socket]);
    // Create particle explosion
    const createExplosion = (address, baseColor, side) => {
        const numParticles = 50; // Particles per explosion
        const speed = 0.02;
        for (let i = 0; i < numParticles; i++) {
            // Calculate spread angle
            const angle = (Math.random() * Math.PI * 0.5) - Math.PI * 0.25;
            const upward = Math.random() * 0.5 + 0.5; // Bias upward
            // Calculate velocity
            const vx = Math.cos(angle) * speed * side;
            const vy = Math.sin(angle) * speed * upward;
            const vz = (Math.random() - 0.5) * speed * 0.5;
            // Vary colors slightly
            const color = baseColor.map(c => c * (0.8 + Math.random() * 0.4));
            const particle = {
                position: [side * 0.8, -0.8, 0],
                velocity: [vx, vy, vz],
                life: Math.random(),
                color: color,
                size: 10 + Math.random() * 20, // Random size between 10 and 30
            };
            // Add to particles array, removing old ones if needed
            if (particlesRef.current.length >= maxParticles) {
                particlesRef.current.shift(); // Remove oldest particle
            }
            particlesRef.current.push(particle);
        }
    };
    // Initialize shader program
    const initShaderProgram = (gl, vsSource, fsSource) => {
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        if (!vertexShader || !fragmentShader)
            return null;
        const shaderProgram = gl.createProgram();
        if (!shaderProgram)
            return null;
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    };
    // Load shader
    const loadShader = (gl, type, source) => {
        const shader = gl.createShader(type);
        if (!shader)
            return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };
    // Update and render particles
    const render = () => {
        try {
            const canvas = canvasRef.current;
            if (!canvas)
                return;
            const gl = canvas.getContext('webgl');
            if (!gl || !programInfoRef.current)
                return;
            // Update canvas size if needed
            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            const programInfo = programInfoRef.current;
            gl.useProgram(programInfo.program);
            // Set up matrices
            const projectionMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            const modelViewMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
            gl.uniform1f(programInfo.uniformLocations.time, (Date.now() - startTimeRef.current) / 1000);
            // Create buffers for particle data
            const positions = new Float32Array(particlesRef.current.flatMap(p => p.position));
            const velocities = new Float32Array(particlesRef.current.flatMap(p => p.velocity));
            const lives = new Float32Array(particlesRef.current.map(p => p.life));
            const colors = new Float32Array(particlesRef.current.flatMap(p => p.color));
            const sizes = new Float32Array(particlesRef.current.map(p => p.size));
            // Update buffers
            const updateBuffer = (data, attribLocation, size) => {
                const buffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
                gl.vertexAttribPointer(attribLocation, size, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(attribLocation);
            };
            updateBuffer(positions, programInfo.attribLocations.position, 3);
            updateBuffer(velocities, programInfo.attribLocations.velocity, 3);
            updateBuffer(lives, programInfo.attribLocations.life, 1);
            updateBuffer(colors, programInfo.attribLocations.color, 3);
            updateBuffer(sizes, programInfo.attribLocations.size, 1);
            // Draw particles
            gl.drawArrays(gl.POINTS, 0, particlesRef.current.length);
            // Update particle life and remove dead particles
            particlesRef.current = particlesRef.current.filter(p => {
                p.life = (p.life + 0.016) % 1; // Increment life, loop back to 0 at 1
                return p.life > 0; // Keep particle if still alive
            });
            // Continue animation
            animationRef.current = requestAnimationFrame(render);
        }
        catch (error) {
            console.error('Error in WebGL render loop:', error);
            // Don't call requestAnimationFrame if there was an error to prevent error cascade
            setTimeout(() => {
                // Try to restart rendering after a short delay
                animationRef.current = requestAnimationFrame(render);
            }, 2000);
        }
    }; // This inserted brace closes the 'render' arrow function body
    return (_jsxs("div", { className: styles.visualizerContainer, children: [_jsx("canvas", { ref: canvasRef, className: styles.visualizer }), _jsx("div", { className: styles.messageOverlay, children: messages.map(msg => (_jsx("div", { className: `${styles.messageText} ${styles[msg.direction]} ${msg.fadeOut ? styles.fadeOut : ''}`, style: {
                        left: `${msg.x}%`,
                        top: `${msg.y}%`,
                    }, children: msg.text }, msg.id))) })] }));
};
