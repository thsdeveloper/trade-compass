import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite for F002: Magic Link Authentication
 *
 * Tests passwordless authentication flow using magic links.
 * This suite verifies:
 * - Magic link request UI and form submission
 * - Success/error message display
 * - Backend API integration
 * - UI navigation and state management
 *
 * NOTE: Actual email delivery and link clicking cannot be tested in E2E.
 * These tests verify the request flow and API integration only.
 * The callback handler is tested separately with manual URL manipulation.
 */

test.describe('F002: Magic Link Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/auth');
    await page.waitForLoadState('networkidle');
  });

  /**
   * Scenario 1: User can navigate to magic link mode
   */
  test('User can navigate to magic link mode from login page', async ({ page }) => {
    // Verify we're on login page by checking for password field (unique to login/register)
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Click magic link button
    const magicLinkButton = page.getByTestId('magic-link-mode-button');
    await expect(magicLinkButton).toBeVisible();
    await magicLinkButton.click();

    // Verify mode changed
    await expect(page.getByRole('heading', { name: 'Acesso Sem Senha' })).toBeVisible();
    await expect(page.getByText('Receba um link de acesso direto no seu email')).toBeVisible();

    // Verify password field is NOT present
    await expect(page.locator('input[type="password"]')).not.toBeVisible();

    // Verify email field IS present
    await expect(page.locator('input[type="email"][name="email"]')).toBeVisible();

    // Verify submit button has correct label
    await expect(page.locator('button[type="submit"]')).toContainText('Enviar Link de Acesso');
  });

  /**
   * Scenario 2: Magic link mode shows correct UI elements
   */
  test('Magic link mode displays all required UI elements', async ({ page }) => {
    // Navigate to magic link mode
    await page.getByTestId('magic-link-mode-button').click();

    // Verify all required elements
    await expect(page.getByRole('heading', { name: 'Acesso Sem Senha' })).toBeVisible();
    await expect(page.getByText('Receba um link de acesso direto no seu email')).toBeVisible();
    await expect(page.locator('input[type="email"][name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify back to login button exists
    const backButton = page.getByTestId('back-to-login');
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('Voltar para login');
  });

  /**
   * Scenario 3: User can navigate back to login from magic link mode
   */
  test('User can return to login page from magic link mode', async ({ page }) => {
    // Go to magic link mode
    await page.getByTestId('magic-link-mode-button').click();
    await expect(page.getByRole('heading', { name: 'Acesso Sem Senha' })).toBeVisible();

    // Click back to login
    await page.getByTestId('back-to-login').click();

    // Verify we're back on login page
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByText('Acesse sua conta para gerenciar sua watchlist')).toBeVisible();

    // Verify password field is back
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  /**
   * Scenario 4: User enters email and requests magic link
   */
  test('User can request magic link with valid email', async ({ page }) => {
    // Navigate to magic link mode
    await page.getByTestId('magic-link-mode-button').click();

    // Fill email field
    const emailInput = page.locator('input[type="email"][name="email"]');
    await emailInput.fill('test@example.com');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for response - should show success message with magic-link-specific test ID
    const successMessage = page.getByTestId('magic-link-sent-message');
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Verify success message content (backend returns security-conscious message)
    await expect(successMessage).toContainText('link de acesso');

    // Verify email field was cleared
    await expect(emailInput).toHaveValue('');
  });

  /**
   * Scenario 5: Form requires email to be provided
   */
  test('Magic link form validates required email field', async ({ page }) => {
    // Navigate to magic link mode
    await page.getByTestId('magic-link-mode-button').click();

    // Try to submit without email
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // HTML5 validation should prevent submission
    // Email input should be marked as invalid
    const emailInput = page.locator('input[type="email"][name="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  /**
   * Scenario 6: Email field requires valid email format
   */
  test('Magic link form validates email format', async ({ page }) => {
    // Navigate to magic link mode
    await page.getByTestId('magic-link-mode-button').click();

    // Enter invalid email
    const emailInput = page.locator('input[type="email"][name="email"]');
    await emailInput.fill('invalid-email');

    // Try to submit
    await page.locator('button[type="submit"]').click();

    // HTML5 validation should prevent submission
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  /**
   * Scenario 7: Backend API endpoint responds correctly
   */
  test('Backend magic link endpoint is accessible and responds', async ({ page }) => {
    // Test backend endpoint directly
    const response = await page.request.post('http://localhost:3001/auth/magic-link', {
      data: {
        email: 'test@example.com',
      },
    });

    expect(response.ok()).toBe(true);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('message');
    // Backend returns security-conscious message - could be either depending on email existence
    expect(data.message).toMatch(/(Link de acesso|link de acesso)/);
  });

  /**
   * Scenario 8: Backend validates email is required
   */
  test('Backend magic link endpoint validates missing email', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/auth/magic-link', {
      data: {},
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('message');
    expect(data.message).toContain('obrigatório');
  });

  /**
   * Scenario 9: Callback route exists and handles missing parameters
   */
  test('Auth callback route handles missing code parameter', async ({ page }) => {
    // Navigate to callback without code parameter
    await page.goto('http://localhost:3000/auth/callback');

    // Should redirect to auth page with error
    await page.waitForURL('**/auth**', { timeout: 5000 });

    // Verify error message is displayed
    const errorMessage = page.getByTestId('error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('inválido');
  });

  /**
   * Scenario 10: Callback route handles Supabase error parameters
   */
  test('Auth callback route displays Supabase error messages', async ({ page }) => {
    // Navigate to callback with error parameter (simulating Supabase error)
    await page.goto('http://localhost:3000/auth/callback?error=invalid_request&error_description=Link%20expired');

    // Should redirect to auth page with error
    await page.waitForURL('**/auth**', { timeout: 5000 });

    // Verify error message from URL parameter is displayed
    const errorMessage = page.getByTestId('error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Link expired');
  });

  /**
   * Scenario 11: UI loading state during submission
   */
  test('Magic link form shows loading state during submission', async ({ page }) => {
    // Navigate to magic link mode
    await page.getByTestId('magic-link-mode-button').click();

    // Fill email
    await page.locator('input[type="email"][name="email"]').fill('test@example.com');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Button should show loading state immediately (may be brief)
    // Check if button text changed or is disabled
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  /**
   * Scenario 12: Multiple magic link requests
   */
  test('User can request multiple magic links', async ({ page }) => {
    // Navigate to magic link mode
    await page.getByTestId('magic-link-mode-button').click();

    // First request
    await page.locator('input[type="email"][name="email"]').fill('test1@example.com');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByTestId('magic-link-sent-message')).toBeVisible();

    // Second request
    await page.locator('input[type="email"][name="email"]').fill('test2@example.com');
    await page.locator('button[type="submit"]').click();

    // Should show success message again
    await expect(page.getByTestId('magic-link-sent-message')).toBeVisible();
  });
});

/**
 * Integration test group: Full magic link flow
 *
 * These tests verify the complete integration between frontend and backend.
 */
test.describe('F002: Magic Link Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/auth');
  });

  /**
   * Scenario 13: Complete magic link request flow
   */
  test('Complete flow: Navigate, fill form, submit, see success', async ({ page }) => {
    // Step 1: Navigate to magic link mode
    await page.getByTestId('magic-link-mode-button').click();
    await expect(page.getByRole('heading', { name: 'Acesso Sem Senha' })).toBeVisible();

    // Step 2: Fill email
    const emailInput = page.locator('input[type="email"][name="email"]');
    await emailInput.fill('integration-test@example.com');

    // Step 3: Submit form
    await page.locator('button[type="submit"]').click();

    // Step 4: Verify success (backend returns security-conscious message)
    const successMessage = page.getByTestId('magic-link-sent-message');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
    await expect(successMessage).toContainText('link de acesso');

    // Step 5: Verify email was cleared
    await expect(emailInput).toHaveValue('');

    // Step 6: Verify no error is shown
    await expect(page.getByTestId('magic-link-error')).not.toBeVisible();
  });
});
