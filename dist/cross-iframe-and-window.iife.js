var CrossIframeAndWindow = (function () {
  'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  var postMsg = function postMsg(win, message, targetOrigin, transfer) {
    win && win.postMessage(message, targetOrigin, transfer);
  };
  var ready = function ready(cb) {
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", cb, {
        once: true
      });
    } else {
      cb();
    }
  };
  var isTop = function isTop() {
    return window === window.top;
  };
  var isTab = function isTab() {
    return isTop() && !!window.opener;
  };

  var EVENT_IS_ACTIVE = "__CROSS_IFRAME_AND_TAB__IS__ACTIVE__";
  var EVENT_ARE_YOU_ACTIVE = "__CROSS_IFRAME_AND_TAB__ARE__YOU__ACTIVE__";
  var EVENT_IS_REGISTER = "__CROSS_IFRAME_AND_TAB__REGISTER__";
  var EVENT_DISCONNECT = "__CROSS_IFRAME_AND_TAB__DISCONNECT__";
  var ERROR_TIMEOUT = "timeout";
  var ERROR_TARGET_IS_MISS = "miss";
  var ERROR_REG_REPEAT = "regRepeat";
  var KEYWORD_OF_EVENT_OK = "ok";

  var CrossIframeAndWindow =
  /*#__PURE__*/
  function () {
    _createClass(CrossIframeAndWindow, [{
      key: "parentWindowRef",
      // 当前标识
      // 是否是 baseProject
      get: function get() {
        // IE fix: window.opener is undefined
        return !isTop() ? window.parent : window.opener || null;
      }
    }]);

    function CrossIframeAndWindow(_ref) {
      var key = _ref.key,
          isBase = _ref.isBase,
          _ref$parentOrigin = _ref.parentOrigin,
          parentOrigin = _ref$parentOrigin === void 0 ? "*" : _ref$parentOrigin,
          initialEvents = _ref.initialEvents,
          _ref$timeout = _ref.timeout,
          timeout = _ref$timeout === void 0 ? 1200 : _ref$timeout;

      _classCallCheck(this, CrossIframeAndWindow);

      _defineProperty(this, "key", void 0);

      _defineProperty(this, "isBase", void 0);

      _defineProperty(this, "parentOrigin", void 0);

      _defineProperty(this, "children", []);

      _defineProperty(this, "events", []);

      _defineProperty(this, "timeout", void 0);

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


    _createClass(CrossIframeAndWindow, [{
      key: "initEventsListening",
      value: function initEventsListening() {
        var _this2 = this;

        var initialEvents = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

        var _this = this;

        var privateEvents = [{
          // cb: parent 处理 child 的 isActive 状态
          type: EVENT_IS_ACTIVE,
          cb: function cb(e) {
            var key = e.$from;
            var isActive = e.$data;

            if (isActive) {
              var child = _this.getChild(key);

              if (child) {
                child.isActive = isActive;
                child.delayedEvents.forEach(function (evtObj) {
                  var to = evtObj.to,
                      targetOrigin = evtObj.targetOrigin,
                      message = evtObj.message;
                  postMsg(to, message, targetOrigin);
                });
                child.delayedEvents = [];
              }
            } else {
              _this.removeChild(key);
            }
          }
        }, {
          // cb: child 处理 parent 的 isActive 状态询问
          type: EVENT_ARE_YOU_ACTIVE,
          cb: function cb() {
            _this.emit(EVENT_IS_ACTIVE, true);
          }
        }, {
          // cb 处理子页面DOMContentLoaded 时注册或者 unload 时取消注册
          type: EVENT_IS_REGISTER,
          cb: function cb(e) {
            var _e$$data = e.$data,
                key = _e$$data.key,
                isReg = _e$$data.isReg;

            if (isReg) {
              if (isTab()) {
                _this.regChildTab(key, e.source);
              } else {
                _this.regChildIframe(key);
              }
            } else {
              _this.removeChild(key);
            }
          }
        }, {
          type: EVENT_DISCONNECT,
          cb: function cb(e) {
            var key = e.$data.key;

            _this.removeChild(key);
          }
        }];
        var events = privateEvents.concat(initialEvents);
        events.forEach(function (crossEvent) {
          var evt = crossEvent.type,
              cb = crossEvent.cb,
              _crossEvent$useCaptur = crossEvent.useCapture,
              useCapture = _crossEvent$useCaptur === void 0 ? false : _crossEvent$useCaptur,
              once = crossEvent.once;

          if (once) {
            _this2.once(evt, cb, useCapture);
          } else {
            _this2.listen(evt, cb, useCapture);
          }
        });
      }
      /**
       * message parent I'm active when DOMContentLoaded
       * message parent I'm not active when unload
       */

    }, {
      key: "initEventsEmiting",
      value: function initEventsEmiting() {
        var _this3 = this;

        // 1. initial handshake when DOMContentLoaded
        var initialHandshake = function initialHandshake() {
          _this3.emit(EVENT_IS_ACTIVE, true);
        };

        ready(initialHandshake); // 2. handshake when unload

        window.addEventListener("unload", function () {
          _this3.emit(EVENT_IS_ACTIVE, false);
        });
      }
    }, {
      key: "getChild",
      value: function getChild(key) {
        var target = null;
        this.children.some(function (child) {
          var isTarget = key === child.key;

          if (isTarget) {
            target = child;
          }

          return isTarget;
        });
        return target;
      }
    }, {
      key: "getPackedCb",
      value: function getPackedCb(cb) {
        var targetEventObj = this.events.find(function (eventObj) {
          return eventObj.cb === cb;
        });
        return targetEventObj ? targetEventObj.packedCb : function () {};
      }
      /**
       * 关联 child
       * key 已经存在时，不会进行再次关联
       * @param key 唯一标识，用于识别该 iframe
       * @param origin 默认为 *
       * @param id [iframe] iframe 标签的 id，用于获取 iframe DOM
       * @param windowRef [tab] child 为 tab 时传入的 child 引用
       */

    }, {
      key: "connect",
      value: function connect(_ref2) {
        var key = _ref2.key,
            origin = _ref2.origin,
            id = _ref2.id,
            _ref2$windowRef = _ref2.windowRef,
            windowRef = _ref2$windowRef === void 0 ? null : _ref2$windowRef;

        if (id) {
          return this.regChildIframe(key, id, origin);
        } else {
          return this.regChildTab(key, windowRef, origin);
        }
      }
    }, {
      key: "register",
      value: function register() {
        return this.emit(EVENT_IS_REGISTER, {
          key: this.key,
          isReg: true
        }, "register");
      }
    }, {
      key: "deregister",
      value: function deregister() {
        this.emit(EVENT_IS_REGISTER, {
          key: this.key,
          isReg: false
        }, "deregister");
      }
      /**
       * 如果 key 已经注册，则不会重复注册
       * @param key
       * @param id
       * @param origin
       */

    }, {
      key: "regChildIframe",
      value: function regChildIframe(key, id) {
        var origin = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "*";
        var iframe;

        if (id) {
          iframe = document.getElementById(id);
        }

        if (!this.hasChild(key)) {
          var childIframeEle = {
            type: "iframe",
            key: key,
            id: id,
            origin: origin,
            isActive: false,
            delayedEvents: [],

            get iframe() {
              return iframe || (id ? document.getElementById(id) : null);
            },

            get windowRef() {
              return this.iframe && iframe.contentWindow;
            },

            get documentRef() {
              return this.iframe && iframe.contentDocument;
            }

          };
          this.children.push(childIframeEle);
          return this.askWhetherActiveWhenReg(childIframeEle.windowRef, origin);
        } else {
          return this.packChainCb4Error("", ERROR_REG_REPEAT, "connect");
        }
      }
    }, {
      key: "regChildTab",
      value: function regChildTab(key, windowRef) {
        var origin = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "*";

        if (!windowRef) {
          return this.packChainCb4Error("", ERROR_TARGET_IS_MISS, "connect");
        } else if (this.hasChild(key)) {
          return this.packChainCb4Error("", ERROR_REG_REPEAT, "connect");
        } else {
          var childTabEle = {
            type: "tab",
            key: key,
            id: undefined,
            origin: origin,
            isActive: false,
            delayedEvents: [],
            iframe: null,
            windowRef: windowRef,
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

    }, {
      key: "removeChild",
      value: function removeChild(key) {
        var childWillRemoved = null;
        this.children = this.children.filter(function (child) {
          var isChildWillRemoved = child.key === key;

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

    }, {
      key: "disconnect",
      value: function disconnect(key) {
        var removedChild = this.removeChild(key);
        var packedMsg = this.packMsg(EVENT_DISCONNECT);

        if (removedChild) {
          postMsg(removedChild.windowRef, packedMsg, removedChild.origin);
          return this.packChainCb(EVENT_DISCONNECT, packedMsg.tmp, "disconnect");
        } else {
          return this.packChainCb4Error(EVENT_DISCONNECT, ERROR_TARGET_IS_MISS, "disconnect");
        }
      }
    }, {
      key: "askWhetherActiveWhenReg",
      value: function askWhetherActiveWhenReg(targetWindow, origin) {
        if (targetWindow) {
          var packedMsg = this.packMsg(EVENT_ARE_YOU_ACTIVE);
          postMsg(targetWindow, packedMsg, origin);
          return this.packChainCb(EVENT_ARE_YOU_ACTIVE, packedMsg.tmp, "connect");
        } else {
          return this.packChainCb4Error(EVENT_ARE_YOU_ACTIVE, ERROR_TARGET_IS_MISS, "connect");
        }
      }
    }, {
      key: "packMsg",
      value: function packMsg(evt) {
        var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
        var tmp = +new Date();
        return {
          from: this.key,
          type: evt,
          tmp: tmp,
          data: data
        };
      }
    }, {
      key: "packCb",
      value: function packCb(evt, cb) {
        var _this4 = this;

        return function (e) {
          var data = e.data;
          var _ref3 = data,
              from = _ref3.from,
              type = _ref3.type,
              tmp = _ref3.tmp;
          if (evt !== type) return;

          if (_this4.hasEvt(type)) {
            var innerData = data.data;
            var newEvent = Object.assign(e, {
              $from: from,
              $type: type,
              $data: innerData
            });
            cb(newEvent);

            if (!~type.indexOf(":".concat(KEYWORD_OF_EVENT_OK, ":"))) {
              // notify :ok:
              console.log(e, _this4.getCbEvtOkName(type, tmp));
              postMsg(e.source, _this4.packMsg(_this4.getCbEvtOkName(type, tmp)), e.origin);
            }
          }
        };
      }
    }, {
      key: "hasEvt",
      value: function hasEvt(evt) {
        return this.events.some(function (evtObj) {
          return evtObj.type === evt;
        });
      }
    }, {
      key: "hasChild",
      value: function hasChild(key) {
        return this.children.some(function (child) {
          return child.key === key;
        });
      } // -------------------------- 事件 -------------------------

      /**
       * 返回可链式调用的对象，用于处理事件的成功事件或者超时
       * @param evtName
       */

    }, {
      key: "packChainCb",
      value: function packChainCb(evtName, tmp, api) {
        var _this5 = this;

        var cbEvtName = this.getCbEvtOkName(evtName, tmp);
        var isSuccessCbCalled = false;
        var failCb;
        return {
          then: function then(successCb, timeoutCb) {
            var cb = function cb(e) {
              isSuccessCbCalled = true;
              successCb(e);
            };

            _this5.once(cbEvtName, cb);

            failCb = timeoutCb;
            setTimeout(function () {
              if (!isSuccessCbCalled) {
                _this5.unListen(cbEvtName, cb);

                failCb && failCb({
                  type: evtName,
                  errorCode: ERROR_TIMEOUT,
                  api: api
                });
              }
            }, _this5.timeout);
          },
          catch: function _catch(timeoutCb) {
            failCb = timeoutCb;
            setTimeout(function () {
              if (!isSuccessCbCalled) {
                failCb && failCb({
                  type: evtName,
                  errorCode: ERROR_TIMEOUT,
                  api: api
                });
              }
            }, _this5.timeout);
          }
        };
      }
    }, {
      key: "getCbEvtOkName",
      value: function getCbEvtOkName(evtName, tmp) {
        return "".concat(evtName, ":").concat(KEYWORD_OF_EVENT_OK, ":").concat(this.key, ":").concat(tmp);
      }
      /**
       * 返回处理错误的可链式调用的对象，用于处理事件的成功事件或者超时
       * @param evtName
       */

    }, {
      key: "packChainCb4Error",
      value: function packChainCb4Error(evtName, errorCode, api) {
        var _this6 = this;

        return {
          then: function then() {},
          catch: function _catch(timeoutCb) {
            setTimeout(function () {
              timeoutCb({
                type: evtName,
                errorCode: errorCode,
                api: api
              });
            }, _this6.timeout);
          }
        };
      }
    }, {
      key: "postMsgSafely",
      value: function postMsgSafely(child, to, message, targetOrigin) {
        if (child.isActive) {
          postMsg(to, message, targetOrigin);
        } else {
          child.delayedEvents.push({
            to: to,
            message: message,
            targetOrigin: targetOrigin
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

    }, {
      key: "dispatch",
      value: function dispatch(evt, data, key) {
        var postMessageData = this.packMsg(evt, data); // 单个派发

        var child = this.getChild(key);

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

    }, {
      key: "dispatchSafely",
      value: function dispatchSafely(evt, data, key) {
        var postMessageData = this.packMsg(evt, data); // 单个派发

        var child = this.getChild(key);

        if (child) {
          var to = null;

          if (child.windowRef) {
            to = child.windowRef;
          }

          this.postMsgSafely(child, to, postMessageData, child.origin);
        }
      }
    }, {
      key: "dispatchAll",
      value: function dispatchAll(evt, data) {
        var postMessageData = this.packMsg(evt, data);
        this.children.forEach(function (child) {
          postMsg(child.windowRef, postMessageData, child.origin);
        });
      }
    }, {
      key: "dispatchAllSafely",
      value: function dispatchAllSafely(evt, data) {
        var _this7 = this;

        var postMessageData = this.packMsg(evt, data);
        this.children.forEach(function (child) {
          _this7.postMsgSafely(child, child.windowRef, postMessageData, child.origin);
        });
      }
    }, {
      key: "emitEvent",
      value: function emitEvent(evt, data, to, api) {
        if (isTop() || this.isBase) {
          return this.packChainCb4Error(evt, ERROR_TARGET_IS_MISS, api);
        }

        var postMessageData = this.packMsg(evt, data);
        postMsg(to, postMessageData, this.parentOrigin);
        return this.packChainCb(evt, postMessageData.tmp, api);
      }
      /**
       * 向 parent 派发事件
       * @param evt
       * @param data
       */

    }, {
      key: "emit",
      value: function emit(evt, data) {
        var api = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "emit";
        return this.emitEvent(evt, data, this.parentWindowRef, api);
      }
      /**
       * 向 window.top 派发事件，不支持 baseProject 不是 top 的情况
       * @param evt 派发的事件名称
       * @param data
       */

    }, {
      key: "emit2Top",
      value: function emit2Top(evt, data) {
        var to = window.top;
        return this.emitEvent(evt, data, to, "emit2Top");
      }
    }, {
      key: "listen",
      value: function listen(evt, cb) {
        var useCapture = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        var once = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
        var packedCb = this.packCb(evt, cb);
        var conf = once ? {
          once: true,
          capture: useCapture
        } : useCapture;
        window.addEventListener("message", packedCb, conf);

        if (!this.events.some(function (evtEl) {
          return evtEl.type === evt && evtEl.cb === cb;
        })) {
          this.events.push({
            type: evt,
            cb: cb,
            packedCb: packedCb
          });
        }
      }
    }, {
      key: "unListen",
      value: function unListen(evt, cb) {
        var useCapture = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        window.removeEventListener("message", this.getPackedCb(cb), useCapture);
        this.events = this.events.filter(function (evtEl) {
          return evtEl.type !== evt && evtEl.cb !== cb;
        });
      }
    }, {
      key: "once",
      value: function once(evt, cb) {
        var useCapture = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        this.listen(evt, cb, useCapture, true);
      }
    }]);

    return CrossIframeAndWindow;
  }();

  return CrossIframeAndWindow;

}());
