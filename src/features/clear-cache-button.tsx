import { useState } from "react"

export const ClearCacheButton = () => {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [clearing, setClearing] = useState(false)

  const handleClear = async () => {
    setClearing(true)
    try {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true })

      if (activeTab?.id && activeTab.url) {
        const url = new URL(activeTab.url)
        const origin = url.origin

        // 1. 精确清除当前域名及子域名的所有 Cookie
        try {
          const allCookies = await browser.cookies.getAll({ domain: url.hostname })
          for (const cookie of allCookies) {
            const protocol = cookie.secure ? 'https' : 'http'
            const domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain
            const cookieUrl = `${protocol}://${domain}${cookie.path}`
            await browser.cookies.remove({
              url: cookieUrl,
              name: cookie.name,
              storeId: cookie.storeId
            })
          }
          console.log('Cookies cleared for:', url.hostname)
        } catch (error) {
          console.error('Failed to clear cookies:', error)
        }

        // 2. 使用 browsingData.remove 一刀切清空所有浏览器级缓存数据
        try {
          await browser.browsingData.remove({
            origins: [origin]
          }, {
            appcache: true,
            cache: true,
            cookies: true,
            fileSystems: true,
            indexedDB: true,
            localStorage: true,
            pluginData: true,
            serviceWorkers: true,
            webSQL: true
          })
          console.log('Browsing data cleared for:', origin)
        } catch (error) {
          console.error('Failed to clear browsing data:', error)
        }

        // 3. 通过 scripting API 注入脚本清除页面级存储（兜底方案）
        try {
          await browser.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => {
              try { sessionStorage.clear() } catch (e) { /* ignore */ }
              try { localStorage.clear() } catch (e) { /* ignore */ }
              try {
                if ('indexedDB' in window) {
                  indexedDB.databases().then(dbs => {
                    for (const db of dbs) {
                      if (db.name) indexedDB.deleteDatabase(db.name)
                    }
                  }).catch(() => {})
                }
              } catch (e) { /* ignore */ }
              try {
                if ('caches' in window) {
                  caches.keys().then(names => {
                    for (const name of names) caches.delete(name)
                  })
                }
              } catch (e) { /* ignore */ }
              try {
                document.cookie.split(';').forEach(c => {
                  const name = c.split('=')[0].trim()
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${location.hostname}`
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${location.hostname}`
                })
              } catch (e) { /* ignore */ }
              try {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (const registration of registrations) registration.unregister()
                  })
                }
              } catch (e) { /* ignore */ }
            }
          })
          console.log('Page-level storage cleared via scripting API')
        } catch (scriptError) {
          console.log('Scripting API failed, trying content script fallback:', scriptError)
          try {
            await browser.tabs.sendMessage(activeTab.id, { action: 'clearAllPageStorage' })
          } catch (contentError) {
            console.log('Content script also not available:', contentError)
          }
        }

        // 4. 刷新页面（绕过缓存），确保所有残留数据彻底清除
        try {
          await browser.tabs.reload(activeTab.id, { bypassCache: true })
        } catch (e) {
          console.log('Failed to reload tab:', e)
        }
      }

      setShowConfirm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Clear cache failed:', error)
      setShowConfirm(false)
      alert('清除失败: ' + (error as Error).message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="plasmo-relative">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          type="button"
          disabled={clearing}
          className="plasmo-flex plasmo-flex-row plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-rounded-lg plasmo-transition-all plasmo-border-none
          plasmo-shadow-lg hover:plasmo-shadow-md
          active:plasmo-scale-105 plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
          {clearing ? '清除中...' : '清空缓存'}
        </button>
      ) : (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-2 plasmo-p-3 plasmo-bg-white plasmo-rounded-lg plasmo-shadow-xl plasmo-border plasmo-border-slate-200 plasmo-w-52">
          <span className="plasmo-text-sm plasmo-text-slate-700 plasmo-font-medium">确定要清空以下缓存吗？</span>
          <div className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-text-xs plasmo-text-slate-500 plasmo-w-full plasmo-px-2">
            <span>• 所有 Cookie（含子域名）</span>
            <span>• LocalStorage 数据</span>
            <span>• SessionStorage 数据</span>
            <span>• IndexedDB 数据库</span>
            <span>• Cache API (SW Cache)</span>
            <span>• Service Worker 注册</span>
            <span>• HTTP 缓存 / 应用缓存</span>
            <span>• WebSQL / 文件系统数据</span>
          </div>
          <div className="plasmo-flex plasmo-gap-2">
            <button
              onClick={handleClear}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
              {clearing ? '清除中...' : '确认清空'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-slate-200 hover:plasmo-bg-slate-300 plasmo-text-slate-700 plasmo-disabled:plasmo-opacity-50">
              取消
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="plasmo-absolute plasmo-top-full plasmo-left-1/2 plasmo-translate-x-[-50%] plasmo-mt-2 plasmo-px-4 plasmo-py-2 plasmo-bg-green-500 plasmo-text-white plasmo-text-sm plasmo-rounded-lg plasmo-shadow-lg plasmo-whitespace-nowrap">
          ✓ 缓存已清除，页面已刷新
        </div>
      )}
    </div>
  )
}              } catch (e) { /* ignore */ }
            }
          })
          console.log('Page-level storage cleared via scripting API')
        } catch (scriptError) {
          console.log('Scripting API failed, trying content script fallback:', scriptError)
          try {
            await browser.tabs.sendMessage(activeTab.id, { action: 'clearAllPageStorage' })
          } catch (contentError) {
            console.log('Content script also not available:', contentError)
          }
        }

        // 4. 刷新页面（绕过缓存），确保所有残留数据彻底清除
        try {
          await browser.tabs.reload(activeTab.id, { bypassCache: true })
        } catch (e) {
          console.log('Failed to reload tab:', e)
        }
      }

      setShowConfirm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Clear cache failed:', error)
      setShowConfirm(false)
      alert('清除失败: ' + (error as Error).message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="plasmo-relative">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          type="button"
          disabled={clearing}
          className="plasmo-flex plasmo-flex-row plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-rounded-lg plasmo-transition-all plasmo-border-none
          plasmo-shadow-lg hover:plasmo-shadow-md
          active:plasmo-scale-105 plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
          {clearing ? '清除中...' : '清空缓存'}
        </button>
      ) : (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-2 plasmo-p-3 plasmo-bg-white plasmo-rounded-lg plasmo-shadow-xl plasmo-border plasmo-border-slate-200 plasmo-w-52">
          <span className="plasmo-text-sm plasmo-text-slate-700 plasmo-font-medium">确定要清空以下缓存吗？</span>
          <div className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-text-xs plasmo-text-slate-500 plasmo-w-full plasmo-px-2">
            <span>• 所有 Cookie（含子域名）</span>
            <span>• LocalStorage 数据</span>
            <span>• SessionStorage 数据</span>
            <span>• IndexedDB 数据库</span>
            <span>• Cache API (SW Cache)</span>
            <span>• Service Worker 注册</span>
            <span>• HTTP 缓存 / 应用缓存</span>
            <span>• WebSQL / 文件系统数据</span>
          </div>
          <div className="plasmo-flex plasmo-gap-2">
            <button
              onClick={handleClear}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
              {clearing ? '清除中...' : '确认清空'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-slate-200 hover:plasmo-bg-slate-300 plasmo-text-slate-700 plasmo-disabled:plasmo-opacity-50">
              取消
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="plasmo-absolute plasmo-top-full plasmo-left-1/2 plasmo-translate-x-[-50%] plasmo-mt-2 plasmo-px-4 plasmo-py-2 plasmo-bg-green-500 plasmo-text-white plasmo-text-sm plasmo-rounded-lg plasmo-shadow-lg plasmo-whitespace-nowrap">
          ✓ 缓存已清除，页面已刷新
        </div>
      )}
    </div>
  )
}
              } catch (e) { /* ignore */ }
            }
          })
          console.log('Page-level storage cleared via scripting API')
        } catch (scriptError) {
          console.log('Scripting API failed, trying content script fallback:', scriptError)
          try {
            await browser.tabs.sendMessage(activeTab.id, { action: 'clearAllPageStorage' })
          } catch (contentError) {
            console.log('Content script also not available:', contentError)
          }
        }

        // 4. 刷新页面（绕过缓存），确保所有残留数据彻底清除
        try {
          await browser.tabs.reload(activeTab.id, { bypassCache: true })
        } catch (e) {
          console.log('Failed to reload tab:', e)
        }
      }

      setShowConfirm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Clear cache failed:', error)
      setShowConfirm(false)
      alert('清除失败: ' + (error as Error).message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="plasmo-relative">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          type="button"
          disabled={clearing}
          className="plasmo-flex plasmo-flex-row plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-rounded-lg plasmo-transition-all plasmo-border-none
          plasmo-shadow-lg hover:plasmo-shadow-md
          active:plasmo-scale-105 plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
          {clearing ? '清除中...' : '清空缓存'}
        </button>
      ) : (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-2 plasmo-p-3 plasmo-bg-white plasmo-rounded-lg plasmo-shadow-xl plasmo-border plasmo-border-slate-200 plasmo-w-52">
          <span className="plasmo-text-sm plasmo-text-slate-700 plasmo-font-medium">确定要清空以下缓存吗？</span>
          <div className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-text-xs plasmo-text-slate-500 plasmo-w-full plasmo-px-2">
            <span>• 所有 Cookie（含子域名）</span>
            <span>• LocalStorage 数据</span>
            <span>• SessionStorage 数据</span>
            <span>• IndexedDB 数据库</span>
            <span>• Cache API (SW Cache)</span>
            <span>• Service Worker 注册</span>
            <span>• HTTP 缓存 / 应用缓存</span>
            <span>• WebSQL / 文件系统数据</span>
          </div>
          <div className="plasmo-flex plasmo-gap-2">
            <button
              onClick={handleClear}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
              {clearing ? '清除中...' : '确认清空'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-slate-200 hover:plasmo-bg-slate-300 plasmo-text-slate-700 plasmo-disabled:plasmo-opacity-50">
              取消
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="plasmo-absolute plasmo-top-full plasmo-left-1/2 plasmo-translate-x-[-50%] plasmo-mt-2 plasmo-px-4 plasmo-py-2 plasmo-bg-green-500 plasmo-text-white plasmo-text-sm plasmo-rounded-lg plasmo-shadow-lg plasmo-whitespace-nowrap">
          ✓ 缓存已清除，页面已刷新
        </div>
      )}
    </div>
  )
}

              取消
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="plasmo-absolute plasmo-top-full plasmo-left-1/2 plasmo-translate-x-[-50%] plasmo-mt-2 plasmo-px-4 plasmo-py-2 plasmo-bg-green-500 plasmo-text-white plasmo-text-sm plasmo-rounded-lg plasmo-shadow-lg plasmo-whitespace-nowrap">
          ✓ 缓存已清除，页面已刷新
        </div>
      )}
    </div>
  )
}
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${location.hostname}`
                })
              } catch (e) { console.log('document.cookie clear failed:', e) }
              // 清除 Service Worker 注册
              try {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (const registration of registrations) {
                      registration.unregister()
                    }
                  })
                }
              } catch (e) { console.log('Service Worker unregister failed:', e) }
            }
          })
          console.log('Page-level storage cleared via scripting API')
        } catch (scriptError) {
          console.log('Scripting API failed, trying content script fallback:', scriptError)
          // 尝试通过 content script 清除
          try {
            await browser.tabs.sendMessage(activeTab.id, {
              action: 'clearAllPageStorage'
            })
          } catch (contentError) {
            console.log('Content script also not available:', contentError)
          }
        }

        // 4. 刷新页面（绕过缓存），确保所有残留数据彻底清除
        try {
          await browser.tabs.reload(activeTab.id, { bypassCache: true })
        } catch (e) {
          console.log('Failed to reload tab:', e)
        }
      }

      setShowConfirm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Clear cache failed:', error)
      setShowConfirm(false)
      alert('清除失败: ' + (error as Error).message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="plasmo-relative">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          type="button"
          disabled={clearing}
          className="plasmo-flex plasmo-flex-row plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-rounded-lg plasmo-transition-all plasmo-border-none
          plasmo-shadow-lg hover:plasmo-shadow-md
          active:plasmo-scale-105 plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
          {clearing ? '清除中...' : '清空缓存'}
        </button>
      ) : (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-2 plasmo-p-3 plasmo-bg-white plasmo-rounded-lg plasmo-shadow-xl plasmo-border plasmo-border-slate-200 plasmo-w-52">
          <span className="plasmo-text-sm plasmo-text-slate-700 plasmo-font-medium">确定要清空以下缓存吗？</span>
          <div className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-text-xs plasmo-text-slate-500 plasmo-w-full plasmo-px-2">
            <span>• 所有 Cookie（含子域名）</span>
            <span>• LocalStorage 数据</span>
            <span>• SessionStorage 数据</span>
            <span>• IndexedDB 数据库</span>
            <span>• Cache API (SW Cache)</span>
            <span>• Service Worker 注册</span>
            <span>• HTTP 缓存 / 应用缓存</span>
            <span>• WebSQL / 文件系统数据</span>
          </div>
          <div className="plasmo-flex plasmo-gap-2">
            <button
              onClick={handleClear}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
              {clearing ? '清除中...' : '确认清空'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-slate-200 hover:plasmo-bg-slate-300 plasmo-text-slate-700 plasmo-disabled:plasmo-opacity-50">
              取消
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="plasmo-absolute plasmo-top-full plasmo-left-1/2 plasmo-translate-x-[-50%] plasmo-mt-2 plasmo-px-4 plasmo-py-2 plasmo-bg-green-500 plasmo-text-white plasmo-text-sm plasmo-rounded-lg plasmo-shadow-lg plasmo-whitespace-nowrap">
          ✓ 缓存已清除，页面已刷新
        </div>
      )}
    </div>
  )
}
                }
              }
            })
          } catch (scriptError) {
            console.log('Scripting API also failed:', scriptError)
          }
        }

        // 4. 刷新页面（绕过缓存），确保所有残留数据彻底清除
        try {
          await browser.tabs.reload(activeTab.id, { bypassCache: true })
        } catch (e) {
          console.log('Failed to reload tab:', e)
        }
      }

      setShowConfirm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Clear cache failed:', error)
      setShowConfirm(false)
      alert('清除失败: ' + (error as Error).message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="plasmo-relative">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          type="button"
          disabled={clearing}
          className="plasmo-flex plasmo-flex-row plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-rounded-lg plasmo-transition-all plasmo-border-none
          plasmo-shadow-lg hover:plasmo-shadow-md
          active:plasmo-scale-105 plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
          {clearing ? '清除中...' : '清空缓存'}
        </button>
      ) : (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-2 plasmo-p-3 plasmo-bg-white plasmo-rounded-lg plasmo-shadow-xl plasmo-border plasmo-border-slate-200 plasmo-w-52">
          <span className="plasmo-text-sm plasmo-text-slate-700 plasmo-font-medium">确定要清空以下缓存吗？</span>
          <div className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-text-xs plasmo-text-slate-500 plasmo-w-full plasmo-px-2">
            <span>• 所有 Cookie（含子域名）</span>
            <span>• LocalStorage 数据</span>
            <span>• SessionStorage 数据</span>
            <span>• IndexedDB 数据库</span>
            <span>• Cache API (SW Cache)</span>
            <span>• Service Worker 注册</span>
            <span>• HTTP 缓存 / 应用缓存</span>
            <span>• WebSQL / 文件系统数据</span>
          </div>
          <div className="plasmo-flex plasmo-gap-2">
            <button
              onClick={handleClear}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
              {clearing ? '清除中...' : '确认清空'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-slate-200 hover:plasmo-bg-slate-300 plasmo-text-slate-700 plasmo-disabled:plasmo-opacity-50">
              取消
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="plasmo-absolute plasmo-top-full plasmo-left-1/2 plasmo-translate-x-[-50%] plasmo-mt-2 plasmo-px-4 plasmo-py-2 plasmo-bg-green-500 plasmo-text-white plasmo-text-sm plasmo-rounded-lg plasmo-shadow-lg plasmo-whitespace-nowrap">
          ✓ 缓存已清除，页面已刷新
        </div>
      )}
    </div>
  )
}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          type="button"
          disabled={clearing}
          className="plasmo-flex plasmo-flex-row plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-rounded-lg plasmo-transition-all plasmo-border-none
          plasmo-shadow-lg hover:plasmo-shadow-md
          active:plasmo-scale-105 plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
          {clearing ? '清除中...' : '清空缓存'}
        </button>
      ) : (
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-2 plasmo-p-2">
          <span className="plasmo-text-sm plasmo-text-slate-700 plasmo-font-medium">确定要清空以下缓存吗？</span>
          <div className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-text-xs plasmo-text-slate-500 plasmo-w-full plasmo-px-2">
            <span>• 所有 Cookie（含子域名）</span>
            <span>• LocalStorage 数据</span>
            <span>• SessionStorage 数据</span>
            <span>• IndexedDB 数据库</span>
            <span>• Cache API (Service Worker Cache)</span>
            <span>• Service Worker 注册</span>
            <span>• HTTP 缓存 / 应用缓存</span>
            <span>• WebSQL / 文件系统数据</span>
          </div>
          <div className="plasmo-flex plasmo-gap-2">
            <button
              onClick={handleClear}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
              {clearing ? '清除中...' : '确认清空'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-slate-200 hover:plasmo-bg-slate-300 plasmo-text-slate-700 plasmo-disabled:plasmo-opacity-50">
              取消
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="plasmo-absolute plasmo-top-full plasmo-left-1/2 plasmo-translate-x-[-50%] plasmo-mt-2 plasmo-px-4 plasmo-py-2 plasmo-bg-green-500 plasmo-text-white plasmo-text-sm plasmo-rounded-lg plasmo-shadow-lg plasmo-whitespace-nowrap">
          ✓ 缓存已清除，页面已刷新
        </div>
      )}
    </div>
  )
}

        // 4. 清除 sessionStorage 和其他页面级存储
        try {
          await browser.tabs.sendMessage(activeTab.id, {
            action: 'clearPageStorage'
          })
        } catch (e) {
          console.log('Content script not available, trying scripting API')
          try {
            await browser.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: () => {
                // 清除 sessionStorage
                sessionStorage.clear()
                // 清除 localStorage（补充 browsingData 的清除）
                localStorage.clear()
                // 清除所有 IndexedDB 数据库
                if ('indexedDB' in window) {
                  indexedDB.databases().then(dbs => {
                    for (const db of dbs) {
                      if (db.name) indexedDB.deleteDatabase(db.name)
                    }
                  }).catch(() => {
                    // indexedDB.databases() 可能不被所有浏览器支持
                    console.log('indexedDB.databases() not supported')
                  })
                }
                // 清除 Cache API
                if ('caches' in window) {
                  caches.keys().then(names => {
                    for (const name of names) {
                      caches.delete(name)
                    }
                  })
                }
                // 清除所有 cookie（通过 document.cookie）
                document.cookie.split(';').forEach(c => {
                  const name = c.split('=')[0].trim()
                  // 尝试各种路径和域名组合来彻底删除
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${location.hostname}`
                  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${location.hostname}`
                })
              }
            })
          } catch (scriptError) {
            console.log('Scripting API also failed:', scriptError)
          }
        }

        // 5. 清除 Service Worker 注册
        try {
          await browser.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                  for (const registration of registrations) {
                    registration.unregister()
                  }
                })
              }
            }
          })
        } catch (e) {
          console.log('Failed to clear service worker registrations:', e)
        }

        // 6. 刷新页面以确保所有缓存彻底清除
        try {
          await browser.tabs.reload(activeTab.id, { bypassCache: true })
        } catch (e) {
          console.log('Failed to reload tab:', e)
        }
      }

      setShowConfirm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Clear cache failed:', error)
      setShowConfirm(false)
      alert('清除失败: ' + (error as Error).message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="plasmo-relative">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          type="button"
          disabled={clearing}
          className="plasmo-flex plasmo-flex-row plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-rounded-lg plasmo-transition-all plasmo-border-none
          plasmo-shadow-lg hover:plasmo-shadow-md
          active:plasmo-scale-105 plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
          {clearing ? '清除中...' : '清空缓存'}
        </button>
      ) : (
        <div className="plasmo-flex plasmo-flex-col plasmo-gap-2 plasmo-p-2">
          <span className="plasmo-text-sm plasmo-text-slate-700 plasmo-font-medium">确定要清空以下缓存吗？</span>
          <div className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-text-xs plasmo-text-slate-500 plasmo-w-full plasmo-px-2">
            <span>• 所有 Cookie（含子域名）</span>
            <span>• LocalStorage 数据</span>
            <span>• SessionStorage 数据</span>
            <span>• IndexedDB 数据库</span>
            <span>• Cache API (Service Worker Cache)</span>
            <span>• Service Worker 注册</span>
            <span>• HTTP 缓存 / 应用缓存</span>
            <span>• WebSQL / 文件系统数据</span>
          </div>
          <div className="plasmo-flex plasmo-gap-2">
            <button
              onClick={handleClear}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white plasmo-disabled:plasmo-opacity-50">
              {clearing ? '清除中...' : '确认清空'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              type="button"
              disabled={clearing}
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-slate-200 hover:plasmo-bg-slate-300 plasmo-text-slate-700 plasmo-disabled:plasmo-opacity-50">
              取消
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="plasmo-absolute plasmo-top-full plasmo-left-1/2 plasmo-translate-x-[-50%] plasmo-mt-2 plasmo-px-4 plasmo-py-2 plasmo-bg-green-500 plasmo-text-white plasmo-text-sm plasmo-rounded-lg plasmo-shadow-lg plasmo-whitespace-nowrap">
          ✓ 缓存已清除，页面已刷新
        </div>
      )}
    </div>
  )
}
