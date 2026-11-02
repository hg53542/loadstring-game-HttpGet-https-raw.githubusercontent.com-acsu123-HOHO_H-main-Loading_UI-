# Módulo `ai` — Cérebro conversacional

**Status:** não iniciado — etapa 3.

**Responsabilidade:** personalidade do Levi (engraçado, provocador, brincalhão),
memória contextual de conversa e geração de respostas.

**Contrato:**
- Entrada: mensagens (do painel, do chat da live) com autor e contexto.
- Saída: `{ texto, emocao, gesto? }` — o texto vai para `voice`, emoção/gesto viram
  `ControlCommand`s validados por `parseCommand`.
- Provedor plugável: modelo local (offline, gratuito) por padrão; APIs pagas só opcionais.

**Segurança:** filtro de conteúdo antes de falar em público; nunca executa ações de
live/OBS — só emite comandos de avatar.
