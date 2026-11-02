# Live 3D

Cenário 3D para transmissões ao vivo, feito com [Three.js](https://threejs.org/). Roda direto no navegador e pode ser usado como **Fonte de Navegador** no OBS / Streamlabs.

## Recursos

- Palco com luzes neon, arcos animados, partículas e telão com equalizador
- Avatar animado (respira, pisca, acena quando chega mensagem)
- **Reage ao microfone**: boca, cabeça e luzes acompanham sua voz
- Selo **AO VIVO**, cronômetro e contador de espectadores
- Chat sobreposto (com mensagens de demonstração ou digitadas por você)
- 3 câmeras com transição suave + órbita automática

## Como usar

Sirva a pasta com qualquer servidor estático (o microfone exige `http://localhost` ou HTTPS):

```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

### Atalhos

| Tecla | Ação |
|-------|------|
| `1` `2` `3` | Trocar câmera |
| `O` | Liga/desliga órbita automática |
| `C` | Trocar cor do cenário |
| `H` | Esconder/mostrar painel |

### Parâmetros de URL

| Parâmetro | Efeito |
|-----------|--------|
| `obs=1` | Esconde o painel de controles |
| `transparent=1` | Fundo transparente (para sobrepor à câmera no OBS) |
| `title=...` / `sub=...` | Define título e subtítulo |
| `nobots=1` | Desliga as mensagens de demonstração |

Exemplo para OBS: `http://localhost:8080/?obs=1&title=Live%20de%20Sexta`

### No OBS

1. *Fontes → + → Navegador*
2. URL: o endereço acima, largura 1920, altura 1080
3. Para usar o microfone dentro do OBS, abra a página uma vez no navegador e use *Interagir* na fonte para clicar em “🎤 Microfone”.
