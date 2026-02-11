window.process = { env: { NODE_ENV: 'production' } };
let model;

async function init() {
  try {
    while (typeof tf === 'undefined') { await new Promise(r => setTimeout(r, 100)); }
    
    // Set WASM backend to satisfy Chrome Security
    await tf.setBackend('wasm');
    await tf.ready();

    model = await nsfwjs.load('mobilenet_v2', { size: 224 });
    console.log("AI Ready");
  } catch (err) {
    console.error("AI Error:", err);
  }
}

init();

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PROCESS' && model) {
    const img = new Image();
    img.src = msg.dataUrl;
    img.onload = async () => {
      try {
        const predictions = await model.classify(img);
        const unsafe = predictions.some(p => 
          ['Porn', 'Hentai'].includes(p.className) && p.probability > 0.6
        );
        chrome.runtime.sendMessage({ type: 'AI_RESULT', isSafe: !unsafe, url: msg.originalUrl });
      } catch (e) {
        chrome.runtime.sendMessage({ type: 'AI_RESULT', isSafe: true, url: msg.originalUrl });
      }
    };
  }
  return true;
});