import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// 监听来自 popup 的消息 - 清除所有页面级存储
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'clearAllPageStorage' || message.action === 'clearCache') {
    try {
      // 清除 sessionStorage
      try { sessionStorage.clear() } catch (e) { console.log('sessionStorage clear failed:', e) }
      // 清除 localStorage
      try { localStorage.clear() } catch (e) { console.log('localStorage clear failed:', e) }
      // 清除所有 IndexedDB 数据库
      try {
        if ('indexedDB' in window) {
          indexedDB.databases().then(dbs => {
            for (const db of dbs) {
              if (db.name) indexedDB.deleteDatabase(db.name)
            }
          }).catch(() => {})
        }
      } catch (e) { /* ignore */ }
      // 清除 Cache API (Service Worker Cache Storage)
      try {
        if ('caches' in window) {
          caches.keys().then(names => {
            for (const name of names) caches.delete(name)
          })
        }
      } catch (e) { /* ignore */ }
      // 清除所有 document.cookie
      try {
        document.cookie.split(';').forEach(c => {
          const name = c.split('=')[0].trim()
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${location.hostname}`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${location.hostname}`
        })
      } catch (e) { /* ignore */ }
      // 清除 Service Worker 注册
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            for (const registration of registrations) registration.unregister()
          })
        }
      } catch (e) { /* ignore */ }
      sendResponse({ success: true })
    } catch (e) {
      console.error('Failed to clear page storage:', e)
      sendResponse({ success: false })
    }
  }
  return true
})

export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16
  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize
    return `${pixelsValue}px`
  })
  const styleElement = document.createElement("style")
  styleElement.textContent = updatedCssText
  return styleElement
}
