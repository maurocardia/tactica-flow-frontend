// Corre en el "mundo principal" de la página (world: MAIN en manifest.json), NO en el mundo
// aislado del resto de la extensión, y a document_start — antes de que cargue el bundle de
// WhatsApp Web.
//
// Intento 1 (decodeAudioData) confirmado que NO sirve: el parche se instala bien (verificado
// leyendo window.AudioContext.prototype.decodeAudioData.toString() desde la consola — muestra
// nuestro código), pero nunca se dispara al reproducir una nota de voz. Esto confirma que
// WhatsApp Web moderno decodifica el audio con su propio decodificador (probablemente Opus vía
// WebAssembly) en vez de la API nativa del navegador, y arma el AudioBuffer a mano.
//
// Intento 2 (este): en vez de intentar adivinar CÓMO decodifica WhatsApp el audio, interceptamos
// el punto por el que sí o sí tiene que pasar para REPRODUCIRLO: AudioBufferSourceNode.start().
// No importa si el AudioBuffer se armó con decodeAudioData, con un decoder en WASM + createBuffer
// a mano, o cualquier otro método — para sonar, siempre termina en un AudioBufferSourceNode con
// start(). Ahí el buffer ya está totalmente decodificado (PCM), así que lo convertimos a WAV
// (en vez de mandar el Opus/OGG original, que en este punto ya no tenemos) y se lo pasamos a
// Gemini como audio/wav.
(function () {
  function floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;

    const channels: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

    const interleaved = new Float32Array(length * numChannels);
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        interleaved[i * numChannels + c] = channels[c][i];
      }
    }
    const pcm = floatTo16BitPCM(interleaved);

    const blockAlign = numChannels * 2;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcm.length * 2;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < pcm.length; i++, offset += 2) {
      view.setInt16(offset, pcm[i], true);
    }

    return arrayBuffer;
  }

  function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000; // evita "Maximum call stack size exceeded" con fromCharCode.apply en audios largos
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  }

  function emitCaptured(base64: string, byteLength: number, mimeType: string) {
    window.dispatchEvent(
      new CustomEvent('tactica-audio-captured', {
        detail: { base64, byteLength, mimeType, at: Date.now() }
      })
    );
  }

  function patchSourceStart(proto: any) {
    if (!proto || proto.__tacticaPatched) return;
    const original = proto.start;
    if (typeof original !== 'function') return;

    proto.start = function (this: AudioBufferSourceNode, ...args: any[]) {
      try {
        if (this.buffer) {
          const wav = audioBufferToWav(this.buffer);
          emitCaptured(bufferToBase64(wav), wav.byteLength, 'audio/wav');
        }
      } catch (err) {
        console.warn('[TacticaAudioCapture] No se pudo capturar el AudioBuffer en start():', err);
      }
      return original.apply(this, args);
    };
    proto.__tacticaPatched = true;
  }

  // Se deja parcheado también decodeAudioData (por si alguna variante de WhatsApp sí lo usa) —
  // no molesta si nunca se dispara, y da una segunda chance de captura sin costo.
  function patchDecodeAudioData(proto: any) {
    if (!proto || proto.__tacticaPatchedDecode) return;
    const original = proto.decodeAudioData;
    if (typeof original !== 'function') return;

    proto.decodeAudioData = function (this: AudioContext, audioData: ArrayBuffer, ...rest: any[]) {
      try {
        const clone = audioData.slice(0);
        emitCaptured(bufferToBase64(clone), clone.byteLength, 'audio/ogg');
      } catch (err) {
        console.warn('[TacticaAudioCapture] No se pudo capturar el buffer en decodeAudioData:', err);
      }
      return original.apply(this, [audioData, ...rest]);
    };
    proto.__tacticaPatchedDecode = true;
  }

  patchSourceStart((window as any).AudioBufferSourceNode?.prototype);
  patchDecodeAudioData((window as any).AudioContext?.prototype);
  patchDecodeAudioData((window as any).webkitAudioContext?.prototype);
})();
