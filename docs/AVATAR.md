# Avatar: modelo provisório × personagem final

## Hoje: modelo PROVISÓRIO

`src/avatar/procedural/buildLevi.ts` monta o Levi com 102 malhas 3D (~15,5 mil triângulos: esferas, cápsulas,
cones) presas a um esqueleto humanoide com os mesmos nomes de ossos do VRM. Ele existe para
desenvolver e testar animação, câmera, luz e painel **antes** de existir o modelo final.

Ele é sinalizado como provisório em três lugares: `ProceduralRig.isPlaceholder = true`,
selo "MODELO PROVISÓRIO" no `/viewer` e `/admin`, e tag "provisório" no status do painel.

**Estilo anime (cel shading):** sombra em 3 faixas (`MeshToonMaterial`), contorno preto
por casco invertido, cabeça com queixo em V e olhos de anime (íris em degradê, brilhos,
cílio com "asinha"). Ver `src/avatar/procedural/toon.ts`.

**Identidade própria:** o Levi não copia nenhum personagem existente. Olhos âmbar,
mechas frontais próprias, sobretudo carmesim e roxo com abas longas, chifres e marcas
nas bochechas só na forma demoníaca. Não use traços característicos de personagens de
anime existentes (cor dos olhos, roupa, símbolos ou marcas típicas): além de não ser
original, isso gera risco de denúncia numa live monetizada.

Limitações conhecidas do provisório: corpo feito de primitivas, mãos sem dedos, rosto
desenhado com discos (sem malha facial deformável), cabelo sem física.

## Personagem final: arquivo VRM

O caminho recomendado, sem custo e com direitos claros:

1. **VRoid Studio** (gratuito) para criar o Levi do zero: cabelo loiro, rosto, roupa de
   guerreiro. Um modelo criado por você no VRoid Studio é seu.
2. **Blender** + add-on VRM para os extras que o VRoid não faz: chifres, marcas, aura,
   armadura detalhada, e a expressão customizada `demon`.
3. Exportar como **VRM 1.0**.

### Requisitos técnicos do VRM final

- Humanoide VRM completo (ossos obrigatórios; `upperChest` e ombros recomendados).
- Expressões preset: `blink`, `blinkLeft`, `blinkRight`, `happy`, `angry`, `sad`,
  `surprised`, `relaxed`, `aa`, `ih`, `ou`, `ee`, `oh` (as 5 vogais são essenciais para a
  sincronização labial da etapa 2).
- Expressão customizada **`demon`** (0 → 1): chifres, olhos vermelhos, marcas. O `VrmRig`
  já envia o nível de transformação para ela se existir.
- Orçamento para o notebook alvo: até ~40 mil triângulos, texturas de até 2048 px.

### Como testar um VRM hoje

- No `/admin`: **Modelo 3D → Carregar .vrm…** (arquivo fica só no navegador).
- Ou copie para `public/models/levi.vrm` e abra `/viewer?vrm=/models/levi.vrm`.

O VRM carregado continua marcado como **provisório**. Ele só vira "final" quando for
explicitamente aprovado (`vrmIsFinal` no código), evitando confundir um teste com o personagem oficial.

> Estado honesto: o `VrmRig` tem teste automatizado com um VRM simulado. Ainda **não** foi
> testado com um arquivo VRM real, porque nenhum modelo com licença adequada foi adicionado
> ao projeto. Isso deve ser validado assim que o modelo do Levi existir.

### Checklist de licença antes de usar qualquer VRM

- [ ] Quem é o autor? Está registrado em `docs/LICENCAS.md`?
- [ ] Permite uso por terceiros em transmissões ao vivo?
- [ ] Permite uso comercial (lives monetizadas, presentes do TikTok)?
- [ ] Permite modificação (adicionar chifres/expressões)?
- [ ] Permite violência/conteúdo de batalha, se aplicável?
