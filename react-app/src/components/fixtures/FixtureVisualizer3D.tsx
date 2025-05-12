import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera, useHelper, Html } from '@react-three/drei' // Added Html import
import { SpotLightHelper, Vector3, Color, Euler } from 'three'
import { useStore } from '../../store'
import styles from './FixtureVisualizer3D.module.scss'

interface ChannelType {
  name: string;
  // Add other channel properties as needed
}

export const FixtureVisualizer3D: React.FC = () => {
  return (
    <div className={styles.visualizer3D}>
      <Canvas shadows>
        <Scene />
      </Canvas>
    </div>
  )
}

const Scene: React.FC = () => {
  const fixtures = useStore(state => state.fixtures)
  const dmxChannels = useStore(state => state.dmxChannels)
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 10]} />
      <OrbitControls />
      <ambientLight intensity={0.5} />
      
      <Grid infiniteGrid position-y={-0.01} />
      
      {fixtures.map((fixture, index) => (
        <Fixture key={index} fixture={fixture} dmxChannels={dmxChannels} />
      ))}
    </>
  )
}

interface FixtureProps {
  fixture: any;
  dmxChannels: number[];
  key?: any;
}

const Fixture: React.FC<FixtureProps> = ({ fixture, dmxChannels }) => {
  const spotlightRef = useRef<any>(null)
  const [hovered, setHovered] = useState(false)
  
  // Only show helper when hovered and spotlight exists
  useHelper(hovered ? spotlightRef : null, SpotLightHelper)
  
  // Calculate color values from DMX channels
  const redChannel = fixture.channels?.findIndex((c: ChannelType) => c.name.toLowerCase().includes('red'))
  const greenChannel = fixture.channels?.findIndex((c: ChannelType) => c.name.toLowerCase().includes('green'))
  const blueChannel = fixture.channels?.findIndex((c: ChannelType) => c.name.toLowerCase().includes('blue'))
  
  const red = redChannel >= 0 ? dmxChannels[fixture.startChannel + redChannel] / 255 : 0
  const green = greenChannel >= 0 ? dmxChannels[fixture.startChannel + greenChannel] / 255 : 0
  const blue = blueChannel >= 0 ? dmxChannels[fixture.startChannel + blueChannel] / 255 : 0
  
  // Calculate position from pan/tilt
  const panChannel = fixture.channels?.findIndex((c: ChannelType) => c.name.toLowerCase().includes('pan'))
  const tiltChannel = fixture.channels?.findIndex((c: ChannelType) => c.name.toLowerCase().includes('tilt'))
  
  const pan = panChannel >= 0 ? (dmxChannels[fixture.startChannel + panChannel] / 255) * Math.PI * 2 : 0
  const tilt = tiltChannel >= 0 ? (dmxChannels[fixture.startChannel + tiltChannel] / 255) * Math.PI : 0
  
  const position = fixture.position || [0, 3, 0]
  const rotation = new Euler(tilt, pan, 0)
  
  // Calculate intensity
  const intensity = Math.max(red, green, blue)
  
  return (
    <group
      position={position as any}
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Light beam */}
      <spotLight
        ref={spotlightRef}
        position={new Vector3(0, 0, 0)}
        angle={0.5}
        penumbra={0.5}
        intensity={intensity * 2}
        color={new Color(red, green, blue)}
      />
      
      {/* Fixture body */}
      <mesh>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial
          color="red" // Simplified color assignment
          roughness={0.5}
          metalness={0.8}
        />
      </mesh>
      
      {/* Light lens */}
      <mesh position={new Vector3(0, 0, 0.2)}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 32]} />
        <meshStandardMaterial
          color="blue" // Simplified color assignment
          roughness={0.2}
          metalness={0.5}
          transparent={true}
          opacity={0.9}
        />
      </mesh>
      
      {/* Fixture name label */}
      <Html 
        position={new Vector3(0, 0.5, 0)}
        children={<div className={styles.fixtureLabel}>{fixture.name}</div>}
      />
    </group>
  )
}