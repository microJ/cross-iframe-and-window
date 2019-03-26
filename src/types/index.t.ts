export interface IPostMessageData<data> {
  from: string
  type: string
  tmp: number
  data: data
}

export interface IChild {
  id: string | undefined // target iframe DOM attribute id
  type: "tab" | "iframe"
  iframe: IHTMLIFrameElement // target iframe DOM
  key: string // target tag
  origin: string // assert windowTarget.location.origin
  windowRef: Window | null // target window reference
  documentRef: Document | null // target iframe's contentDocument
  isActive: boolean // active to postMessage
  delayedEvents: Array<{
    to: Window | null
    message: any
    targetOrigin: string
  }> // call events callback when isActive
}

export type IHTMLIFrameElement = HTMLIFrameElement | null

export interface ICrossEvent {
  type: string
  cb: IEventCb
  useCapture?: boolean
  once?: boolean
}

export interface IPackedCrossEvent extends ICrossEvent {
  packedCb: IPackedEventCb
}

export interface IMessageEvent extends MessageEvent {
  data: IPostMessageData<any>
}

export interface IPackedMessageEvent extends IMessageEvent {
  $from: string // 代理 e.data.from
  $type: string // 代理 e.data.type
  $data: any // 代理 e.data.data
}

// export type IMessageEvent = MessageEvent

export type IEventCb = (e: IPackedMessageEvent) => void

export type IPackedEventCb = (e: IPackedMessageEvent) => void

export interface IChainCb {
  then: (
    successCb: IEventCb,
    timeoutCb?: (err: {
      errorCode: IERROR_CODE
      type: string
      api: string
    }) => void
  ) => void

  catch: (
    timeoutCb: (err: {
      errorCode: IERROR_CODE
      type: string
      api: string
    }) => void
  ) => void
}

export type IERROR_CODE =
  | IERROR_TIMEOUT
  | IERROR_TARGET_IS_MISS
  | IERROR_REG_REPEAT
export type IERROR_TIMEOUT = "timeout"
export type IERROR_TARGET_IS_MISS = "miss"
export type IERROR_REG_REPEAT = "regRepeat"
