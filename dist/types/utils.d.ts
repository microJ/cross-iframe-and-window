export declare const postMsg: <data>(win: Window | null, message: data, targetOrigin: string, transfer?: Transferable[] | undefined) => void;
export declare const ready: (cb: () => any) => void;
export declare const isTop: () => boolean;
export declare const isTab: () => boolean;
