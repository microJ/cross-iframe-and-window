export const postMsg = <data>(
  win: Window | null,
  message: data,
  targetOrigin: string,
  transfer?: Transferable[]
): void => {
  win && win.postMessage(message, targetOrigin, transfer)
}

export const ready = (cb: () => any): void => {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", cb, { once: true })
  } else {
    cb()
  }
}

export const isTop = (): boolean => window === window.top

export const isTab = (): boolean => isTop() && !!window.opener
