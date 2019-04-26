export interface IPostMessageData<data> {
    from: string;
    type: string;
    tmp: number;
    data: data;
}
export interface IChild {
    id: string | undefined;
    type: "tab" | "iframe";
    iframe: IHTMLIFrameElement;
    key: string;
    origin: string;
    windowRef: Window | null;
    documentRef: Document | null;
    isActive: boolean;
    delayedEvents: Array<{
        to: Window | null;
        message: any;
        targetOrigin: string;
    }>;
}
export declare type IHTMLIFrameElement = HTMLIFrameElement | null;
export interface ICrossEvent {
    type: string;
    cb: IEventCb;
    useCapture?: boolean;
    once?: boolean;
}
export interface IPackedCrossEvent extends ICrossEvent {
    packedCb: IPackedEventCb;
}
export interface IMessageEvent extends MessageEvent {
    data: IPostMessageData<any>;
}
export interface IPackedMessageEvent extends IMessageEvent {
    $from: string;
    $type: string;
    $data: any;
}
export declare type IEventCb = (e: IPackedMessageEvent) => void;
export declare type IPackedEventCb = (e: IPackedMessageEvent) => void;
export interface IChainCb {
    then: (successCb: IEventCb, timeoutCb?: (err: {
        errorCode: IERROR_CODE;
        type: string;
        api: string;
    }) => void) => void;
    catch: (timeoutCb: (err: {
        errorCode: IERROR_CODE;
        type: string;
        api: string;
    }) => void) => void;
}
export declare type IERROR_CODE = IERROR_TIMEOUT | IERROR_TARGET_IS_MISS | IERROR_REG_REPEAT;
export declare type IERROR_TIMEOUT = "timeout";
export declare type IERROR_TARGET_IS_MISS = "miss";
export declare type IERROR_REG_REPEAT = "regRepeat";
