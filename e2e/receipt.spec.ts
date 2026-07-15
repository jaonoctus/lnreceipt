import { test, expect } from '@playwright/test'

import { validReceipt, wrongPreimage } from '../tests/fixtures/receipt'

test.describe('empty state', () => {
  test('shows the receipt header and awaiting message', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Lightning Receipt' })).toBeVisible()
    await expect(page.getByText('Awaiting invoice + preimage')).toBeVisible()
    await expect(page.getByText('*** Powered by math ***')).toBeVisible()
  })
})

test.describe('verification', () => {
  test('shows PAID stamp and receipt details for a valid invoice + preimage', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('textbox', { name: 'Invoice' }).fill(validReceipt.invoice)
    await page.getByRole('textbox', { name: 'Preimage' }).fill(validReceipt.preimage)

    await expect(page.getByText('Paid', { exact: true })).toBeVisible()

    await expect(page.getByText(validReceipt.dateUTC)).toBeVisible()
    await expect(page.getByText(validReceipt.receiptNumber, { exact: true })).toBeVisible()
    await expect(page.getByText(validReceipt.description)).toBeVisible()
    await expect(page.getByText('1,500 SATS')).toBeVisible()
    await expect(page.getByText(validReceipt.paymentHash)).toBeVisible()
    await expect(page.getByText(validReceipt.payeePubkey)).toBeVisible()
    await expect(page.getByRole('link', { name: /view/i })).toHaveAttribute(
      'href',
      `https://amboss.space/node/${validReceipt.payeePubkey}`,
    )
    await expect(page.getByText('*** Thank you for your payment ***')).toBeVisible()
  })

  test('shows INVALID stamp when the preimage does not match', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('textbox', { name: 'Invoice' }).fill(validReceipt.invoice)
    await page.getByRole('textbox', { name: 'Preimage' }).fill(wrongPreimage)

    await expect(page.getByText('Invalid', { exact: true })).toBeVisible()
    await expect(page.getByText('Preimage does not match payment hash')).toBeVisible()
    await expect(page.getByText('Paid', { exact: true })).not.toBeVisible()
    await expect(page.getByText('*** Powered by math ***')).toBeVisible()
  })

  test('prompts for the preimage when only the invoice is provided', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('textbox', { name: 'Invoice' }).fill(validReceipt.invoice)

    await expect(page.getByText('Paste preimage to verify')).toBeVisible()
    await expect(page.getByText('1,500 SATS')).toBeVisible()
  })

  test('keeps the awaiting state for an invalid invoice', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('textbox', { name: 'Invoice' }).fill('lnbc1notavalidinvoice')
    await page.getByRole('textbox', { name: 'Preimage' }).fill(validReceipt.preimage)

    await expect(page.getByText('Awaiting invoice + preimage')).toBeVisible()
  })
})

test.describe('shared receipt links', () => {
  test('verifies a receipt loaded from query params', async ({ page }) => {
    await page.goto(`/?invoice=${validReceipt.invoice}&preimage=${validReceipt.preimage}`)

    await expect(page.getByRole('textbox', { name: 'Invoice' })).toHaveValue(validReceipt.invoice)
    await expect(page.getByRole('textbox', { name: 'Preimage' })).toHaveValue(validReceipt.preimage)
    await expect(page.getByText('Paid', { exact: true })).toBeVisible()
  })

  test('lowercases uppercase query params before verifying', async ({ page }) => {
    await page.goto(
      `/?invoice=${validReceipt.invoice.toUpperCase()}&preimage=${validReceipt.preimage.toUpperCase()}`,
    )

    await expect(page.getByRole('textbox', { name: 'Invoice' })).toHaveValue(validReceipt.invoice)
    await expect(page.getByText('Paid', { exact: true })).toBeVisible()
  })

  test('copies a shareable link containing invoice and preimage', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')

    await expect(page.getByRole('button', { name: 'Copy Link' })).not.toBeVisible()

    await page.getByRole('textbox', { name: 'Invoice' }).fill(validReceipt.invoice)
    await page.getByRole('textbox', { name: 'Preimage' }).fill(validReceipt.preimage)

    const copyButton = page.getByRole('button', { name: 'Copy Link' })
    await copyButton.click()
    await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible()

    const copied = await page.evaluate(() => navigator.clipboard.readText())
    const url = new URL(copied)
    expect(url.searchParams.get('invoice')).toBe(validReceipt.invoice)
    expect(url.searchParams.get('preimage')).toBe(validReceipt.preimage)
  })
})
