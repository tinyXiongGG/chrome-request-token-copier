const enabledInput = document.querySelector("#enabledInput");
const urlFilterInput = document.querySelector("#urlFilterInput");
const captureAllHeadersInput = document.querySelector("#captureAllHeadersInput");
const statusText = document.querySelector("#statusText");
const requestList = document.querySelector("#requestList");
const requestTemplate = document.querySelector("#requestTemplate");
const refreshButton = document.querySelector("#refreshButton");
const clearButton = document.querySelector("#clearButton");

let currentRequests = [];

function formatTime(isoTime) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(isoTime));
}

function formatUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function maskValue(value) {
  if (!value) {
    return "";
  }

  if (value.length <= 24) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function headersToText(headers) {
  return headers.map((header) => `${header.name}: ${header.value}`).join("\n");
}

function quoteForShell(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function toCurl(record) {
  const lines = [
    `curl ${quoteForShell(record.url)}`,
    `  -X ${quoteForShell(record.method)}`
  ];

  for (const header of record.headers) {
    lines.push(`  -H ${quoteForShell(`${header.name}: ${header.value}`)}`);
  }

  return lines.join(" \\\n");
}

async function copyText(text, button) {
  await navigator.clipboard.writeText(text);
  const originalText = button.textContent;
  button.textContent = "已复制";
  setTimeout(() => {
    button.textContent = originalText;
  }, 900);
}

function renderRequests() {
  requestList.replaceChildren();

  if (currentRequests.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "暂无记录";
    requestList.append(empty);
    return;
  }

  for (const record of currentRequests) {
    const fragment = requestTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".request-card");
    const method = fragment.querySelector(".method");
    const time = fragment.querySelector(".time");
    const url = fragment.querySelector(".url");
    const headers = fragment.querySelector(".headers");
    const copyHeadersButton = fragment.querySelector(".copy-headers");
    const copyCurlButton = fragment.querySelector(".copy-curl");

    card.dataset.id = record.id;
    method.textContent = record.method;
    time.textContent = formatTime(record.time);
    url.textContent = formatUrl(record.url);
    url.title = record.url;

    copyHeadersButton.addEventListener("click", () => copyText(headersToText(record.headers), copyHeadersButton));
    copyCurlButton.addEventListener("click", () => copyText(toCurl(record), copyCurlButton));

    for (const header of record.headers) {
      const row = document.createElement("div");
      row.className = "header-row";

      const meta = document.createElement("div");
      meta.className = "header-meta";

      const name = document.createElement("span");
      name.className = "header-name";
      name.textContent = header.name;

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.textContent = "复制值";
      copyButton.addEventListener("click", () => copyText(header.value, copyButton));

      const value = document.createElement("div");
      value.className = "header-value";
      value.textContent = maskValue(header.value);
      value.title = "界面默认截断显示，复制时使用完整值";

      meta.append(name, copyButton);
      row.append(meta, value);
      headers.append(row);
    }

    requestList.append(fragment);
  }
}

async function loadState() {
  const state = await chrome.storage.local.get({
    enabled: false,
    urlFilter: "",
    captureAllHeaders: false,
    capturedRequests: []
  });

  enabledInput.checked = state.enabled;
  urlFilterInput.value = state.urlFilter;
  captureAllHeadersInput.checked = state.captureAllHeaders;
  currentRequests = state.capturedRequests;
  statusText.textContent = state.enabled ? "正在捕获" : "未开启";
  renderRequests();
}

enabledInput.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: enabledInput.checked });
  statusText.textContent = enabledInput.checked ? "正在捕获" : "未开启";
});

urlFilterInput.addEventListener("change", () => {
  chrome.storage.local.set({ urlFilter: urlFilterInput.value.trim() });
});

captureAllHeadersInput.addEventListener("change", () => {
  chrome.storage.local.set({ captureAllHeaders: captureAllHeadersInput.checked });
});

refreshButton.addEventListener("click", loadState);

clearButton.addEventListener("click", async () => {
  await chrome.storage.local.set({ capturedRequests: [] });
  currentRequests = [];
  renderRequests();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.capturedRequests) {
    return;
  }

  currentRequests = changes.capturedRequests.newValue || [];
  renderRequests();
});

loadState();
