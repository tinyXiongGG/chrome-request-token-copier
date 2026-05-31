const DEFAULT_SETTINGS = {
  enabled: false,
  urlFilter: "",
  captureAllHeaders: false,
  maxItems: 50
};

const INTERESTING_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "token",
  "access-token",
  "x-access-token",
  "x-auth-token",
  "x-csrf-token",
  "x-xsrf-token",
  "csrf-token",
  "xsrf-token"
]);

let settings = { ...DEFAULT_SETTINGS };
let writeChain = Promise.resolve();

async function loadSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  settings = { ...DEFAULT_SETTINGS, ...stored };
}

async function installDefaults() {
  const current = await chrome.storage.local.get(null);
  const patch = {};

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (current[key] === undefined) {
      patch[key] = value;
    }
  }

  if (current.capturedRequests === undefined) {
    patch.capturedRequests = [];
  }

  if (Object.keys(patch).length > 0) {
    await chrome.storage.local.set(patch);
  }

  await loadSettings();
}

function getHeaderValue(header) {
  if (typeof header.value === "string") {
    return header.value;
  }

  if (Array.isArray(header.binaryValue)) {
    return `[binary:${header.binaryValue.length}]`;
  }

  return "";
}

function selectHeaders(requestHeaders = []) {
  return requestHeaders
    .map((header) => ({
      name: header.name,
      lowerName: header.name.toLowerCase(),
      value: getHeaderValue(header)
    }))
    .filter((header) => settings.captureAllHeaders || INTERESTING_HEADER_NAMES.has(header.lowerName))
    .map(({ name, value }) => ({ name, value }));
}

function shouldCapture(details, headers) {
  if (!settings.enabled) {
    return false;
  }

  const filter = settings.urlFilter.trim();
  if (filter && !details.url.includes(filter)) {
    return false;
  }

  return headers.length > 0;
}

function enqueueRecord(record) {
  writeChain = writeChain
    .then(async () => {
      const { capturedRequests = [] } = await chrome.storage.local.get({ capturedRequests: [] });
      const next = [record, ...capturedRequests].slice(0, settings.maxItems);
      await chrome.storage.local.set({ capturedRequests: next });
    })
    .catch((error) => {
      console.error("Failed to save captured request", error);
    });
}

function handleBeforeSendHeaders(details) {
  const headers = selectHeaders(details.requestHeaders);

  if (!shouldCapture(details, headers)) {
    return;
  }

  enqueueRecord({
    id: `${Date.now()}-${details.requestId}`,
    time: new Date().toISOString(),
    method: details.method,
    url: details.url,
    type: details.type,
    tabId: details.tabId,
    requestId: details.requestId,
    headers
  });
}

chrome.runtime.onInstalled.addListener(installDefaults);
chrome.runtime.onStartup.addListener(loadSettings);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (changes[key]) {
      settings[key] = changes[key].newValue;
    }
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  handleBeforeSendHeaders,
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

loadSettings();
