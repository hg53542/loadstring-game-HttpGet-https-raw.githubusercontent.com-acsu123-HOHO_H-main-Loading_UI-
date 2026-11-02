# Arquitetura

## Princípio central

Toda a "inteligência de movimento" vive em **TypeScript puro** (`src/core`), sem React e
sem Three.js. Ela produz, a cada quadro, uma **`Pose`** genérica. Um **rig** traduz a `Pose`
para um modelo 3D específico. Isso permite:

- testar animação em Node, sem navegador (43 testes rodam em < 1 s);
- trocar o modelo provisório pelo VRM final **sem mexer em animação, IA, TikTok etc.**;
- que qualquer módulo (painel, IA, TikTok, batalhas) controle o avatar pelo mesmo protocolo.

## Fluxo de dados

```
 Painel / IA / TikTok / atalhos
            │  ControlCommand (validado por parseCommand)
            ▼
   useLeviRuntime.dispatch ──► BroadcastChannel ──► outras abas (/viewer)
            │
            ├─ comandos de animação ─► AnimationController
            │                              │ update(dt) a cada quadro
            │                              ▼
            │                            Pose { bones, expressions, lookAt, breath, demon, hipsOffsetY }
            │                              │
            │                              ▼
            │                     AvatarRig.apply(pose)
            │                     ├─ ProceduralRig → modelo provisório
            │                     └─ VrmRig        → VRM (personagem final)
            │
            └─ comandos de cena (câmera, luz) ─► useSceneStore (zustand) ─► CameraRig / Lighting
```

## Camadas de animação (`src/core/animation/layers`)

Aplicadas nesta ordem sobre a pose de descanso, de forma **aditiva**:

| Camada | O que faz |
|---|---|
| `BreathingLayer` | Ciclo assimétrico (inspira 40%, expira 60%) no peito, ombros e pescoço |
| `EmotionLayer` | Pesos por emoção com transição exponencial; expressão + postura |
| `DemonLayer` | Nível 0–1 com suavização; postura imponente e tremor durante a transição |
| `HeadMotionLayer` | Sacadas do olhar (olhos rápidos, cabeça lenta) + deriva natural |
| `GestureLayer` | Um gesto por vez, com envelope de entrada/saída |
| `BlinkLayer` | Intervalos de 1,8–6 s, piscadas duplas ocasionais (15%) |

Aleatoriedade usa um gerador com **semente** — a mesma semente gera exatamente a mesma
animação (base dos testes determinísticos).

## Convenções de esqueleto (iguais ao VRM 1.0 normalizado)

- Personagem olha para **+Z**; esquerda dele é **+X**; para cima **+Y**. Pose de descanso = T-pose.
- Braço **esquerdo**: sobe com Z+, vai para frente com Y−. Braço **direito**: sobe com Z−, frente com Y+.
- Rotação X positiva na cabeça = olhar para baixo.

## Como adicionar…

**Um gesto:** adicione o nome em `GESTURES` (`types.ts`) e a definição em `GESTURE_DEFS`
(`layers/gestures.ts`). Rótulo em `src/ui/labels.ts`. Os testes já cobrem automaticamente
"altera a pose e termina sozinho". Para gestos com alvo (mão no queixo etc.), meça a posição
da mão como em `rigs.test.ts`.

**Uma emoção:** `EMOTIONS` + `EMOTION_DEFS` + rótulo. Se usar uma expressão VRM nova,
adicione em `EXPRESSIONS` e trate em `ProceduralRig`.

**Um comando novo:** tipo em `ControlCommand`, validação em `parseCommand`, teste em
`commands.test.ts`. Dados externos **sempre** passam por `parseCommand`.

## Módulos futuros (`src/modules`)

Cada pasta tem um README com responsabilidade e contrato. Regra geral: módulos **emitem
`ControlCommand`s** e nunca mexem diretamente na cena ou no modelo.

## Decisões técnicas

| Decisão | Motivo |
|---|---|
| Next.js 15 + React 19 + R3F 9 | Pedido do projeto; R3F 9 exige React 19 |
| TypeScript 5.9 (não 7) | Compatibilidade garantida com Next 15 |
| Telas 3D com `ssr: false` | WebGL só existe no navegador |
| zustand só para estado de cena | Estado de animação muda 60×/s; fica fora do React para não re-renderizar |
| Vitest em ambiente Node | Núcleo é puro; Three.js funciona sem DOM para checar geometria |
| Qualidade `baixa/media/alta` | Notebook alvo (i5-1334U, Iris Xe, 8 GB) |
