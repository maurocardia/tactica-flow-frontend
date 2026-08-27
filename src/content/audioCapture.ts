// Corre en el "mundo principal" de la página (world: MAIN en manifest.json), NO en el mundo
// aislado del resto de la extensión, y a document_start — antes de que cargue el bundle de
// WhatsApp Web. Esto es necesario porque WhatsApp Web moderno reproduce las notas de voz con la
// Web Audio API en vez de un elemento <audio> HTML: nunca crea un <audio> en el DOM, así que no
// hay ningún blob: URL que "espiar" desde afuera (confirmado: document.querySelectorAll('audio')
// da vacío incluso con un audio sonando). El único lugar donde el audio ya descifrado pasa por
// nuestras manos es el argumento que WhatsApp le pasa a AudioContext.decodeAudioData() — WhatsApp
// descarga el archivo cifrado y lo descifra en JS antes de decodificarlo, así que ese ArrayBuffer
// ES el audio real (típicamente Opus/OGG), justo lo que necesitamos para mandarle a Gemini.
(function () {
  function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000; // evita "Maximum call stack size exceeded" con fromCharCode.apply en audios largos
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  }

  function patch(proto: any) {
    if (!proto || proto.__tacticaPatched) return;
    const original = proto.decodeAudioData;
    if (typeof original !== 'function') return;

    proto.decodeAudioData = function (this: AudioContext, audioData: ArrayBuffer, ...rest: any[]) {
      try {
        // Clonamos antes de nada: decodeAudioData puede "consumir"/transferir el ArrayBuffer
        // original según el motor, y no queremos afectar la reproducción real de WhatsApp.
        const clone = audioData.slice(0);
        const base64 = bufferToBase64(clone);
        window.dispatchEvent(
          new CustomEvent('tactica-audio-captured', {
            detail: { base64, byteLength: clone.byteLength, at: Date.now() }
          })
        );
      } catch (err) {
        console.warn('[TacticaAudioCapture] No se pudo capturar el buffer de audio:', err);
      }
      return original.apply(this, [audioData, ...rest]);
    };
    proto.__tacticaPatched = true;
  }

  patch((window as any).AudioContext?.prototype);
  patch((window as any).webkitAudioContext?.prototype);
})();
