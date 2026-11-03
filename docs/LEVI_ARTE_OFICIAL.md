# Levi — ficha de design e prompts para a arte oficial

Use este guia para gerar a **imagem oficial do Levi** no seu gerador de imagens e, depois,
para encomendar o modelo Live2D. Tudo aqui descreve um **personagem original**.

## 1. Ficha de design (o que faz o Levi ser o Levi)

| Item | Levi |
|---|---|
| Quem é | Príncipe demônio que virou streamer do canal ZYNOX. Brincalhão, provocador e confiante |
| Idade aparente | 18–20 anos, magro e atlético |
| Cabelo | Loiro dourado, médio, **varrido para a direita dele** (esquerda de quem olha), franja em mechas pontudas, mechas laterais até o queixo, **trancinha fina atrás da orelha esquerda com um anel dourado**. Sem antena de cabelo |
| Olhos | **Âmbar/dourados**, levemente puxados, olhar confiante |
| Rosto | Pele clara, **sem marcas nem tatuagens na testa**, presinha pequena aparecendo ao sorrir |
| Acessório | **Brinco de lua crescente dourada** na orelha esquerda |
| Roupa de live | Moletom preto largo com zíper aberto, **forro do capuz roxo**, cordões roxos, camiseta branca, emblema ZYNOX roxo no peito esquerdo |
| Roupa de guerreiro | Sobretudo longo azul-noite com forro carmesim e acabamentos dourados, **uma ombreira dourada só no ombro esquerdo**, meia-capa carmesim no ombro direito, espada na cintura |
| Forma demoníaca | **Dois chifres pretos curvos**, olhos carmesim com pupila em fenda, **duas marcas vermelhas como arranhões em cada bochecha** (abaixo dos olhos), pontas do cabelo vermelhas, aura vermelha. Continua **sem símbolo na testa** |
| Cores | Dourado (cabelo), âmbar (olhos), preto e roxo ZYNOX (#A35CFF), carmesim (forma demoníaca) |

> **Para manter a originalidade:** evite olhos verdes, qualquer marca na testa, antena de
> cabelo e nomes de personagens ou animes existentes nos prompts. Isso evita que o
> gerador "puxe" um personagem conhecido, e evita problemas de direitos autorais na live
> monetizada.

## 2. Prompts (copie e cole no gerador)

Os prompts estão em inglês porque a maioria dos geradores entende melhor assim.
Use **sempre o mesmo início** (o "bloco do personagem") para manter o Levi igual entre imagens.

### Bloco do personagem (vai no começo de todos)

```
original anime character "Levi", 19-year-old demon prince streamer, golden blonde medium-length hair swept to his right side with sharp layered bangs and jaw-length side locks, a thin small braid behind his left ear with a gold ring, amber-gold eyes with sharp confident expression, fair skin, clean forehead with no marks, small fang when smiling, gold crescent-moon earring on left ear, no ahoge
```

### A) Folha de referência (a mais importante — é ela que vai para o artista)

```
[BLOCO DO PERSONAGEM], character reference sheet, full body front view, three-quarter view and back view side by side, plus close-up of face, wearing an oversized black zip-up hoodie open over a white t-shirt, purple hood lining, purple drawstrings, purple horned emblem logo with the text "ZYNOX" on the left chest, black jeans, sneakers, neutral standing pose, plain light gray background, clean anime cel shading, crisp lineart, high detail, consistent proportions
```

### B) Folha de expressões (as emoções que o sistema já tem)

```
[BLOCO DO PERSONAGEM], anime expression sheet, 9 bust portraits in a 3x3 grid, same outfit (black hoodie with purple lining), expressions: neutral, big happy laugh with eyes closed, angry, surprised with open mouth, sad, confident smirk, teasing wink with tongue-out grin, focused serious, demon form with two curved black horns and crimson slit eyes and red claw-like marks on both cheeks, plain background, clean cel shading, consistent face
```

### C) Cena de live no quarto gamer (como as suas imagens de referência)

```
[BLOCO DO PERSONAGEM], wearing an oversized black hoodie with purple hood lining and purple "ZYNOX" horned logo, sitting at a gaming desk in a cozy medieval wooden bedroom turned streaming room, warm lantern light and candles, purple neon shelf lights, banner with a purple horned emblem on the wall, glowing purple mechanical keyboard, studio microphone on a boom arm in front of him, monitor showing the purple emblem, mug with the emblem, gaming chair with the emblem, shallow depth of field with bokeh, warm orange and purple color grading, vertical 9:16, anime illustration, high detail
```

### D) Forma demoníaca

```
[BLOCO DO PERSONAGEM], demon form, two large curved black horns, crimson glowing slit-pupil eyes, two red claw-like marks on each cheek under the eyes, crimson hair tips, red and black aura with embers, confident menacing grin, wearing a midnight navy long coat with crimson lining and gold trim, single gold pauldron on left shoulder, crimson half-cape, dark throne room background, dramatic red rim light, vertical 9:16, anime illustration
```

### Prompt negativo (se o gerador tiver esse campo)

```
green eyes, forehead mark, forehead tattoo, forehead symbol, ahoge, pig, existing anime character, fan art, watermark, signature, extra fingers, deformed hands, blurry face, misspelled text
```

### Dicas para sair sempre o mesmo Levi

1. Gere a **folha A** até gostar. Guarde a melhor como **imagem de referência**.
2. Nas próximas (B, C, D), use o recurso de **imagem de referência / personagem consistente** do
   gerador (se tiver) com a folha A, e repita o mesmo bloco do personagem.
3. Se o gerador permitir, fixe a mesma **seed** (semente).
4. Confira em cada imagem: olhos âmbar, sem marca na testa, trancinha com anel, brinco de lua.
5. Veja nos termos do gerador se as imagens podem ser usadas comercialmente (live monetizada).
   Muitos geradores marcam as imagens como "AI-generated"; no TikTok use o rótulo de conteúdo de IA.

## 3. Depois de gerar: o que me mandar

- A **folha de referência (A)** e a **folha de expressões (B)**.
- Eu ajusto o Levi 2.5D do sistema (cores, cabelo, proporções) para ficar o mais próximo dela.
- As imagens C e D servem de base para os **clipes cinematográficos** (vídeo por IA a partir
  da imagem) — ver `docs/CLIPES.md`.

## 4. Encomenda do modelo Live2D (o visual definitivo, animado ao vivo)

Mande para o ilustrador e rigger (pode ser a mesma pessoa):

**Para o ilustrador**

- Referências: folhas A e B deste guia.
- Arquivo **PSD** com o personagem do quadril para cima, cerca de 4000 px de altura, com
  **camadas separadas**: cada mecha da franja, cabelo de trás, mechas laterais, trancinha,
  sobrancelhas, cada olho (branco, íris, pupila, brilho, cílio de cima, cílio de baixo,
  pálpebra), boca (lábio de cima, lábio de baixo, interior, dentes, língua, presinha),
  rosto, orelhas, brinco, pescoço, moletom (corpo, capuz, cordões, mangas), mãos.
- Camadas extras da **forma demoníaca**: chifres, marcas das bochechas, olhos carmesim,
  pontas vermelhas do cabelo.

**Para o rigger (Live2D Cubism)**

- Parâmetros com estes IDs exatos (o sistema já envia todos):
  `ParamAngleX, ParamAngleY, ParamAngleZ, ParamBodyAngleX, ParamBodyAngleY, ParamBodyAngleZ,
  ParamBreath, ParamEyeLOpen, ParamEyeROpen, ParamEyeLSmile, ParamEyeRSmile, ParamEyeBallX,
  ParamEyeBallY, ParamBrowLY, ParamBrowRY, ParamBrowLAngle, ParamBrowRAngle, ParamMouthForm,
  ParamMouthOpenY, ParamCheek, ParamMouthSmirk, ParamMouthWide, ParamMouthRound, ParamDemon`.
- Física para cabelo, trancinha, cordões do moletom e brinco.
- Entrega: `.model3.json`, `.moc3`, texturas, `.physics3.json` e o arquivo do projeto (`.cmo3`).

**No contrato**

- Uso **comercial em transmissões ao vivo e vídeos** (TikTok, YouTube etc.).
- Personagem e arte **exclusivos** do canal ZYNOX.
- Direito de **alterar** o modelo depois (novas roupas e expressões).
- Prazo e número de revisões combinados por escrito.

**Alternativa gratuita:** montar o Levi no **VRoid Studio** seguindo a ficha da seção 1 e
exportar em VRM. O sistema já aceita esse arquivo no modo "3D / VRM".
