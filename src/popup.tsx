import { ClearCacheButton } from "~features/clear-cache-button"

import "~style.css"

function IndexPopup() {
  return (
    <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-h-[200px] plasmo-w-[240px]">
      <ClearCacheButton />
    </div>
  )
}

export default IndexPopup
