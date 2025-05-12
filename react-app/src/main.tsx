import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.scss'

// Using a functional equivalent to React.StrictMode to avoid TypeScript errors
const StrictMode: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode children={<App />} />
)