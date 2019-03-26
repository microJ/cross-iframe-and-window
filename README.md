# cross-iframe-and-window

a cross-origin message framework cross iframe and window(such as brower tab), with window.postMessage.

## usage

```js
import Cross from "cross-iframe-and-window"

const cross = new Cross({
  key: "child",
  isBase: true,
  parentOrigin: "*",
  timeout: 3000
});

cross
  .connect({
    key: "base",
    id: "child1"
  })
  .catch(() => {
    // 错误处理
    // 1. 超时
    // a. 对方无响应
    // b. origin 不匹配
    // 2. target 不存在或不合理
    // 3. connect 时注册重复
  });

cross.dispatch("sayHello", { nihao: 123 }, "child2").catch();

cross.disconnect("child2").catch(() => {
  // 1. target 不存在
  // 2. 超时
});
```

## 已知 bug

页面初始化的某个过程中，代码中 `window.parent !== window`，但是获取的 `window.parent` 为 `window`。:(
但是实际上并不会触发回调以至于引起其他的问题。
