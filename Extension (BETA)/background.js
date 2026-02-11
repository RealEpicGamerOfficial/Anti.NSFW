let creating;

async function setupOffscreen() {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });
  if (existing.length > 0) return;

  if (creating) await creating;
  else {
    creating = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Safety'
    });
    await creating;
    creating = null;
  }
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'CHECK_URL') {
    setupOffscreen().then(async () => {
      try {
        const resp = await fetch(msg.url, { mode: 'no-cors' });
        const blob = await resp.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          chrome.runtime.sendMessage({ 
            type: 'PROCESS', 
            dataUrl: reader.result, 
            originalUrl: msg.url 
          });
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        // Fail-safe: Unblur if fetch fails
        chrome.tabs.sendMessage(sender.tab.id, { type: 'RESULT', isSafe: true, url: msg.url });
      }
    });
    return true;
  }

  if (msg.type === 'AI_RESULT') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(t => {
        chrome.tabs.sendMessage(t.id, { type: 'RESULT', isSafe: msg.isSafe, url: msg.url }).catch(() => {});
      });
    });
  }
});