// Regressão das telas afetadas por FormField/AppButton: login com erro, Configurações (dados, cores, domínio), mobile
const os = require('node:os')
const path = require('node:path')
const { chromium } = require('playwright')

const EMP = 'http://pw-teste.localhost:3000'
const ART = process.env.PW_ARTIFACT_DIR || os.tmpdir()
const resultados = []
const ok = (cond, msg) => { resultados.push(cond); console.log(`${cond ? 'OK   ' : 'FALHA'} ${msg}`) }
const pronto = (page) => page.locator('button[type=submit]:enabled').first().waitFor()

;(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS === 'true' })
  const erros = []
  try {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    page.on('pageerror', (e) => erros.push(e.message))

    await page.goto(`${EMP}/login`)
    await pronto(page)
    await page.getByLabel('E-mail').fill('pw.admin@manutgo.test')
    await page.getByLabel('Senha').fill('errada')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    ok((await page.getByRole('alert').textContent()).includes('E-mail ou senha incorretos.'), 'login com senha errada')
    await page.getByLabel('Senha').fill('Teste@12345')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.getByText('Olá,').waitFor()

    await page.locator('aside').getByRole('link', { name: 'Configurações' }).click()
    await page.getByRole('heading', { name: 'Configurações' }).waitFor()
    await pronto(page)
    await page.getByLabel('Responsável').fill('Fulano PW')
    await page.getByRole('button', { name: 'Salvar dados' }).click()
    await page.getByRole('status').filter({ hasText: 'Dados salvos.' }).waitFor()
    ok(true, 'Configurações > Dados salva')
    ok(await page.getByLabel('CNPJ').isDisabled(), 'CNPJ somente leitura')

    await page.getByRole('button', { name: 'Identidade visual' }).click()
    await page.getByPlaceholder('#004E61').fill('#7A1FA2')
    await page.waitForTimeout(400) // transição de cor do botão (150 ms)
    const cor = await page.getByRole('button', { name: 'Salvar cores' }).evaluate((b) => getComputedStyle(b).backgroundColor)
    ok(cor === 'rgb(122, 31, 162)', `prévia de cor: ${cor}`)
    await page.getByRole('button', { name: 'Restaurar padrão' }).click()
    await page.getByRole('status').filter({ hasText: 'Cores padrão restauradas.' }).waitFor()
    ok(true, 'restaurar cores padrão')

    await page.getByRole('button', { name: 'Domínio' }).click()
    await page.getByLabel('Novo subdomínio').fill('ab')
    await page.getByRole('button', { name: 'Alterar subdomínio' }).click()
    ok(await page.getByText(/de 3 a 63 caracteres/).isVisible(), 'subdomínio curto bloqueado no cliente')
    await page.screenshot({ path: path.join(ART, 'pw-5-config-dominio.png'), fullPage: true })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Dados' }).click()
    const largura = await page.evaluate(() => document.documentElement.scrollWidth)
    ok(largura <= 390, `mobile sem rolagem horizontal (largura ${largura})`)
    await page.screenshot({ path: path.join(ART, 'pw-6-config-mobile.png'), fullPage: true })
  } catch (e) {
    ok(false, `exceção: ${e.message.split('\n')[0]}`)
  } finally {
    ok(erros.length === 0, `sem erros de JavaScript${erros.length ? ': ' + erros.join(' | ') : ''}`)
    await browser.close()
    const falhas = resultados.filter((r) => !r).length
    console.log(`\n${resultados.length - falhas}/${resultados.length} verificações OK`)
    process.exitCode = falhas ? 1 : 0
  }
})()
