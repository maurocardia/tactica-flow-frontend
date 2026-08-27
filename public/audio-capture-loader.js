(function () {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('audio-capture.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
})();
