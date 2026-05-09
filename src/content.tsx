import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"

import { ClearCacheButton } from "~features/clear-cache-button"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// 监听来自 popup 的消息
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'clearCache') {
    try {
      // 清除 localStorage 和 sessionStorage
      localStorage.clear()
      sessionStorage.clear()

      // 清除当前域名的 cookies
      const url = new URL(message.url || 'https://example.com')
      const cookies = await browser.cookies.getAll({ domain: url.hostname })
      for (const cookie of cookies) {
        await browser.cookies.remove({
          name: cookie.name,
          url: message.url || ''
        })
      }

      sendResponse({ success: true })
    } catch (e) {
      console.error('Failed to clear cache:', e)
      sendResponse({ success: false })
    }
  }
  return true
})

/**
 * Generates a style element with adjusted CSS to work correctly within a Shadow DOM.
 *
 * Tailwind CSS relies on `rem` units, which are based on the root font size (typically defined on the <html>
 * or <body> element). However, in a Shadow DOM (as used by Plasmo), there is no native root element, so the
 * rem values would reference the actual page's root font size—often leading to sizing inconsistencies.
 *
 * To address this, we:
 * 1. Replace the `:root` selector with `:host(plasmo-csui)` to properly scope the styles within the Shadow DOM.
 * 2. Convert all `rem` units to pixel values using a fixed base font size, ensuring consistent styling
 *    regardless of the host page's font size.
 */
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

// 注意：此文件仅用于清除缓存的消息处理，不在页面注入任何元素
