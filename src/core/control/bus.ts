import { parseCommand, type ControlCommand } from './commands';

export const BUS_CHANNEL = 'levi3d-control';

export interface ControlBus {
  send(cmd: ControlCommand): void;
  subscribe(fn: (cmd: ControlCommand) => void): () => void;
  close(): void;
}

/**
 * Barramento de controle entre abas do MESMO navegador (BroadcastChannel).
 * Ex.: painel /admin numa aba controla /viewer em outra.
 *
 * Limitação conhecida: o OBS roda seu próprio navegador embutido, então o
 * BroadcastChannel não atravessa para ele. Na etapa do OBS este transporte
 * será complementado por um servidor WebSocket local com a mesma interface.
 */
export function createBroadcastBus(name = BUS_CHANNEL): ControlBus {
  const listeners = new Set<(cmd: ControlCommand) => void>();
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(name) : null;
  if (channel) {
    channel.onmessage = (ev: MessageEvent) => {
      const cmd = parseCommand(ev.data);
      if (cmd) listeners.forEach((fn) => fn(cmd));
    };
  }
  return {
    send: (cmd) => channel?.postMessage(cmd),
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    close() {
      listeners.clear();
      channel?.close();
    },
  };
}
