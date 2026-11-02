# Módulo `obs` — OBS Studio

**Status:** não iniciado — etapa 5. Hoje já funciona capturar `/viewer?transparent=1`
como *Fonte de Navegador* (ver README principal).

**Responsabilidade:** cenas verticais (1080×1920), troca de cena e controle via
obs-websocket; transporte de comandos para o viewer dentro do OBS (WebSocket local,
substituindo o BroadcastChannel, que não atravessa para o navegador do OBS).

**Regra inegociável:** NUNCA chama `StartStream`/`StartRecord` automaticamente.
Transmissão só começa com clique manual do usuário no próprio OBS.
