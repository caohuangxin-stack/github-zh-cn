(() => {
  "use strict";

  const DICT = window.__GH_ZH_DICT__ || {};
  const SKIP_SELECTOR =
    "script,style,noscript,pre,code,textarea,input,select,option,[contenteditable='true'],[contenteditable='plaintext-only']";
  const MARK = "data-ghzh";

  let dictEnabled = true;
  let fullEnabled = false;
  let fullTranslating = false;

  // 词典翻译：node -> 原文
  const dictOriginals = new Map();
  // 整页翻译：node -> 原文
  const fullOriginals = new Map();
  // 整页翻译的译文缓存：原文 -> 译文
  const fullCache = new Map();

  const isElement = (n) => n && n.nodeType === Node.ELEMENT_NODE;
  const isText = (n) => n && n.nodeType === Node.TEXT_NODE;

  function isSkippable(node) {
    const el = isElement(node) ? node : node.parentElement;
    return !el || el.closest(SKIP_SELECTOR) || el.closest(`[${MARK}]`);
  }

  function translateTextNode(node) {
    if (!dictEnabled || !isText(node) || isSkippable(node)) return;
    const text = node.nodeValue;
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const hit = DICT[trimmed];
    if (hit === undefined || dictOriginals.has(node) || fullOriginals.has(node)) return;
    dictOriginals.set(node, text);
    node.nodeValue = text.replace(trimmed, hit);
  }

  function translateAttrs(el) {
    if (!dictEnabled || !isElement(el) || isSkippable(el)) return;
    for (const attr of ["placeholder", "title", "aria-label"]) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      const trimmed = value.trim();
      const hit = DICT[trimmed];
      if (hit === undefined) continue;
      const markAttr = `data-ghzh-${attr}`;
      if (el.hasAttribute(markAttr)) continue;
      el.setAttribute(markAttr, value);
      el.setAttribute(attr, value.replace(trimmed, hit));
    }
  }

  function translateElement(root) {
    translateAttrs(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return isSkippable(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
  }

  function restoreDict() {
    for (const [node, original] of dictOriginals) {
      if (node.isConnected) node.nodeValue = original;
    }
    dictOriginals.clear();
    document
      .querySelectorAll(
        "[data-ghzh-placeholder],[data-ghzh-title],[data-ghzh-aria-label]"
      )
      .forEach((el) => {
        for (const attr of ["placeholder", "title", "aria-label"]) {
          const markAttr = `data-ghzh-${attr}`;
          if (el.hasAttribute(markAttr)) {
            el.setAttribute(attr, el.getAttribute(markAttr));
            el.removeAttribute(markAttr);
          }
        }
      });
  }

  function collectFullNodes() {
    const nodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (isSkippable(node)) return NodeFilter.FILTER_REJECT;
        if (fullOriginals.has(node)) return NodeFilter.FILTER_REJECT;
        const text = node.nodeValue.trim();
        if (text.length < 4) return NodeFilter.FILTER_REJECT;
        if (!/[A-Za-z]/.test(text)) return NodeFilter.FILTER_REJECT;
        if (/[\u3400-\u9fff]/.test(text)) return NodeFilter.FILTER_REJECT;
        if (text.length > 4000) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes.slice(0, 1000);
  }

  async function translateOne(text) {
    if (fullCache.has(text)) return fullCache.get(text);
    const url =
      "https://translate.googleapis.com/translate_a/single" +
      "?client=gtx&sl=auto&tl=zh-CN&dt=t&q=" +
      encodeURIComponent(text);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`translate http ${res.status}`);
    const data = await res.json();
    const translated = (data[0] || [])
      .map((seg) => seg && seg[0])
      .filter(Boolean)
      .join("");
    fullCache.set(text, translated);
    return translated;
  }

  async function translateFullPage(force = false) {
    if (fullTranslating) return;
    fullTranslating = true;
    const nodes = collectFullNodes();
    if (nodes.length === 0) {
      fullTranslating = false;
      return;
    }

    const indicator = document.createElement("div");
    indicator.id = "ghzh-progress";
    indicator.textContent = `正在翻译 0 / ${nodes.length}…`;
    Object.assign(indicator.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "2147483647",
      background: "#1f2328",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: "8px",
      font: "12px -apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif",
      boxShadow: "0 4px 16px rgba(0,0,0,.25)",
    });
    document.documentElement.appendChild(indicator);

    let done = 0;
    let cursor = 0;
    const CONCURRENCY = 4;
    async function worker() {
      while (cursor < nodes.length) {
        const node = nodes[cursor++];
        const original = node.nodeValue.trim();
        try {
          const translated = await translateOne(original);
          if (translated && node.isConnected && fullEnabled) {
            if (!fullOriginals.has(node) && !dictOriginals.has(node)) {
              fullOriginals.set(node, node.nodeValue);
            }
            node.nodeValue = node.nodeValue.replace(original, translated);
          }
        } catch (err) {
          console.warn("[ghzh] translate failed:", err && err.message);
        }
        done++;
        indicator.textContent = `正在翻译 ${done} / ${nodes.length}…`;
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    indicator.textContent = "翻译完成";
    fullTranslating = false;
    setTimeout(() => indicator.remove(), 1500);
  }

  function restoreFull() {
    for (const [node, original] of fullOriginals) {
      if (node.isConnected) node.nodeValue = original;
    }
    fullOriginals.clear();
    const bar = document.getElementById("ghzh-progress");
    if (bar) bar.remove();
  }

  // ---- 监听动态加载的内容 ----
  let pending = false;
  function schedule(root) {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      translateElement(root || document.body);
    });
  }

  const observer = new MutationObserver((mutations) => {
    if (!dictEnabled) return;
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const added of mutation.addedNodes) {
        if (isText(added)) {
          translateTextNode(added);
        } else if (isElement(added)) {
          if (added.closest(SKIP_SELECTOR)) continue;
          schedule(added);
        }
      }
    }
  });

  // ---- 设置联动 ----
  chrome.storage.sync.get({ dictEnabled: true, fullEnabled: false }, (items) => {
    dictEnabled = !!items.dictEnabled;
    fullEnabled = !!items.fullEnabled;
    if (dictEnabled) schedule(document.body);
    if (fullEnabled) translateFullPage();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.dictEnabled) {
      dictEnabled = !!changes.dictEnabled.newValue;
      if (dictEnabled) {
        schedule(document.body);
      } else {
        restoreDict();
      }
    }
    if (changes.fullEnabled) {
      fullEnabled = !!changes.fullEnabled.newValue;
      if (fullEnabled) {
        translateFullPage();
      } else {
        restoreFull();
      }
    }
  });

  // 页面初始翻译
  if (document.body) {
    schedule(document.body);
  } else {
    document.addEventListener("DOMContentLoaded", () => schedule(document.body), {
      once: true,
    });
  }

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // 供弹窗触发的“立即整页翻译”按钮
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "translate-full") {
      translateFullPage().then(() => sendResponse({ ok: true }));
      return true;
    }
    if (msg && msg.type === "restore-full") {
      restoreFull();
      sendResponse({ ok: true });
    }
  });
})();
