# Reformulação visual: Levi anime 2.5D

## 1. Por que o Levi parecia um robô

| Causa | Efeito na tela |
|---|---|
| Corpo montado com esferas, cápsulas e cones | Silhueta de boneco de brinquedo, sem anatomia |
| Peças rígidas, nada se deforma | Juntas "de articulação", rosto sem expressão de verdade |
| Rosto feito de discos colados numa esfera | Olhos e boca "adesivos", sem desenho |
| Sem traço de desenho (no início) e sombra realista | Aparência de plástico, não de anime |
| Sem movimento secundário (cabelo e roupa parados) | Sensação de estátua |
| Movimentos ociosos simétricos e repetitivos | Sensação mecânica |

Anime é antes de tudo **desenho 2D**: traço, sombra chapada, olhos grandes pintados e cabelo
em mechas. Nenhum ajuste fino em formas geométricas 3D chega a isso.

## 2. Comparação das tecnologias

| | **Live2D Cubism** | **VRM + MToon (3D anime)** | **Desenho 2.5D em código** (esta entrega) | PixiJS |
|---|---|---|---|---|
| Aparência de anime | ★★★★★ é literalmente uma ilustração animada | ★★★★ bom, estilo "VTuber 3D" | ★★★ desenho vetorial limpo | — (é motor de renderização) |
| Expressões e boca | ★★★★★ | ★★★★ (blendshapes) | ★★★★ | — |
| Corpo inteiro, batalhas, câmera girando | ★★ (pensado para busto) | ★★★★★ | ★★★ (frontal) | — |
| Cabelo e roupa com física | ★★★★★ (física do Cubism) | ★★★★ (spring bones) | ★★★ (molas próprias) | — |
| Desempenho no i5 / OBS | ★★★★★ | ★★★ | ★★★★★ | ★★★★★ |
| O que precisa | Ilustração em camadas (PSD) **+ rigging no Cubism Editor** + licença do SDK | Modelo `.vrm` (VRoid Studio grátis, ou artista) | Nada externo | Usado junto com Live2D |
| Dá para fazer só com programação? | **Não** | **Não** (precisa do modelo) | **Sim** (qualidade limitada) | — |

## 3. Arquitetura escolhida

```
AnimationController ──► Pose ──► poseToLive2D() ──► parâmetros padrão Live2D
  (respiração, piscar,              (ParamAngleX, ParamEyeLOpen,
   olhar, emoções, gestos,           ParamMouthOpenY, ParamDemon…)
   fala, vida em silêncio)                │
                                          ├──► Levi 2.5D (demo atual, src/avatar/puppet)
                                          └──► modelo Live2D profissional (futuro)
                     Pose ──► VrmRig ──► modelo VRM 3D (cenas de corpo inteiro / batalhas)
```

- **Visual principal da live (busto, conversando): Live2D.** É o que dá a sensação de "anime
  vivo". Enquanto não existe o modelo Live2D, roda o **Levi 2.5D** desta entrega, que usa
  exatamente os mesmos parâmetros.
- **Cenas de corpo inteiro e batalhas: VRM 3D com MToon.** O adaptador já existe e o modo
  "3D / VRM" continua no painel.
- Animação, emoções, fala, efeitos, clipes, OBS e painel **não dependem** do visual escolhido.

## 4. O que esta entrega faz

- **Personagem 2.5D original desenhado em vetor:** olhos âmbar com degradê e brilhos, cílios
  com "asinha", sobrancelhas por cima da franja, rubor, boca com dentes, língua e presinha.
  Cabelo em mechas curvas e assimétricas com brilho, sobretudo azul-noite com forro carmesim,
  ombreira dourada só de um lado, meia-capa, brinco de lua e espada.
- **Profundidade 2.5D:** cada parte do rosto tem uma profundidade e desliza quando a cabeça
  gira. O olho do lado do giro fica mais estreito (escorço), a cabeça inclina e o tronco
  acompanha.
- **Física:** mechas, antena de cabelo, capa e abas do casaco balançam com o movimento.
  Na forma demoníaca, a aura funciona como vento.
- **Braços:** cinemática 3D projetada. Os mesmos gestos do 3D (acenar, pensar, apontar,
  comemorar…) funcionam no 2.5D, com dedo indicador ao apontar e mão aberta ao acenar.
- **Vida em silêncio:** muda de postura a cada 4–9 s (peso numa perna, tronco, ombros,
  cabeça inclinada) e os braços balançam levemente. O ciclo nunca se repete.
- **Fala:** visemas de português (A, E, I, O, U e boca fechada em M/B/P) gerados a partir
  do texto e realinhados a cada palavra da voz. Cabeça acompanha o ritmo, sobrancelhas sobem
  nas ênfases e as mãos fazem gestos de batida.
- **Emoções:** feliz, bravo, triste, surpreso, relaxado, **confiante, provocador
  (sorriso de canto + piscadinha), concentrado, rindo (olhos ^^)** e forma demoníaca (chifres,
  olhos vermelhos com pupila em fenda, marcas nas bochechas, pontas do cabelo vermelhas, aura).
- **Roteiros com emoção:** `[provocador] Duvido! [rir] kkkk` troca a expressão junto com a fala.

### Cenário e figurino (v0.3.1)

- **Quarto gamer ZYNOX** (padrão): quarto medieval de madeira, janela e lanternas com luz
  quente tremulando, neon roxo, banner com o emblema e fundo desfocado (profundidade de campo).
  Na frente ficam a cadeira gamer, a mesa com teclado roxo (pulsa quando ele fala), mouse,
  monitor e caneca com o emblema e o microfone de estúdio com LED (acende na fala).
- **Figurinos:** moletom ZYNOX de streamer (forro roxo, cordões, camiseta branca) ou guerreiro.
- O emblema ZYNOX é um desenho simples feito em código. Se o canal tiver um logo oficial
  em arquivo, ele pode substituir o desenho.
- Inspirado nas imagens de referência enviadas, **sem** copiar o personagem delas: o Levi
  mantém olhos âmbar, penteado próprio e nenhuma marca na testa.

### Desempenho medido

| Medida | Valor | Onde |
|---|---|---|
| Desenho do personagem 2.5D | **0,63 ms por quadro** | CPU pura, sem GPU (ambiente de teste) |
| Cena completa (2.5D + fundo 3D + efeitos) | 28 FPS | Renderização por software, sem GPU |

No i5-1334U a GPU integrada Iris Xe acelera o canvas e o WebGL, então o esperado é 60 FPS.
**Isso ainda precisa ser confirmado no notebook e no OBS.** Se faltar desempenho, use `?quality=baixa`.

## 5. O que ainda depende de arte profissional

O Levi 2.5D desta entrega é **arte provisória feita em código**, e o selo na tela diz isso.
Ela é limitada pelo que dá para desenhar com fórmulas: frente fixa (não gira de perfil),
mãos simples, sem dobras de tecido pintadas e sem textura de pincel.

Para o visual "100%", o caminho recomendado é o **Live2D**:

1. **Ilustração do Levi** feita por um ilustrador, como PSD em camadas separadas:
   franja (várias mechas), cabelo de trás, mechas laterais, cada olho (branco, íris, cílio
   superior e inferior, pálpebra), sobrancelhas, boca (aberta, fechada, dentes, língua),
   rosto, orelhas, pescoço, tronco, braços, mãos e roupa em partes. Mais as camadas da
   forma demoníaca: chifres, marcas e variação de olhos.
2. **Rigging no Live2D Cubism Editor**, por um rigger. O modelo precisa ter estes parâmetros,
   com estes IDs, porque o sistema já os envia:
   `ParamAngleX/Y/Z, ParamBodyAngleX/Y/Z, ParamBreath, ParamEyeLOpen, ParamEyeROpen,
   ParamEyeLSmile, ParamEyeRSmile, ParamEyeBallX/Y, ParamBrowLY/RY, ParamBrowLAngle/RAngle,
   ParamMouthForm, ParamMouthOpenY, ParamCheek` + os customizados
   `ParamMouthSmirk, ParamMouthWide, ParamMouthRound, ParamDemon`.
   Física configurada para cabelo, capa e brinco.
3. **Entrega em arquivos:** `levi.model3.json`, `.moc3`, texturas `.png`, `.physics3.json`,
   expressões `.exp3.json` (opcional). Pasta: `public/models/live2d/levi/`.
4. **Licença do Cubism SDK for Web:** o núcleo (`live2dcubismcore.min.js`) é baixado do site
   da Live2D, com aceite de licença. É gratuito para pessoas físicas e empresas pequenas,
   conforme os termos da Live2D, que devem ser conferidos antes. Por isso ele **não** vem
   neste repositório.
5. **Integração:** quando os arquivos existirem, criar o adaptador `Live2DRig`, que só copia
   `poseToLive2D()` para o modelo a cada quadro. Esse adaptador ainda não foi escrito porque
   não há modelo para testá-lo, e não entrego código que não pude testar.

**Alternativa sem custo:** criar o Levi no **VRoid Studio** e exportar VRM. Fica bonito em
3D anime e já funciona no modo "3D / VRM" do painel, mas tem menos cara de desenho do que o Live2D.

**Identidade:** o Levi deve continuar sendo um personagem original. Não peça ao ilustrador
para copiar personagens de anime existentes.
