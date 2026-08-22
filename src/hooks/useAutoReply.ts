// src/hooks/useAutoReply.ts
import { useEffect, useRef, useState } from 'react';
import { DOMService } from '@/services/dom.service';
import { ApiService } from '@/services/api.service';
import { KeywordRule } from '@/types/bot';

const BASE_DELAY_MS = 3000;
const JITTER_MS = 0;
const RULES_REFRESH_MS = 8000;

export interface PendingAutoReply {
  source: string;
  replyText: string;
  secondsLeft: number;
}

function findMatchingRule(rules: KeywordRule[], text: string): KeywordRule | null {
  const textLower = text.toLowerCase();
  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (rule.keywords.some((kw) => textLower.includes(kw.toLowerCase()))) return rule;
  }
  return null;
}

/**
 * Escucha mensajes entrantes del chat activo y, si matchean alguna regla activa, inserta la
 * respuesta y la envía sola después de una demora cancelable. Sólo corre mientras `enabled`
 * sea true. Se conecta una única vez (no se reconecta por cambios de título del header, que
 * son inestables en WhatsApp Web) y sigue escuchando todo lo que pase en #main.
 *
 * Nota: si el usuario abre manualmente un chat totalmente distinto, el watcher puede disparar
 * una vez sobre el último mensaje ya existente de ese chat (falso positivo único), porque ya no
 * resetea el "último visto" al cambiar de conversación. Se aceptó este trade-off para no perder
 * mensajes reales dentro de la misma conversación — ver conversación sobre reconexión inestable.
 *
 * `aiFallbackEnabled`: si ningún bloque de palabra clave matchea, en vez de no hacer nada le pide
 * la respuesta al mismo endpoint real que ya usa "Probar" (`/bot/reply`, que internamente cae al
 * agente de IA con la Base de Conocimiento activa — ver BotEngineService.processIncomingMessage
 * en el backend). No es un fallback local: es el motor real de IA que ya funciona.
 */
export function useAutoReply(enabled: boolean, aiFallbackEnabled: boolean = false) {
  const [pending, setPending] = useState<PendingAutoReply | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const rulesRef = useRef<KeywordRule[]>([]);
  const aiFallbackRef = useRef(aiFallbackEnabled);
  aiFallbackRef.current = aiFallbackEnabled;

  const clearPending = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
    setPending(null);
  };

  const cancelPendingReply = () => {
    console.log('[useAutoReply] Respuesta automática cancelada por el usuario.');
    clearPending();
  };

  const scheduleReply = (source: string, replyText: string) => {
    console.log(`[useAutoReply] "${source}" respondió. Preparando auto-respuesta.`);
    DOMService.insertMessage(replyText);

    const delayMs = BASE_DELAY_MS + Math.random() * JITTER_MS;
    const startedAt = Date.now();
    setPending({ source, replyText, secondsLeft: Math.ceil(delayMs / 1000) });

    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((delayMs - (Date.now() - startedAt)) / 1000));
      setPending((prev) => (prev ? { ...prev, secondsLeft: remaining } : prev));
    }, 250);

    timeoutRef.current = window.setTimeout(() => {
      const sent = DOMService.clickSendButton();
      if (!sent) console.warn('[useAutoReply] No se encontró el botón de enviar de WhatsApp Web.');
      clearPending();
    }, delayMs);
  };

  /** Si no matchea ninguna regla y el fallback de IA está prendido, le pide la respuesta al motor
   * real (mismo endpoint que "Probar") y programa el envío igual que con una regla. */
  const runAiFallback = async (text: string) => {
    console.log('[useAutoReply] Sin regla que matchee, consultando al agente de IA...');
    try {
      const result: any = await ApiService.testBotReply(text);
      if (result?.replyText) scheduleReply('Agente IA', result.replyText);
    } catch (err) {
      console.error('[useAutoReply] Error al consultar al agente de IA:', err);
    }
  };

  /** Prueba manual: toma el último mensaje entrante visible ahora mismo y corre el matcheo, sin esperar un mensaje nuevo. */
  const testWithLastMessage = () => {
    const text = DOMService.getLastIncomingMessageText();
    if (!text) {
      console.warn('[useAutoReply] No hay ningún mensaje entrante visible en el chat abierto.');
      return { text: null, matched: false };
    }
    const rule = findMatchingRule(rulesRef.current, text);
    console.log('[useAutoReply] Prueba manual — mensaje:', text, '— regla encontrada:', rule?.name ?? '(ninguna)');
    if (rule) {
      scheduleReply(rule.name, rule.replyText);
    } else if (aiFallbackRef.current) {
      runAiFallback(text);
    }
    return { text, matched: !!rule };
  };

  useEffect(() => {
    if (!enabled) {
      clearPending();
      return;
    }

    let stopWatcher: () => void = () => { };
    let cancelled = false;
    let refreshInterval: number | null = null;

    const loadRules = async () => {
      try {
        rulesRef.current = await ApiService.getBotRules();
        console.log(`[useAutoReply] ${rulesRef.current.length} regla(s) cargadas desde el backend.`);
      } catch (err) {
        console.error('[useAutoReply] No se pudieron cargar las reglas del bot (¿está corriendo el backend en localhost:5000?):', err);
      }
    };

    const setup = async () => {
      await loadRules();
      if (cancelled) return;

      // Refresca periódicamente: si el usuario activa/desactiva o edita una regla desde el editor
      // mientras el bot sigue prendido, el motor tenía una copia vieja en memoria y nunca se
      // enteraba del cambio hasta apagar y prender el chatbot de nuevo.
      refreshInterval = window.setInterval(loadRules, RULES_REFRESH_MS);

      stopWatcher = DOMService.startIncomingMessageWatcher((text) => {
        const rule = findMatchingRule(rulesRef.current, text);
        if (rule) {
          scheduleReply(rule.name, rule.replyText);
          return;
        }
        console.log('[useAutoReply] Mensaje entrante sin regla que matchee:', text);
        if (aiFallbackRef.current) runAiFallback(text);
      });
    };

    setup();

    return () => {
      cancelled = true;
      if (refreshInterval) window.clearInterval(refreshInterval);
      stopWatcher();
      clearPending();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { pending, cancelPendingReply, testWithLastMessage };
}
