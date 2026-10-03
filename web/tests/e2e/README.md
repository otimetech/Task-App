# Testes de navegador (Playwright)

Regra do projeto: toda mudança é validada no navegador com Playwright antes da entrega.

Os scripts rodam com a skill `playwright-skill` contra o app em `npm run dev`:

```bash
node "<playwright-skill>/run.js" tests/e2e/pendentes.e2e.js
node "<playwright-skill>/run.js" tests/e2e/regressao.e2e.js   # depois do pendentes (usa a empresa pw-teste)
```

Pré-requisitos (dados de teste, criados e removidos via SQL a cada rodada):

- Usuários confirmados `pw.admin@manutgo.test` e `pw.tecnico@manutgo.test`, senha `Teste@12345`.
- Nenhuma empresa com CNPJ `11.444.777/0001-61` nem subdomínio `pw-teste`.

`PW_HEADLESS=true` roda sem abrir janela; `PW_ARTIFACT_DIR` define onde salvar os screenshots.
