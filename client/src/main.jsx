import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ShopProvider } from './context/ShopContext'
import { AuthProvider } from './context/AuthContext'
import './styles.css'
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(error=>console.warn('Service worker registration failed:',error)))
class AppErrorBoundary extends React.Component{constructor(props){super(props);this.state={hasError:false}}static getDerivedStateFromError(){return {hasError:true}}componentDidCatch(error,info){window.__soHideBootSplash?.();console.error('SMART OUTFIT render error:',error,info)}render(){if(this.state.hasError)return <main className="app-error-screen"><div><span>SMART OUTFIT</span><h1>Something went wrong</h1><p>The page could not be displayed. Reload the website to try again.</p><button onClick={()=>window.location.reload()}>Reload website</button></div></main>;return this.props.children}}
createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppErrorBoundary><BrowserRouter><AuthProvider><ShopProvider><App /></ShopProvider></AuthProvider></BrowserRouter></AppErrorBoundary></React.StrictMode>
)
