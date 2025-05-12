import React, { useEffect, useState } from 'react'
import { useStore } from '../../store'
import styles from './StatusMessage.module.scss'

interface StatusMessageProps {
  message: string
  type: 'success' | 'error' | 'info'
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ message, type }) => {
  const [visible, setVisible] = useState(true)
  const clearStatusMessage = useStore((state) => state.clearStatusMessage)
  
  useEffect(() => {
    setVisible(true)
    
    const timer = setTimeout(() => {
      setVisible(false)
      
      // Allow time for fade out animation before removing from DOM
      setTimeout(() => {
        clearStatusMessage()
      }, 300)
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [message, clearStatusMessage])

  return (
    <div 
      className={`${styles.statusMessage} ${styles[type]} ${visible ? styles.visible : styles.hidden}`}
    >
      {message}
    </div>
  )
}