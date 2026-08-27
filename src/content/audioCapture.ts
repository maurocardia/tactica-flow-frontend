// Corre en el "mundo principal" de la página (inyectado como <script> real por
// audio-capture-loader.js, ver public/content-loader.js), antes de que WhatsApp Web
// reproduzca cualquier nota de voz.
//
// WhatsApp Web reproduce las notas de voz con `new Audio(blobUrl)` sin insertar nunca el
// elemento en el DOM (por eso nunca aparece en document.querySelectorAll, ni siquiera dentro
// de shadow roots) y sin pasar por la Web Audio API (decodeAudioData, createBufferSource, etc.
// nunca se disparan). El único punto de intercepción confiable es HTMLMediaElement.play():
// ahí leemos el blob: URL (ya descifrado por WhatsApp) y lo descargamos nosotros con fetch().
(function () {
  const log = (...args: any[]) => console.log('[TacticaAudioCapture]', ...args);

  function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  }

  function emitCaptured(base64: string, byteLength: number, mimeType: string) {
    log(`Audio capturado — ${byteLength} bytes, ${mimeType}`);
    window.dispatchEvent(
      new CustomEvent('tactica-audio-captured', { detail: { base64, byteLength, mimeType, at: Date.now() } })
    );
  }

  try {
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement, ...args: any[]) {
      const src = this.currentSrc || this.src;
      if (src) {
        fetch(src)
          .then((r) => r.arrayBuffer())
          .then((buf) => {
            const mimeType = this.tagName === 'VIDEO' ? 'video/mp4' : 'audio/ogg';
            emitCaptured(bufferToBase64(buf), buf.byteLength, mimeType);
          })
          .catch((err) => log('No se pudo descargar el src del elemento de audio:', err));
      }
      return originalPlay.apply(this, args as []);
    };
  } catch (err) {
    log('No se pudo instrumentar HTMLMediaElement.play:', err);
  }
})();
