# Testes — Solicitações de Plantio

## PATCH /solicitacoes/{id}/status
> Requer LIDER_HORTA ou ADMIN_SUPREMO

| # | Usuário | Cenário | Esperado |
|---|---------|---------|----------|
| 23 | Não autenticado | — | 401 |
| 24 | MEMBRO_CANTEIRO | — | 403 |
| 25 | qualquer lider | solicitação inexistente | 404 |
| 26 | qualquer lider | status inválido (fora do enum) | 422 |
| 27 | LIDER_HORTA | solicitação da sua horta → APROVADA | 200 |
| 28 | LIDER_HORTA | solicitação da sua horta → RECUSADA | 200 |
| 29 | LIDER_HORTA | solicitação de outra horta | 403 |
| 30 | ADMIN_SUPREMO | qualquer solicitação | 200 |

---

## DELETE /solicitacoes/{id}
> MEMBRO_CANTEIRO só pode remover do seu canteiro; LIDER_HORTA só da sua horta

| # | Usuário | Cenário | Esperado |
|---|---------|---------|----------|
| 31 | Não autenticado | — | 401 |
| 32 | qualquer | solicitação inexistente | 404 |
| 33 | MEMBRO_CANTEIRO | solicitação do seu canteiro | 200 |
| 34 | MEMBRO_CANTEIRO | solicitação de canteiro de outro membro | 403 |
| 35 | LIDER_HORTA | solicitação de canteiro da sua horta | 200 |
| 36 | LIDER_HORTA | solicitação de canteiro de outra horta | 403 |
| 37 | ADMIN_SUPREMO | qualquer solicitação | 200 |
