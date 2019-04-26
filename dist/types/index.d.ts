import { ICrossEvent, IEventCb, IChainCb } from "./types/index.t";
export default class CrossIframeAndWindow {
    key: string;
    isBase: boolean;
    readonly parentWindowRef: Window | null;
    parentOrigin: string;
    private children;
    private events;
    private timeout;
    constructor({ key, isBase, parentOrigin, initialEvents, timeout }: {
        key: string;
        isBase?: boolean;
        parentOrigin?: string;
        initialEvents?: ICrossEvent[];
        timeout?: number;
    });
    /**
     * listen initial events.
     * default listen:
     *    1. whether child is active
     * @param initialEvents
     */
    private initEventsListening;
    /**
     * message parent I'm active when DOMContentLoaded
     * message parent I'm not active when unload
     */
    private initEventsEmiting;
    private getChild;
    private getPackedCb;
    /**
     * 关联 child
     * key 已经存在时，不会进行再次关联
     * @param key 唯一标识，用于识别该 iframe
     * @param origin 默认为 *
     * @param id [iframe] iframe 标签的 id，用于获取 iframe DOM
     * @param windowRef [tab] child 为 tab 时传入的 child 引用
     */
    connect({ key, origin, id, windowRef }: {
        key: string;
        origin?: string;
        id?: string;
        windowRef?: Window | null;
    }): IChainCb;
    register(): IChainCb;
    deregister(): void;
    /**
     * 如果 key 已经注册，则不会重复注册
     * @param key
     * @param id
     * @param origin
     */
    private regChildIframe;
    private regChildTab;
    /**
     *
     * @param key
     * @returns 删除的 Child
     */
    private removeChild;
    /**
     * 无论如何都会断开与 key 的主动联系
     * @param key
     */
    disconnect(key: string): IChainCb;
    private askWhetherActiveWhenReg;
    private packMsg;
    private packCb;
    private hasEvt;
    private hasChild;
    /**
     * 返回可链式调用的对象，用于处理事件的成功事件或者超时
     * @param evtName
     */
    private packChainCb;
    private getCbEvtOkName;
    /**
     * 返回处理错误的可链式调用的对象，用于处理事件的成功事件或者超时
     * @param evtName
     */
    private packChainCb4Error;
    private postMsgSafely;
    /**
     * 向单个直系 child 派发事件
     * if child is not active, delay these events until it is active
     * @param evt 派发的事件名称
     * @param data 传输的数据，会自动 toJSON 化
     * @param key 目标 key，若为空，代表向所有的直系 child 派发事件
     */
    dispatch<data>(evt: string, data: data, key: string): IChainCb;
    /**
     * 向单个直系 child 派发事件。如果 child 未初始化，则等待初始化完成再进行派发事件
     * @param evt
     * @param data
     * @param key
     */
    dispatchSafely<data>(evt: string, data: data, key: string): void;
    dispatchAll<data>(evt: string, data: data): void;
    dispatchAllSafely<data>(evt: string, data: data): void;
    private emitEvent;
    /**
     * 向 parent 派发事件
     * @param evt
     * @param data
     */
    emit<data>(evt: string, data: data, api?: string): IChainCb;
    /**
     * 向 window.top 派发事件，不支持 baseProject 不是 top 的情况
     * @param evt 派发的事件名称
     * @param data
     */
    emit2Top<data>(evt: string, data: data): IChainCb;
    listen(evt: string, cb: IEventCb, useCapture?: boolean, once?: boolean): void;
    unListen(evt: string, cb: IEventCb, useCapture?: boolean): void;
    once(evt: string, cb: IEventCb, useCapture?: boolean): void;
}
