# Roadmap

Uma etapa por vez. Cada etapa só termina com código implementado, testes passando e
documentação atualizada.

## ✅ Etapa 1 — Base e avatar (v0.1, esta entrega)

Projeto Next.js + TS + R3F, núcleo de animação testável, modelo provisório, respiração,
piscadas, cabeça/olhar, emoções, gestos, transformação demoníaca, câmeras, iluminação,
`/viewer`, `/admin`, adaptador VRM, testes e docs.

**Pendências conhecidas desta etapa**
- Validar o `VrmRig` com um arquivo VRM real (depende do modelo do Levi).
- Medir FPS no notebook alvo (o ambiente de desenvolvimento não tem GPU; os FPS vistos lá
  vêm de renderização por software e não representam o notebook).
- Gestos são procedurais; mãos não têm dedos no modelo provisório.

## ✅ Etapa 1.5 — Momentos cinematográficos (modelo híbrido, v0.2)

Pedido a partir do vídeo de referência (clipes de IA de vídeo). Avatar 3D ao vivo +
clipes pré-gerados disparados por eventos + efeitos de anime em tempo real. Ver `docs/CLIPES.md`.

**Pendências:** clipes oficiais do Levi (dependem da imagem oficial do personagem);
fila única no viewer (etapa 5); regras editáveis no painel (etapa 9).

## ✅ Etapa 1.6 — Reformulação visual: anime 2.5D (v0.3)

Personagem 2.5D original em vetor guiado pelos parâmetros padrão Live2D, com física,
vida em silêncio, fala com visemas pt-BR (voz do sistema) e emoções de personalidade.
Ver `docs/VISUAL.md`. **Pendências:** modelo Live2D profissional (arte + rigging),
medir FPS no notebook e no OBS.

## ⏭️ Etapa 2 — Voz e sincronização labial

- TTS offline em pt-BR com voz masculina jovem (avaliar motores locais gratuitos; verificar
  a licença de **cada voz** antes de usar em live).
- `LipSyncLayer`: análise do áudio → visemas `aa/ih/ou/ee/oh` sincronizados.
- Emoção na fala (velocidade/tom por emoção) e risadas.
- Painel: campo "fazer o Levi falar", seleção de voz, volume.
- Testes: visemas em silêncio = 0; sincronia áudio/boca dentro de ~80 ms.

## Etapa 3 — IA conversacional + memória (SQLite)

- Provedor plugável; padrão local/offline e gratuito, compatível com 8 GB de RAM
  (modelos pequenos quantizados).
- Personalidade engraçada/provocadora com limites de segurança.
- Saída estruturada `{ texto, emoção, gesto }` → comandos do avatar.
- Memória de conversa e de espectadores em SQLite (`src/modules/storage`).

## Etapa 4 — TikTok LIVE (somente leitura)
## Etapa 5 — OBS (cenas verticais, WebSocket local; nunca inicia live sozinho)
## Etapa 6 — Cenários: quarto gamer, taverna, palácio demoníaco, arena, masmorra
## Etapa 7 — Batalhas (motor de regras puro + visual + votação + narração)
## Etapa 8 — Universo persistente (reino, mascotes, missões, ranking, eventos)
## Etapa 9 — Painel completo (voz, IA, TikTok, OBS, batalhas, segurança)
## Etapa 10 — Personagem final VRM (pode acontecer em paralelo, assim que o modelo existir)
