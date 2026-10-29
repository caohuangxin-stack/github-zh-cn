const dictCheckbox = document.getElementById("dict");
const fullCheckbox = document.getElementById("full");

chrome.storage.sync.get({ dictEnabled: true, fullEnabled: false }, (items) => {
  dictCheckbox.checked = !!items.dictEnabled;
  fullCheckbox.checked = !!items.fullEnabled;
});

dictCheckbox.addEventListener("change", () => {
  chrome.storage.sync.set({ dictEnabled: dictCheckbox.checked });
});

fullCheckbox.addEventListener("change", () => {
  chrome.storage.sync.set({ fullEnabled: fullCheckbox.checked });
});

document.getElementById("translate-now").addEventListener("click", async () => {
  fullCheckbox.checked = true;
  chrome.storage.sync.set({ fullEnabled: true });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: "translate-full" });
  }
  window.close();
});

document.getElementById("restore").addEventListener("click", async () => {
  fullCheckbox.checked = false;
  chrome.storage.sync.set({ fullEnabled: false });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: "restore-full" });
  }
  window.close();
});
