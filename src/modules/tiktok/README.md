# Módulo `tiktok` — Integração com TikTok LIVE

**Status:** não iniciado — etapa 4.

**Responsabilidade:** receber comentários e eventos disponibilizados pela integração
(presentes, seguidores, curtidas), normalizar em eventos internos e enfileirar para a IA.

**Regras:**
- Somente LEITURA de eventos. Nunca inicia/encerra uma live.
- Agradece apenas presentes reais recebidos pela integração (nada inventado).
- Fila com limite de taxa para não "atropelar" a fala do Levi.
- Modo simulador offline para desenvolvimento (eventos falsos claramente marcados).
