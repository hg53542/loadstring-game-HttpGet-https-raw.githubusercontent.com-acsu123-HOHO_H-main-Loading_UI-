# Módulo `storage` — Persistência (SQLite)

**Status:** não iniciado — entra junto com a memória da IA (etapa 3).

**Responsabilidade:** banco SQLite local (arquivo em `data/`, fora do git), migrações
versionadas e repositórios por domínio (memória da IA, universo, ranking, configurações).
Nenhum outro módulo acessa o banco diretamente.
