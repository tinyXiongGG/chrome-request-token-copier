# Request Token Copier

本项目是一个本地加载的 Chrome 扩展，用于在接口调试时捕获请求头里的 `Authorization`、`Cookie` 和常见 token 头，并在弹窗中一键复制。

## 能做什么

- 手动开启或暂停捕获。
- 按 URL 关键字过滤请求和当前列表，例如 `api.example.com` 或 `/api/`。
- 默认只保存敏感调试常用头：`Authorization`、`Cookie`、`X-CSRF-Token`、`X-XSRF-Token` 等。
- 可选“捕获全部请求头”。
- 复制单个头值、复制全部已捕获头、复制 cURL 命令。
- 数据只保存在 Chrome 本地扩展存储中，不会上传到任何服务器。

## 安装

1. 打开 Chrome：`chrome://extensions/`
2. 打开右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目目录 `chrome-request-token-copier`。

## 使用

1. 打开需要调试的网站。
2. 点击 Chrome 工具栏里的 Request Token Copier 图标。
3. 建议先填写 URL 过滤，例如接口域名或 `/api/`。输入后会实时保存，并立即过滤当前列表。
4. 打开右上角开关。
5. 在页面上触发接口请求。
6. 回到扩展弹窗，复制需要的头值或 cURL。

## 注意

- `Authorization`、`Cookie` 和 token 都是敏感凭证，只建议复制到可信的本地接口调试工具。
- 默认不捕获任何请求，必须手动开启。
- 如果开启“捕获全部请求头”，会保存更多请求信息；调试结束后建议点击“清空记录”并关闭开关。
- Tampermonkey 脚本通常只能拦截页面内的 `fetch` / `XMLHttpRequest`，不能可靠读取浏览器自动附加的 `Cookie` 请求头，也不能读取 HttpOnly Cookie，因此这里使用 Chrome 扩展实现。

## 验证

```bash
python3 -m json.tool manifest.json
node --check background.js
node --check popup.js
```
