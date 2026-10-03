// Valida: cadastro com e-mail existente, contador de pendentes (Minhas empresas, sidebar, bottom nav) e aprovação
const os = require('node:os')
const path = require('node:path')
const { chromium } = require('playwright')

const RAIZ = process.env.TARGET_URL || 'http://localhost:3000'
const SUB = 'pw-teste'
const EMP = `http://${SUB}.localhost:3000`
const SENHA = 'Teste@12345'
const ART = process.env.PW_ARTIFACT_DIR || os.tmpdir()
const resultados = []
const ok = (cond, msg) => { resultados.push(cond); console.log(`${cond ? 'OK   ' : 'FALHA'} ${msg}`) }
const shot = (page, nome) => page.screenshot({ path: path.join(ART, `pw-${nome}.png`), fullPage: true })

// Página interativa (hidratada): botão de envio habilitado
const pronto = (page) => page.locator('button[type=submit]:enabled').first().waitFor()

async function entrar(page, base, email) {
  await page.goto(`${base}/login`)
  await pronto(page)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

;(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS === 'true' })
  const erros = []
  try {
    const novaPagina = async () => {
      const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
      p.on('pageerror', (e) => erros.push(e.message))
      return p
    }

    // 1. Cadastro com e-mail que já tem conta
    const p0 = await novaPagina()
    await p0.goto(`${RAIZ}/cadastro`)
    await pronto(p0)
    await p0.getByLabel('Nome').fill('Qualquer')
    await p0.getByLabel('E-mail').fill('pw.admin@manutgo.test')
    await p0.getByLabel('Senha', { exact: true }).fill('12345678')
    await p0.getByLabel('Confirmar senha').fill('12345678')
    await p0.getByRole('button', { name: 'Criar conta' }).click()
    const alerta = p0.getByRole('alert')
    await alerta.waitFor()
    ok((await alerta.textContent()).includes('Já existe uma conta com este e-mail.'), 'cadastro avisa conta existente')
    ok(await p0.getByRole('link', { name: 'Recuperar senha' }).isVisible(), 'oferece recuperar senha')
    await shot(p0, '1-cadastro-existente')

    // 2. Admin cria empresa
    const pa = await novaPagina()
    await entrar(pa, RAIZ, 'pw.admin@manutgo.test')
    await pa.getByRole('button', { name: 'Criar empresa' }).first().click()
    await pronto(pa)
    await pa.getByLabel('Razão social').fill('PW Teste Ltda (TESTE)')
    await pa.getByLabel('Nome fantasia').fill('PW Teste')
    await pa.getByLabel('CNPJ').fill('11444777000161')
    await pa.getByLabel('Sua matrícula').fill('PW1')
    await pa.getByLabel('Subdomínio').fill(SUB)
    await pa.getByText('· Disponível').waitFor()
    await pa.getByRole('button', { name: 'Criar empresa' }).click()
    await pa.waitForURL(`${EMP}/**`)
    ok(true, 'empresa criada e redirecionada ao subdomínio')

    // 3. Técnico solicita acesso
    const pt = await novaPagina()
    await entrar(pt, RAIZ, 'pw.tecnico@manutgo.test')
    await pt.getByRole('button', { name: 'Entrar em uma empresa' }).click()
    await pronto(pt)
    await pt.getByLabel('CNPJ da empresa').fill('11.444.777/0001-61')
    await pt.getByRole('button', { name: 'Solicitar acesso' }).click()
    await pt.getByText('Aguardando aprovação').waitFor()
    ok(true, 'técnico solicitou acesso')

    // 4. Admin vê pendente em Minhas empresas
    await pa.goto(`${RAIZ}/empresas`)
    if (pa.url().includes('/login')) await entrar(pa, RAIZ, 'pw.admin@manutgo.test')
    await pa.goto(`${RAIZ}/empresas`)
    const linkPend = pa.getByRole('link', { name: /1 solicitação pendente/ })
    await linkPend.waitFor()
    ok(true, 'Minhas empresas mostra "1 solicitação pendente"')
    await shot(pa, '2-minhas-empresas-pendente')

    // 5. Link leva a Usuários (login no subdomínio em localhost)
    await linkPend.click()
    await pa.waitForURL(/pw-teste\.localhost/)
    if (pa.url().includes('/login')) {
      ok(pa.url().includes('redirect=/usuarios') || pa.url().includes('redirect=%2Fusuarios'), 'login preserva destino /usuarios')
      await pronto(pa)
      await pa.getByLabel('E-mail').fill('pw.admin@manutgo.test')
      await pa.getByLabel('Senha').fill(SENHA)
      await pa.getByRole('button', { name: 'Entrar', exact: true }).click()
    }
    await pa.getByRole('heading', { name: 'Usuários' }).waitFor()
    ok(true, 'chega em Usuários')
    const badge = pa.locator('aside').getByRole('link', { name: /Usuários/ })
    ok((await badge.textContent()).includes('1'), 'sidebar mostra contador 1 em Usuários')
    ok(await pa.getByText('pw.tecnico@manutgo.test').isVisible(), 'abre direto na aba Pendentes')
    const tabs = pa.getByRole('navigation').filter({ hasText: 'Pendentes' })
    ok(await tabs.evaluate((el) => el.offsetHeight - el.clientHeight <= 1 && el.offsetWidth === el.clientWidth), 'abas sem barra de rolagem vertical')
    await shot(pa, '3-usuarios-desktop')

    // 6. Mobile: ponto no "Mais" e contador na folha
    await pa.setViewportSize({ width: 390, height: 844 })
    ok(await pa.getByLabel('Solicitações pendentes').isVisible(), 'mobile: indicador no botão Mais')
    await pa.getByRole('button', { name: 'Mais' }).click()
    await shot(pa, '4-mobile-mais')
    await pa.getByRole('button', { name: 'Mais' }).click()
    await pa.setViewportSize({ width: 1440, height: 900 })

    // 7. Aprovar zera o contador
    await pa.getByRole('button', { name: 'Aprovar' }).click()
    await pa.getByRole('dialog').getByLabel('Matrícula').fill('PW2')
    await pa.getByRole('dialog').getByRole('button', { name: 'Aprovar' }).click()
    await pa.getByRole('status').filter({ hasText: /aprovado/i }).waitFor()
    await pa.waitForTimeout(500)
    ok(!/\d/.test(await badge.textContent()), 'contador some após aprovar')
    ok(!(await pa.getByLabel('Solicitações pendentes').count()), 'indicador mobile some após aprovar')
    await pa.goto(`${RAIZ}/empresas`)
    if (pa.url().includes('/login')) await entrar(pa, RAIZ, 'pw.admin@manutgo.test')
    await pa.goto(`${RAIZ}/empresas`)
    await pa.getByText('PW Teste').first().waitFor()
    ok(!(await pa.getByText(/solicitaç(ão|ões) pendente/).count()), 'Minhas empresas sem pendentes após aprovar')

    // 8. Técnico não vê contador (não é admin)
    await entrar(pt, EMP, 'pw.tecnico@manutgo.test')
    await pt.getByText('Olá,').waitFor()
    ok(!(await pt.locator('aside').getByRole('link', { name: /Usuários/ }).count()), 'técnico não vê Usuários/contador')
  } catch (e) {
    ok(false, `exceção: ${e.message.split('\n')[0]}`)
  } finally {
    ok(erros.length === 0, `sem erros de JavaScript na página${erros.length ? ': ' + erros.join(' | ') : ''}`)
    await browser.close()
    const falhas = resultados.filter((r) => !r).length
    console.log(`\n${resultados.length - falhas}/${resultados.length} verificações OK — screenshots em ${ART}`)
    process.exitCode = falhas ? 1 : 0
  }
})()
