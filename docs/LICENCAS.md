# Licenças

## Política de assets (modelos, texturas, sons, vozes)

1. **Nenhum asset entra no projeto sem licença registrada nesta página.**
2. Modelos `.vrm` ficam em `public/models/` e são **ignorados pelo git** (`.gitignore`),
   para evitar distribuir por engano um arquivo sem direito de redistribuição.
3. Para cada asset, registre: nome, autor, origem (link), licença, se permite uso
   comercial/em lives, se permite modificação, e data.
4. Modelo provisório ≠ personagem final. Ver `docs/AVATAR.md`.

### Assets atualmente no projeto

| Asset | Autor | Licença |
|---|---|---|
| Levi provisório (`src/avatar/procedural/buildLevi.ts`) | gerado em código neste projeto | do projeto |

Nenhum modelo, textura, som ou fonte de terceiros está incluído.

## Dependências de software (verificado em 02/11/2026)

Bibliotecas principais — todas **MIT**:
`next` 15.5, `react`/`react-dom` 19.2, `three` 0.187, `@react-three/fiber` 9.8,
`@react-three/drei` 10.7, `@pixiv/three-vrm` 3.5, `zustand` 5.0.

Árvore completa de produção: 81 MIT, 10 Apache-2.0, 5 ISC, 2 BSD-3-Clause, 1 0BSD, e:

| Pacote | Licença | Observação |
|---|---|---|
| `@img/sharp-libvips-*` (opcional do Next, otimização de imagens) | LGPL-3.0-or-later | biblioteca nativa carregada dinamicamente; uso local sem modificação é compatível |
| `caniuse-lite` | CC-BY-4.0 | dados usados só no build |
| `webgl-constants` (via drei → detect-gpu) | MIT (arquivo LICENSE; campo ausente no package.json) | — |

Para refazer o levantamento:

```bash
npm ls --omit=dev --all --parseable
```
