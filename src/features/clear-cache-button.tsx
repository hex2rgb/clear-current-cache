import { useState } from "react"

export const ClearCacheButton = () => {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleClear = async () => {
    try {
      // 获取当前活动标签页
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true })
      
      if (activeTab?.id && activeTab.url) {
        // 发送消息给 content script 清除所有缓存（cookies + storage）
        try {
          await browser.tabs.sendMessage(activeTab.id, { 
            action: 'clearCache',
            url: activeTab.url
          })
        } catch (storageError) {
          // Content script 可能未加载，忽略 storage 清除错误
          console.log('Content script not loaded, skipping storage clear')
        }
      }

      setShowConfirm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Clear cache failed:', error)
      setShowConfirm(false)
      alert('清除失败')
    }
  }

  return (
    <div className="plasmo-relative">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          type="button"
          className="plasmo-flex plasmo-flex-row plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-text-sm plasmo-rounded-lg plasmo-transition-all plasmo-border-none
          plasmo-shadow-lg hover:plasmo-shadow-md
          active:plasmo-scale-105 plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white">
          清空缓存
        </button>
      ) : (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-2 plasmo-p-3 plasmo-bg-white plasmo-rounded-lg plasmo-shadow-xl plasmo-border plasmo-border-slate-200 plasmo-w-52">
          <span className="plasmo-text-sm plasmo-text-slate-700">确定要清空以下缓存吗？</span>
          <div className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-text-xs plasmo-text-slate-500 plasmo-w-full plasmo-px-2">
            <span>• 当前网站的所有 Cookie</span>
            <span>• 登录信息 (Token/Session)</span>
            <span>• LocalStorage 数据</span>
            <span>• SessionStorage 数据</span>
          </div>
          <div className="plasmo-flex plasmo-gap-2">
            <button
              onClick={handleClear}
              type="button"
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-red-500 hover:plasmo-bg-red-600 plasmo-text-white">
              确认
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              type="button"
              className="plasmo-px-3 plasmo-py-1 plasmo-text-xs plasmo-rounded plasmo-bg-slate-200 hover:plasmo-bg-slate-300 plasmo-text-slate-700">
              取消
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="plasmo-absolute plasmo-top-full plasmo-left-1/2 plasmo-translate-x-[-50%] plasmo-mt-2 plasmo-px-4 plasmo-py-2 plasmo-bg-green-500 plasmo-text-white plasmo-text-sm plasmo-rounded-lg plasmo-shadow-lg plasmo-whitespace-nowrap">
          ✓ 缓存已清除
        </div>
      )}
    </div>
  )
}