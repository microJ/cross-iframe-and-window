/*
 * File Created: Thursday, 21st February 2019 5:04:17 pm
 * Author: microJ (clear2Jay@gmail.com)
 * -----
 * Last Modified: Monday March 25th 2019 11:12:43 am
 * Modified By: microJ
 * -----
 * Description:
 * 0. 两个假设：
 *    1. top 即为 base
 *    2. 只能父子间或者子孙向 top通信
 *    3. key 为全局唯一标识
 *
 * 1. 实例成员方法
 *    1. new CrossIframeAndTab()
 *
 *    1. connect()                [父] [thenable] 连接 iframe 或 tab
 *    2. disconnect()             [父] [thenable] 断开与子的连接
 *    3. dispatch()               [父] [thenable] 向下派发事件，是否递归
 *    4. dispatchSafely()         [父]            向下派发事件，是否递归，子未初始化成功会延迟执行
 *    5. dispatchAll()            [父]            向下派发事件，是否递归
 *    6. dispatchAllSafely()      [父]            向下派发事件，是否递归，子未初始化成功会延迟执行
 *
 *    iframe 或者 tab 方法:
 *    1. register()               [子] [thenable] 向 parent 进行注册
 *    2. deregister()             [子] [thenable] 向 parent 取消注册
 *    3. emit()                   [子] [thenable] 向parent派发事件，是否递归
 *    4. emit2Top()               [子] [thenable]
 *
 * 2. 事件处理
 *    1. listen()
 *    2. unlisten()
 *    3. once()
 */

import {
  IPostMessageData,
  IChild,
  IHTMLIFrameElement,
  ICrossEvent,
  IEventCb,
  IPackedCrossEvent,
  IPackedEventCb,
  IChainCb,
  IERROR_TIMEOUT,
  IERROR_TARGET_IS_MISS,
  IERROR_REG_REPEAT,
  IERROR_CODE,
  IPackedMessageEvent
} from "./types/index.t";
import { postMsg, ready, isTop, isTab } from "./utils";

const EVENT_IS_ACTIVE = "__CROSS_IFRAME_AND_TAB__IS__ACTIVE__";
const EVENT_ARE_YOU_ACTIVE = "__CROSS_IFRAME_AND_TAB__ARE__YOU__ACTIVE__";
const EVENT_IS_REGISTER = "__CROSS_IFRAME_AND_TAB__REGISTER__";
const EVENT_DISCONNECT = "__CROSS_IFRAME_AND_TAB__DISCONNECT__";

const ERROR_TIMEOUT: IERROR_TIMEOUT = "timeout";
const ERROR_TARGET_IS_MISS: IERROR_TARGET_IS_MISS = "miss";
const ERROR_REG_REPEAT: IERROR_REG_REPEAT = "regRepeat";

const KEYWORD_OF_EVENT_OK = "ok";

export default class CrossIframeAndWindow {
  public key: string; // 当前标识
  public isBase: boolean; // 是否是 baseProject
  public get parentWindowRef(): Window | null {
    // IE fix: window.opener is undefined
    return !isTop() ? window.parent : window.opener || null;
  }
  public parentOrigin: string; // parent origin for security

  private children: IChild[] = [];

  private events: IPackedCrossEvent[] = [];

  private timeout: number;

  constructor({
    key,
    isBase,
    parentOrigin = "*",
    initialEvents,
    timeout = 1200
  }: {
    key: string;
    isBase?: boolean;
    parentOrigin?: string;
    initialEvents?: ICrossEvent[];
    timeout?: number;
  }) {
    this.key = key;

    this.isBase = !!isBase;

    this.parentOrigin = parentOrigin;

    this.timeout = timeout;

    this.initEventsListening(initialEvents);
    this.initEventsEmiting();
  }

  /**
   * listen initial events.
   * default listen:
   *    1. whether child is active
   * @param initialEvents
   */
  private initEventsListening(initialEvents: ICrossEvent[] = []) {
    const _this = this;
    const privateEvents: ICrossEvent[] = [
      {
        // cb: parent 处理 child 的 isActive 状态
        type: EVENT_IS_ACTIVE,
        cb(e) {
          const key: string = e.$from;
          const isActive: boolean = e.$data;
          if (isActive) {
            const child = _this.getChild(key);
            if (child) {
              child.isActive = isActive;
              child.delayedEvents.forEach(evtObj => {
                const { to, targetOrigin, message } = evtObj;
                postMsg(to, message, targetOrigin);
              });
              child.delayedEvents = [];
            }
          } else {
            _this.removeChild(key);
          }
        }
      },
      {
        // cb: child 处理 parent 的 isActive 状态询问
        type: EVENT_ARE_YOU_ACTIVE,
        cb() {
          _this.emit(EVENT_IS_ACTIVE, true);
        }
      },
      {
        // cb 处理子页面DOMContentLoaded 时注册或者 unload 时取消注册
        type: EVENT_IS_REGISTER,
        cb(e) {
          const { key, isReg }: { key: string; isReg: boolean } = e.$data;
          if (isReg) {
            if (isTab()) {
              _this.regChildTab(key, e.source as Window);
            } else {
              _this.regChildIframe(key);
            }
          } else {
            _this.removeChild(key);
          }
        }
      },
      {
        type: EVENT_DISCONNECT,
        cb(e) {
          const { key }: { key: string } = e.$data;
          _this.removeChild(key);
        }
      }
    ];
    const events: ICrossEvent[] = privateEvents.concat(initialEvents);
    events.forEach(crossEvent => {
      const { type: evt, cb, useCapture = false, once } = crossEvent;
      if (once) {
        this.once(evt, cb, useCapture);
      } else {
        this.listen(evt, cb, useCapture);
      }
    });
  }

  /**
   * message parent I'm active when DOMContentLoaded
   * message parent I'm not active when unload
   */
  private initEventsEmiting(): void {
    // 1. initial handshake when DOMContentLoaded
    const initialHandshake = () => {
      this.emit(EVENT_IS_ACTIVE, true);
    };
    ready(initialHandshake);

    // 2. handshake when unload
    window.addEventListener("unload", () => {
      this.emit(EVENT_IS_ACTIVE, false);
    });
  }

  private getChild(key: string): IChild | null {
    let target: IChild | null = null;
    this.children.some(child => {
      const isTarget = key === child.key;
      if (isTarget) {
        target = child;
      }
      return isTarget;
    });
    return target;
  }

  private getPackedCb(cb: IEventCb): IPackedEventCb {
    const targetEventObj = this.events.find(
      eventObj => eventObj.cb === cb
    ) as IPackedCrossEvent;
    return targetEventObj ? targetEventObj.packedCb : function() {};
  }

  /**
   * 关联 child
   * key 已经存在时，不会进行再次关联
   * @param key 唯一标识，用于识别该 iframe
   * @param origin 默认为 *
   * @param id [iframe] iframe 标签的 id，用于获取 iframe DOM
   * @param windowRef [tab] child 为 tab 时传入的 child 引用
   */
  public connect({
    key,
    origin,
    id,
    windowRef = null
  }: {
    key: string;
    origin?: string;
    id?: string;
    windowRef?: Window | null;
  }): IChainCb {
    if (id) {
      return this.regChildIframe(key, id, origin);
    } else {
      return this.regChildTab(key, windowRef, origin);
    }
  }

  public register(): IChainCb {
    return this.emit(
      EVENT_IS_REGISTER,
      { key: this.key, isReg: true },
      "register"
    );
  }

  public deregister(): void {
    this.emit(EVENT_IS_REGISTER, { key: this.key, isReg: false }, "deregister");
  }

  /**
   * 如果 key 已经注册，则不会重复注册
   * @param key
   * @param id
   * @param origin
   */
  private regChildIframe(
    key: string,
    id?: string,
    origin: string = "*"
  ): IChainCb {
    let iframe: IHTMLIFrameElement;
    if (id) {
      iframe = document.getElementById(id) as IHTMLIFrameElement;
    }
    if (!this.hasChild(key)) {
      const childIframeEle: IChild = {
        type: "iframe",
        key,
        id,
        origin,
        isActive: false,
        delayedEvents: [],
        get iframe() {
          return (
            iframe ||
            (id ? (document.getElementById(id) as IHTMLIFrameElement) : null)
          );
        },
        get windowRef() {
          return this.iframe && (iframe as HTMLIFrameElement).contentWindow;
        },
        get documentRef() {
          return this.iframe && (iframe as HTMLIFrameElement).contentDocument;
        }
      };
      this.children.push(childIframeEle);
      return this.askWhetherActiveWhenReg(childIframeEle.windowRef, origin);
    } else {
      return this.packChainCb4Error("", ERROR_REG_REPEAT, "connect");
    }
  }

  private regChildTab(
    key: string,
    windowRef: Window | null,
    origin: string = "*"
  ): IChainCb {
    if (!windowRef) {
      return this.packChainCb4Error("", ERROR_TARGET_IS_MISS, "connect");
    } else if (this.hasChild(key)) {
      return this.packChainCb4Error("", ERROR_REG_REPEAT, "connect");
    } else {
      const childTabEle: IChild = {
        type: "tab",
        key,
        id: undefined,
        origin,
        isActive: false,
        delayedEvents: [],
        iframe: null,
        windowRef,
        documentRef: null
      };
      this.children.push(childTabEle);
      return this.askWhetherActiveWhenReg(childTabEle.windowRef, origin);
    }
  }

  /**
   *
   * @param key
   * @returns 删除的 Child
   */
  private removeChild(key: string): IChild | null {
    let childWillRemoved: IChild | null = null;
    this.children = this.children.filter(child => {
      const isChildWillRemoved = child.key === key;
      if (isChildWillRemoved) {
        childWillRemoved = child;
      }
      return !isChildWillRemoved;
    });
    return childWillRemoved;
  }

  /**
   * 无论如何都会断开与 key 的主动联系
   * @param key
   */
  public disconnect(key: string): IChainCb {
    const removedChild = this.removeChild(key);
    const packedMsg = this.packMsg(EVENT_DISCONNECT);
    if (removedChild) {
      postMsg(removedChild.windowRef, packedMsg, removedChild.origin);
      return this.packChainCb(EVENT_DISCONNECT, packedMsg.tmp, "disconnect");
    } else {
      return this.packChainCb4Error(
        EVENT_DISCONNECT,
        ERROR_TARGET_IS_MISS,
        "disconnect"
      );
    }
  }

  private askWhetherActiveWhenReg(
    targetWindow: Window | null,
    origin: string
  ): IChainCb {
    if (targetWindow) {
      const packedMsg = this.packMsg(EVENT_ARE_YOU_ACTIVE);
      postMsg(targetWindow, packedMsg, origin);
      return this.packChainCb(EVENT_ARE_YOU_ACTIVE, packedMsg.tmp, "connect");
    } else {
      return this.packChainCb4Error(
        EVENT_ARE_YOU_ACTIVE,
        ERROR_TARGET_IS_MISS,
        "connect"
      );
    }
  }

  private packMsg(evt: string, data: any = ""): IPostMessageData<any> {
    const tmp: number = +new Date();
    return {
      from: this.key,
      type: evt,
      tmp,
      data
    };
  }

  private packCb(evt: string, cb: IEventCb): IPackedEventCb {
    return e => {
      const { data } = e;

      const { from, type, tmp } = data as IPostMessageData<any>;

      if (evt !== type) return;

      if (this.hasEvt(type)) {
        const innerData = data.data;
        const newEvent = Object.assign(e, {
          $from: from,
          $type: type,
          $data: innerData
        });
        cb(newEvent);
        if (!~type.indexOf(`:${KEYWORD_OF_EVENT_OK}:`)) {
          // notify :ok:
          console.log(e, this.getCbEvtOkName(type, tmp));
          postMsg(
            e.source as Window,
            this.packMsg(this.getCbEvtOkName(type, tmp)),
            e.origin
          );
        }
      }
    };
  }

  private hasEvt(evt: string): boolean {
    return this.events.some(evtObj => evtObj.type === evt);
  }

  private hasChild(key: string): boolean {
    return this.children.some(child => child.key === key);
  }

  // -------------------------- 事件 -------------------------

  /**
   * 返回可链式调用的对象，用于处理事件的成功事件或者超时
   * @param evtName
   */
  private packChainCb(evtName: string, tmp: number, api: string): IChainCb {
    const cbEvtName = this.getCbEvtOkName(evtName, tmp);
    let isSuccessCbCalled: boolean = false;
    let failCb:
      | ((err: { errorCode: IERROR_CODE; type: string; api: string }) => void)
      | undefined;
    return {
      then: (successCb, timeoutCb) => {
        const cb = (e: IPackedMessageEvent) => {
          isSuccessCbCalled = true;
          successCb(e);
        };
        this.once(cbEvtName, cb);
        failCb = timeoutCb;
        setTimeout(() => {
          if (!isSuccessCbCalled) {
            this.unListen(cbEvtName, cb);
            failCb && failCb({ type: evtName, errorCode: ERROR_TIMEOUT, api });
          }
        }, this.timeout);
      },
      catch: timeoutCb => {
        failCb = timeoutCb;
        setTimeout(() => {
          if (!isSuccessCbCalled) {
            failCb && failCb({ type: evtName, errorCode: ERROR_TIMEOUT, api });
          }
        }, this.timeout);
      }
    };
  }

  private getCbEvtOkName(evtName: string, tmp: number): string {
    return `${evtName}:${KEYWORD_OF_EVENT_OK}:${this.key}:${tmp}`;
  }

  /**
   * 返回处理错误的可链式调用的对象，用于处理事件的成功事件或者超时
   * @param evtName
   */
  private packChainCb4Error(
    evtName: string,
    errorCode: IERROR_CODE,
    api: string
  ): IChainCb {
    return {
      then() {},
      catch: timeoutCb => {
        setTimeout(() => {
          timeoutCb({ type: evtName, errorCode, api });
        }, this.timeout);
      }
    };
  }

  private postMsgSafely(
    child: IChild,
    to: Window | null,
    message: any,
    targetOrigin: string
  ): void {
    if (child.isActive) {
      postMsg(to, message, targetOrigin);
    } else {
      child.delayedEvents.push({
        to,
        message,
        targetOrigin
      });
    }
  }

  /**
   * 向单个直系 child 派发事件
   * if child is not active, delay these events until it is active
   * @param evt 派发的事件名称
   * @param data 传输的数据，会自动 toJSON 化
   * @param key 目标 key，若为空，代表向所有的直系 child 派发事件
   */
  public dispatch<data>(evt: string, data: data, key: string): IChainCb {
    const postMessageData: IPostMessageData<data> = this.packMsg(evt, data);

    // 单个派发
    const child = this.getChild(key);
    if (child && child.windowRef) {
      postMsg(child.windowRef, postMessageData, child.origin);
      return this.packChainCb(evt, postMessageData.tmp, "dispatch");
    } else {
      return this.packChainCb4Error(evt, ERROR_TARGET_IS_MISS, "dispatch");
    }
  }

  /**
   * 向单个直系 child 派发事件。如果 child 未初始化，则等待初始化完成再进行派发事件
   * @param evt
   * @param data
   * @param key
   */
  public dispatchSafely<data>(evt: string, data: data, key: string): void {
    const postMessageData: IPostMessageData<data> = this.packMsg(evt, data);

    // 单个派发
    const child = this.getChild(key);
    if (child) {
      let to: Window | null = null;
      if (child.windowRef) {
        to = child.windowRef;
      }
      this.postMsgSafely(child, to, postMessageData, child.origin);
    }
  }

  public dispatchAll<data>(evt: string, data: data): void {
    const postMessageData: IPostMessageData<data> = this.packMsg(evt, data);

    this.children.forEach(child => {
      postMsg(child.windowRef, postMessageData, child.origin);
    });
  }

  public dispatchAllSafely<data>(evt: string, data: data): void {
    const postMessageData: IPostMessageData<data> = this.packMsg(evt, data);

    this.children.forEach(child => {
      this.postMsgSafely(child, child.windowRef, postMessageData, child.origin);
    });
  }

  private emitEvent<data>(
    evt: string,
    data: data,
    to: Window | null,
    api: string
  ): IChainCb {
    if (isTop() || this.isBase) {
      return this.packChainCb4Error(evt, ERROR_TARGET_IS_MISS, api);
    }
    const postMessageData: IPostMessageData<data> = this.packMsg(evt, data);
    postMsg(to, postMessageData, this.parentOrigin);
    return this.packChainCb(evt, postMessageData.tmp, api);
  }

  /**
   * 向 parent 派发事件
   * @param evt
   * @param data
   */
  public emit<data>(evt: string, data: data, api: string = "emit"): IChainCb {
    return this.emitEvent(evt, data, this.parentWindowRef, api);
  }

  /**
   * 向 window.top 派发事件，不支持 baseProject 不是 top 的情况
   * @param evt 派发的事件名称
   * @param data
   */
  public emit2Top<data>(evt: string, data: data): IChainCb {
    const to: Window = window.top;
    return this.emitEvent(evt, data, to, "emit2Top");
  }

  public listen(
    evt: string,
    cb: IEventCb,
    useCapture: boolean = false,
    once: boolean = false
  ): void {
    const packedCb = this.packCb(evt, cb);
    const conf = once
      ? {
          once: true,
          capture: useCapture
        }
      : useCapture;
    window.addEventListener("message", packedCb as EventListener, conf);
    if (!this.events.some(evtEl => evtEl.type === evt && evtEl.cb === cb)) {
      this.events.push({ type: evt, cb, packedCb });
    }
  }

  public unListen(
    evt: string,
    cb: IEventCb,
    useCapture: boolean = false
  ): void {
    window.removeEventListener(
      "message",
      this.getPackedCb(cb) as EventListener,
      useCapture
    );
    this.events = this.events.filter(
      evtEl => evtEl.type !== evt && evtEl.cb !== cb
    );
  }

  public once(evt: string, cb: IEventCb, useCapture: boolean = false): void {
    this.listen(evt, cb, useCapture, true);
  }
}
