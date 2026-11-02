# Módulo `voice` — Voz e sincronização labial

**Status:** não iniciado — próxima etapa (2).

**Responsabilidade:** transformar texto em áudio (voz masculina jovem, pt-BR) e
gerar, sincronizado com o áudio, os valores de visemas (`aa`, `ih`, `ou`, `ee`, `oh`)
para a `Pose`.

**Contrato com o resto do sistema:**
- Entrada: `{ texto, emocao }`.
- Saída: áudio tocável + fluxo de visemas por quadro, injetado no `AnimationController`
  (nova camada `LipSyncLayer` em `src/core/animation/layers`).
- Precisa funcionar offline (TTS local) e não depender de API paga.

**Não faz:** decidir o que falar (isso é o módulo `ai`).
