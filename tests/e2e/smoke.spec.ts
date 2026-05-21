import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('OmniList Smoke Test', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/.*\/login/)
    await expect(page.getByText('Welcome to OmniList')).toBeVisible()
  })

  test('authenticated user can see their dashboard', async ({ page }) => {
    await login(page)
    await page.goto('/')
    
    // Should be on dashboard, not login
    await expect(page).toHaveURL('http://localhost:3000/')
    await expect(page.getByText('My Lists')).toBeVisible()
    await expect(page.getByText('test@example.com')).toBeVisible()
  })
})

test.describe('List Management', () => {
  test('user can create a new list', async ({ page }) => {
    await login(page)
    await page.goto('/')

    const listTitle = `Test List ${Date.now()}`
    
    await page.getByRole('button', { name: 'New List' }).click()
    await page.getByLabel('List Title').fill(listTitle)
    await page.getByRole('button', { name: 'Create List' }).click()

    await expect(page.getByText(listTitle)).toBeVisible()
  })
})
