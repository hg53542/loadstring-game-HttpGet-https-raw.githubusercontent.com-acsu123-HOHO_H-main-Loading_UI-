# Skills de day trade + Time Machine no ZYNOX

As 11 skills do pacote [day-trader-skill](https://github.com/Jakeschincariol/day-trader-skill)
(MIT, commit `3d0f4ef`) estão em `.claude/skills/trader-*`. São skills do Claude Code:
dentro deste projeto aparecem como `/trader-scanner`, `/trader-timemachine` etc.

> **Não é recomendação financeira.** O Time Machine é uma simulação feita com os
> últimos ~60 pregões da própria ação, não uma previsão.

## Modo demo (paper): como está travado

1. `trader/config.json` tem `"paper": true` (e sem margem, short ou opções).
2. **Nenhum conector de corretora está configurado.** Só a `/trader-broker` leva a
   uma ordem, e ela apenas *mostra* o ticket e o JSON; quem envia é o conector MCP
   da Alpaca. Sem ele, nenhuma ordem sai, nem de papel.
3. Se um dia configurar a Alpaca, use **chaves de conta paper**, `ALPACA_PAPER_TRADE=true`
   e a ferramenta `place_stock_order` em "Needs approval" (nunca "Always allow").

## Auditoria de segurança (feita antes da instalação)

- Só Python da biblioteca padrão: nada de `pip install`, dependências ou binários.
- Rede: só **GET** em endpoints públicos (Yahoo Finance, Stooq, Nasdaq Trader,
  SEC EDGAR, House Clerk). Nenhum POST, nenhum envio de dados, nenhuma telemetria.
- Sem `eval`/`exec`/`pickle`/`shell=True`. Único `subprocess`: `pdftotext` com
  argumentos em lista (sem shell), opcional, na skill Pelosi.
- Grava arquivos só em `trader/` (escrita atômica). Lê só a variável `SEC_USER_AGENT`.
- Os `SKILL.md` não pedem `allowed-tools`, não têm hooks e não contêm instruções
  escondidas; todos repetem a regra "nenhuma ordem sem o seu sim".
- Testes: **315 testes, todos passando**, rodados com a rede desligada (usam dados
  salvos). O Time Machine reproduziu os números do README (TSLA, 19/10/2026, seed 19:
  alvo 29,4 %, stop 25,5 %, nenhum 45,1 %).

## Integrar o Time Machine (10.000 simulações) ao ZYNOX

O Time Machine é uma ferramenta de linha de comando que gera um JSON. O caminho mais
simples e seguro é: **Python calcula → JSON → o ZYNOX lê e o Levi apresenta.**

```
/trader-exit → trader/plan.json
        ↓
timemachine.py run --json  (10.000 replays, seed fixa)
        ↓
rota Next.js /api/timemachine  (valida e resume)
        ↓
painel /admin  →  ControlCommand { speak | emotion | fx }  →  Levi no /viewer
```

### 1. Rodar a simulação

```powershell
py .claude\skills\trader-timemachine\timemachine.py run --write          # usa trader/plan.json
py .claude\skills\trader-timemachine\timemachine.py run --symbol TSLA `
   --entry 364.18 --stop 358.32 --target 370.04 --entry-time "10:15 AM" --json
```

`--replays 10000` é o padrão; `--seed` torna o resultado repetível. Campos úteis do JSON:

| campo | significado |
|---|---|
| `mc.p_target`, `mc.p_stop`, `mc.p_neither` | chance de bater alvo, stop ou nenhum até o fechamento |
| `mc.p_green` | alvo primeiro ou acima da entrada no fechamento |
| `mc.median_close`, `mc.p5_close`, `mc.p95_close` | onde o preço termina (mediana e faixa de 90 %) |
| `mc.avg_R`, `mc.bands` | R médio e faixas para desenhar o "leque" de caminhos |
| `history` | a mesma regra nos pregões reais: disparou / alvo / stop |
| `verdict`, `note` | veredito e aviso em texto (em inglês) |

### 2. Rota no servidor (`src/app/api/timemachine/route.ts`)

Chamar o Python com `execFile` (sem shell), timeout e só parâmetros validados:

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

export async function POST(req: Request) {
  const b = await req.json();
  if (!/^[A-Z]{1,5}$/.test(b.symbol)) return Response.json({ error: 'ticker' }, { status: 400 });
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : null);
  const [entry, stop, target] = [num(b.entry), num(b.stop), num(b.target)];
  if (!entry || !stop || !target) return Response.json({ error: 'plano' }, { status: 400 });
  const py = process.platform === 'win32' ? 'py' : 'python3';
  const { stdout } = await run(py, ['-I', '.claude/skills/trader-timemachine/timemachine.py', 'run',
    '--symbol', b.symbol, '--entry', entry, '--stop', stop, '--target', target, '--json'],
    { timeout: 60_000, maxBuffer: 4_000_000 });
  const r = JSON.parse(stdout);
  return Response.json({ plan: r.plan, mc: r.mc, history: r.history, verdict: r.verdict, note: r.note });
}
```

Esta rota **nunca** fala com corretora. Ela só lê dados públicos e calcula.

### 3. Transformar o resultado em reação do Levi

Uma função pura em `src/core/trading/timemachine.ts` (testável no Vitest, como as
regras de presentes em `src/core/reactions/rules.ts`) que vira `ControlCommand[]`:

```ts
import type { ControlCommand } from '../control/commands';

// p_target / p_stop vêm como fração (0.2938 = 29,4 %)
export function timeMachineToCommands(
  mc: { p_target: number; p_stop: number }, symbol: string,
): ControlCommand[] {
  const alvo = (mc.p_target * 100).toFixed(1), stop = (mc.p_stop * 100).toFixed(1);
  const edge = mc.p_target - mc.p_stop;
  const emotion = Math.abs(edge) < 0.1 ? 'focused' : edge > 0 ? 'confident' : 'sad';
  return [
    { type: 'emotion', emotion },
    { type: 'gesture', gesture: Math.abs(edge) < 0.1 ? 'shrug' : 'think' },
    { type: 'speak', text: `Rodei dez mil simulações de ${symbol}: alvo primeiro ${alvo}%, stop primeiro ${stop}%. É simulação, não promessa.` },
  ];
}
```

As emoções e gestos usados existem em `EMOTIONS`/`GESTURES`. Os comandos passam por `parseCommand` e pelo
`BroadcastChannel` como qualquer outro, então o `/viewer` não precisa mudar.

### 4. Painel

Um bloco "Time Machine" no `/admin`: campos ticker/entrada/stop/alvo (ou "usar
trader/plan.json"), botão **Simular**, barras com alvo/stop/nenhum, o leque de
`mc.bands` e o botão "Levi, comenta". Mostre sempre o selo **SIMULAÇÃO · DEMO** e o
aviso `note`.

### Cuidados

- O ZYNOX hoje roda 100 % offline; o Time Machine busca dados no Yahoo. Use
  `--offline arquivo.json.gz` para demos sem internet.
- Não exponha a rota fora do `localhost`: ela executa um processo no servidor.
- Precisa de Python 3.8+ no Windows (`py --version`).
