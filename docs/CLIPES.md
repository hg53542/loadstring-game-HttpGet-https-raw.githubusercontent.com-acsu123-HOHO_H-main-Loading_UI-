# Momentos cinematográficos (modelo híbrido)

O Levi apresenta a live como **avatar 3D em tempo real** (conversa, reage, gesticula).
Em momentos especiais, como presentes grandes e comandos do painel, entra um **clipe
cinematográfico pré-gerado** por cima do 3D, com transição de flash e efeitos, e depois
a live volta ao avatar.

Esse é o mesmo tipo de vídeo do exemplo de referência: clipes feitos com **IA de vídeo**,
que é fotorrealista mas **não roda ao vivo** num notebook com 8 GB de RAM. Por isso eles
são produzidos antes e disparados durante a live.

```
evento da live ──► regras de reação ──► clipe (fila) + efeitos + emoção/gesto do avatar
(presente, seguidor…)   src/core/reactions     src/core/clips   src/core/fx
```

## O que já funciona

| Recurso | Onde |
|---|---|
| Efeitos de anime ao vivo: linhas de velocidade, raios, vidro estilhaçado, fundo cósmico, flash e tremor de câmera | Painel → "Efeitos de anime" (teclas `6`–`9`) |
| 4 combinações prontas: Impacto, Poder, Vidro estilhaçado, Domínio cósmico | idem |
| Biblioteca de clipes (`public/clips/clips.json`) | Painel → "Clipes cinematográficos" |
| Fila: um clipe por vez, prioridade alta fura a fila, intervalo mínimo por clipe, limite de 5 | automático |
| Transição 3D → clipe → 3D com flash e efeito de entrada | automático |
| Regras: presente pequeno / grande / lendário, seguidor, curtidas, compartilhamento | `src/core/reactions/rules.ts` |
| Simulador de eventos (marcados como **[SIMULADO]**) | Painel → "Simular eventos da live" |
| Viewer toca o clipe com som; prévia do painel toca sem som (para não duplicar) | — |

Os 3 clipes incluídos são **clipes de TESTE** gerados neste projeto: tela colorida escrita
"CLIPE DE TESTE" e contagem regressiva. Enquanto tocam, o selo na tela diz "CLIPE DE TESTE".

## Como produzir os clipes do Levi

1. **Imagem oficial do Levi.** Este é o passo mais importante: uma imagem de referência
   única (rosto, cabelo loiro, roupa de guerreiro) para todos os clipes ficarem com o mesmo
   personagem. Idealmente, a mesma aparência do modelo VRM final.
2. **Gerar o vídeo** numa ferramenta de IA de vídeo do tipo *imagem → vídeo*:
   - formato **vertical 9:16** (1080×1920 ou 720×1280);
   - **3–8 segundos** (clipes curtos não cansam a live);
   - descreva a ação: "Levi estala os dedos, raios azuis, câmera aproximando, fundo de palácio demoníaco".
3. **Exportar** em **WebM (VP9)** ou **MP4 (H.264)**. Chrome, Edge e o navegador interno
   do OBS tocam os dois. WebM é o mais garantido.
4. **Colocar** o arquivo em `public/clips/` e cadastrar no `public/clips/clips.json`:

```json
{
  "clips": [
    {
      "id": "presente-lendario",
      "title": "Levi abre o domínio",
      "src": "/clips/levi-dominio.webm",
      "priority": "alta",
      "cooldown": 60,
      "isPlaceholder": false,
      "introFx": "dominio"
    }
  ]
}
```

| Campo | Significado |
|---|---|
| `id` | Letras minúsculas, números e `-`. As regras usam `presente-grande` e `presente-lendario` |
| `src` | Sempre `/clips/…` terminando em `.webm` ou `.mp4` (outros sites são recusados) |
| `priority` | `alta` passa na frente da fila |
| `cooldown` | Segundos mínimos entre duas exibições do mesmo clipe |
| `isPlaceholder` | `true` = clipe de teste (mostra o selo). Coloque `false` só no clipe oficial |
| `introFx` | Efeito na entrada: `impacto`, `poder`, `explosao` ou `dominio` |

Recarregue a página do painel e do viewer depois de editar o manifesto. Itens inválidos
aparecem como erro no painel, com o motivo.

## Cuidados

- **Personagens de terceiros:** não use personagens, nomes ou visuais de animes e jogos
  existentes. Numa live monetizada isso gera risco de denúncia e de remoção. O Levi tem
  identidade própria.
- **Termos da ferramenta de IA:** confira se o plano permite uso comercial e em lives, e
  registre cada clipe em `docs/LICENCAS.md`.
- **Rótulo de IA:** o TikTok pede que conteúdo realista gerado por IA seja identificado.
  Use o rótulo de conteúdo gerado por IA da plataforma.
- **Presentes reais:** eventos simulados nunca devem ser tratados como reais. O
  agradecimento automático a presentes só vai existir quando a integração real do TikTok
  (etapa 4) entregar o evento.

## Limitações atuais

- O painel e o viewer tocam cada um a sua própria fila, a partir dos mesmos comandos. Se um
  vídeo travar numa aba, as filas podem se desencontrar por alguns segundos. Na etapa do OBS
  o viewer passa a ser a única fonte da verdade, via WebSocket local.
- O BroadcastChannel não alcança o navegador interno do OBS (ver README). Até a etapa 5, para
  disparar clipes dentro do OBS use a janela *Interagir* da fonte de navegador.
- Regras e limites (100 e 1000 moedas) ficam no código. A edição pelo painel entra na etapa 9.
