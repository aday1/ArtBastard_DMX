import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, useHelper, Html } from '@react-three/drei'; // Added Html import
import { SpotLightHelper, Vector3, Color, Euler } from 'three';
import { useStore } from '../../store';
import styles from './FixtureVisualizer3D.module.scss';
export const FixtureVisualizer3D = () => {
    return (_jsx("div", { className: styles.visualizer3D, children: _jsx(Canvas, { shadows: true, children: _jsx(Scene, {}) }) }));
};
const Scene = () => {
    const fixtures = useStore(state => state.fixtures);
    const dmxChannels = useStore(state => state.dmxChannels);
    return (_jsxs(_Fragment, { children: [_jsx(PerspectiveCamera, { makeDefault: true, position: [0, 5, 10] }), _jsx(OrbitControls, {}), _jsx("ambientLight", { intensity: 0.5 }), _jsx(Grid, { infiniteGrid: true, "position-y": -0.01 }), fixtures.map((fixture, index) => (_jsx(Fixture, { fixture: fixture, dmxChannels: dmxChannels }, index)))] }));
};
const Fixture = ({ fixture, dmxChannels }) => {
    const spotlightRef = useRef(null);
    const [hovered, setHovered] = useState(false);
    // Only show helper when hovered and spotlight exists
    useHelper(hovered ? spotlightRef : null, SpotLightHelper);
    // Calculate color values from DMX channels
    const redChannel = fixture.channels?.findIndex((c) => c.name.toLowerCase().includes('red'));
    const greenChannel = fixture.channels?.findIndex((c) => c.name.toLowerCase().includes('green'));
    const blueChannel = fixture.channels?.findIndex((c) => c.name.toLowerCase().includes('blue'));
    const red = redChannel >= 0 ? dmxChannels[fixture.startChannel + redChannel] / 255 : 0;
    const green = greenChannel >= 0 ? dmxChannels[fixture.startChannel + greenChannel] / 255 : 0;
    const blue = blueChannel >= 0 ? dmxChannels[fixture.startChannel + blueChannel] / 255 : 0;
    // Calculate position from pan/tilt
    const panChannel = fixture.channels?.findIndex((c) => c.name.toLowerCase().includes('pan'));
    const tiltChannel = fixture.channels?.findIndex((c) => c.name.toLowerCase().includes('tilt'));
    const pan = panChannel >= 0 ? (dmxChannels[fixture.startChannel + panChannel] / 255) * Math.PI * 2 : 0;
    const tilt = tiltChannel >= 0 ? (dmxChannels[fixture.startChannel + tiltChannel] / 255) * Math.PI : 0;
    const position = fixture.position || [0, 3, 0];
    const rotation = new Euler(tilt, pan, 0);
    // Calculate intensity
    const intensity = Math.max(red, green, blue);
    return (_jsxs("group", { position: position, rotation: rotation, onPointerOver: () => setHovered(true), onPointerOut: () => setHovered(false), children: [_jsx("spotLight", { ref: spotlightRef, position: new Vector3(0, 0, 0), angle: 0.5, penumbra: 0.5, intensity: intensity * 2, color: new Color(red, green, blue) }), _jsxs("mesh", { children: [_jsx("boxGeometry", { args: [0.3, 0.3, 0.3] }), _jsx("meshStandardMaterial", { color: "red" // Simplified color assignment
                        , roughness: 0.5, metalness: 0.8 })] }), _jsxs("mesh", { position: new Vector3(0, 0, 0.2), children: [_jsx("cylinderGeometry", { args: [0.1, 0.1, 0.1, 32] }), _jsx("meshStandardMaterial", { color: "blue" // Simplified color assignment
                        , roughness: 0.2, metalness: 0.5, transparent: true, opacity: 0.9 })] }), _jsx(Html, { position: new Vector3(0, 0.5, 0), children: _jsx("div", { className: styles.fixtureLabel, children: fixture.name }) })] }));
};
