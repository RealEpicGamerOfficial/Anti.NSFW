// 1. Blur images AND videos immediately
const style = document.createElement('style');
style.innerHTML = `
  img, video, canvas { 
    filter: blur(70px) !important; 
    transition: filter 0.5s ease; 
  }
`;
document.head.appendChild(style);

const scan = () => {
  // Select both images and videos
  document.querySelectorAll('img:not([data-check]), video:not([data-check])').forEach(el => {
    el.dataset.check = "true";

    // If it's a tiny icon or local data, unblur immediately
    if (el.tagName === 'IMG' && (el.src.startsWith('data:') || el.width < 40)) {
      el.style.filter = "none";
      return;
    }

    // Send to background for AI check
    const src = el.tagName === 'IMG' ? el.src : el.currentSrc || el.src;
    if (src) {
      chrome.runtime.sendMessage({ type: 'CHECK_URL', url: src });

      // SAFETY NET: If AI doesn't answer in 3 seconds, unblur so page isn't broken
      setTimeout(() => {
        if (el.style.filter !== "none") {
           el.style.filter = "none";
        }
      }, 3000);
    }
  });
};

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RESULT') {
    // Find images or videos matching the URL
    const targets = document.querySelectorAll(`img[src="${msg.url}"], video`);
    targets.forEach(el => {
      if (msg.isSafe) {
        el.style.filter = "none";
      } else {
        el.style.filter = "blur(100px) brightness(0)";
        if (el.tagName === 'VIDEO') el.pause(); // Stop video playback
      }
    });
  }
});

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
scan();