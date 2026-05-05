import { test, expect } from '@playwright/test'

async function bootstrapAndLogin(page: import('@playwright/test').Page) {
  const setupResponse = await page.request.post('http://localhost:3000/api/test/setup', {
    data: { name: `E2E ${Date.now()}` },
  })
  expect(setupResponse.ok()).toBeTruthy()

  const setup = (await setupResponse.json()) as { companyId: string; email: string; password: string }

  await page.goto('/login')
  await page.fill('#login-email', setup.email)
  await page.fill('#login-password', setup.password)
  await page.click('#login-submit')
  await expect(page).toHaveURL('/')

  return setup
}

async function postJson(page: import('@playwright/test').Page, path: string, data: unknown) {
  return page.evaluate(async ({ path, data }) => {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const text = await response.text()
    return { status: response.status, ok: response.ok, text }
  }, { path, data })
}

async function getJson(page: import('@playwright/test').Page, path: string) {
  return page.evaluate(async ({ path }) => {
    const response = await fetch(path, { cache: 'no-store' })
    const text = await response.text()
    return { status: response.status, ok: response.ok, text }
  }, { path })
}

test('process sale via test endpoint reduces stock and creates sale', async ({ page }) => {
  const setup = await bootstrapAndLogin(page)
  const companyId = setup.companyId

  const p1Response = await postJson(page, '/api/test/create-product', { companyId, name: 'P1', sku: `P1-${Date.now()}`, price: 10, stockQty: 10 })
  expect(p1Response.ok).toBeTruthy()
  const p1 = JSON.parse(p1Response.text) as { product: { id: string } }

  const p2Response = await postJson(page, '/api/test/create-product', { companyId, name: 'P2', sku: `P2-${Date.now()}`, price: 5, stockQty: 5 })
  expect(p2Response.ok).toBeTruthy()
  const p2 = JSON.parse(p2Response.text) as { product: { id: string } }

  const items = [{ productId: p1.product.id, quantity: 2 }, { productId: p2.product.id, quantity: 1 }]
  const res = await postJson(page, '/api/test/process-sale', { companyId, items, paymentMethod: 'CASH', discount: 0 })
  expect(res.ok).toBeTruthy()
  const body = JSON.parse(res.text) as { sale: { id: string } }
  expect(body.sale).toBeTruthy()

  const prod1Response = await getJson(page, `/api/test/get-product?productId=${p1.product.id}`)
  expect(prod1Response.ok).toBeTruthy()
  const prod1 = JSON.parse(prod1Response.text) as { product: { stockQty: number } }
  expect(prod1.product.stockQty).toBe(8)

  const prod2Response = await getJson(page, `/api/test/get-product?productId=${p2.product.id}`)
  expect(prod2Response.ok).toBeTruthy()
  const prod2 = JSON.parse(prod2Response.text) as { product: { stockQty: number } }
  expect(prod2.product.stockQty).toBe(4)
})
