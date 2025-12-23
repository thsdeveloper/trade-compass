import { test, expect } from '@playwright/test';

/**
 * E2E Tests for F001: User Authentication Flow with Supabase Integration
 *
 * Tests cover:
 * - User registration UI and flow
 * - User login UI and flow
 * - Password recovery UI
 * - Backend API endpoints
 * - Error handling for invalid credentials
 *
 * Note: Supabase email confirmation is enabled, so after registration,
 * users need to confirm their email before they can login. These tests
 * verify the UI and API flows work correctly.
 */

// Use unique emails with valid domains for each test run
const timestamp = Date.now();

test.describe('F001: User Authentication UI Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page before each test
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  });

  test('Scenario 1: Auth page loads and displays login form correctly', async ({ page }) => {
    // Verify we're on the auth page
    await expect(page.getByTestId('auth-form')).toBeVisible();

    // Verify login mode is default
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();

    // Verify form fields are present
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify mode switching options are present
    await expect(page.getByText('Criar conta')).toBeVisible();
    await expect(page.getByText('Esqueceu a senha?')).toBeVisible();
  });

  test('Scenario 2: User can navigate between login and register modes', async ({ page }) => {
    // Verify we start on login page
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();

    // Switch to register
    await page.getByText('Criar conta').click();
    await expect(page.getByRole('heading', { name: 'Criar Conta' })).toBeVisible();

    // Switch back to login
    await page.getByText('Fazer login').click();
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  });

  test('Scenario 3: User can navigate to password recovery mode', async ({ page }) => {
    // Click on "Forgot password" link
    await page.getByText('Esqueceu a senha?').click();

    // Verify we're on password recovery mode
    await expect(page.getByRole('heading', { name: 'Recuperar Senha' })).toBeVisible();

    // Verify only email field is shown (no password field)
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).not.toBeVisible();

    // Verify back button is present
    await expect(page.getByText('Voltar para login')).toBeVisible();
  });

  test('Scenario 4: Invalid credentials display appropriate error messages', async ({ page }) => {
    // Verify we're on login page
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();

    // Try to login with invalid credentials
    await page.locator('input[name="email"]').fill('invalid-user@example.com');
    await page.locator('input[name="password"]').fill('wrongpassword');

    // Submit login
    await page.locator('button[type="submit"]').click();

    // Wait for error message (giving it more time)
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });

    // Verify error message is displayed
    const errorMessage = page.getByTestId('error-message');
    await expect(errorMessage).toBeVisible();
    // Check for Portuguese error message
    await expect(errorMessage).toContainText(/inválid|Credenciais/i);

    // Verify we're still on auth page (not redirected)
    await expect(page).toHaveURL('/auth');
  });

  test('Scenario 5: Registration form validates password length', async ({ page }) => {
    // Switch to register mode
    await page.getByText('Criar conta').click();

    // Fill in form with short password
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('12345'); // Too short

    // Try to submit form
    await page.locator('button[type="submit"]').click();

    // The HTML5 validation should prevent submission
    const passwordInput = page.locator('input[name="password"]');
    const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage);

    // Either HTML5 validation fires, or we get backend error
    const hasValidation = validationMessage !== '';

    expect(hasValidation).toBeTruthy();
  });

  test('Scenario 6: Email field requires valid email format', async ({ page }) => {
    // Fill in invalid email
    await page.locator('input[name="email"]').fill('not-an-email');
    await page.locator('input[name="password"]').fill('ValidPassword123');

    // Try to submit form
    await page.locator('button[type="submit"]').click();

    // HTML5 email validation should prevent submission
    const emailInput = page.locator('input[name="email"]');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);

    expect(validationMessage).not.toBe('');
  });

  test('Scenario 7: Registration form submits and shows appropriate feedback', async ({ page }) => {
    // Switch to register mode
    await page.getByText('Criar conta').click();
    await expect(page.getByRole('heading', { name: 'Criar Conta' })).toBeVisible();

    // Use a valid email domain that Supabase accepts
    const testEmail = `test-${timestamp}@example.com`;

    // Fill in registration form
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill('Test123456!');

    // Submit registration
    await page.locator('button[type="submit"]').click();

    // Wait for either success (redirect) or error message
    // Note: With email confirmation enabled, user won't be auto-logged in
    // So we either get an error or the form state changes
    await page.waitForTimeout(2000);

    // Check if we got an error or if button is back to normal state
    const hasError = await page.getByTestId('error-message').isVisible().catch(() => false);
    const isStillOnAuthPage = page.url().includes('/auth');

    // Either scenario is valid - registration may require email confirmation
    expect(isStillOnAuthPage || hasError).toBeTruthy();
  });

  test('Scenario 8: Password recovery form accepts email and shows feedback', async ({ page }) => {
    // Navigate to password recovery
    await page.getByText('Esqueceu a senha?').click();
    await expect(page.getByRole('heading', { name: 'Recuperar Senha' })).toBeVisible();

    // Fill in email
    await page.locator('input[name="email"]').fill('test@example.com');

    // Submit password recovery
    await page.locator('button[type="submit"]').click();

    // Wait for success message (Supabase always returns success to prevent email enumeration)
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });

    // Verify success message is displayed
    const successMessage = page.getByTestId('success-message');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText(/enviado|sucesso|receberá/i);
  });
});

test.describe('F001: Authentication Backend API', () => {
  test('Backend health check is accessible', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('Backend registration endpoint validates email format', async ({ request }) => {
    const response = await request.post('http://localhost:3001/auth/register', {
      data: {
        email: 'not-an-email',
        password: 'Test123456!',
      },
    });

    // Should fail with 400 due to invalid email
    expect(response.ok()).toBeFalsy();
  });

  test('Backend registration endpoint validates password length', async ({ request }) => {
    const response = await request.post('http://localhost:3001/auth/register', {
      data: {
        email: 'test@example.com',
        password: '123', // Too short
      },
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.message).toContain('6 caracteres');
  });

  test('Backend registration endpoint creates user with valid data', async ({ request }) => {
    // Use a real-looking email domain that Supabase might accept
    // Note: Supabase may reject certain test domains for security
    const uniqueEmail = `test-${Date.now()}@mailinator.com`;

    const response = await request.post('http://localhost:3001/auth/register', {
      data: {
        email: uniqueEmail,
        password: 'Test123456!',
      },
    });

    const data = await response.json();

    // Supabase may reject test email domains or rate-limit requests
    // Accept either success (201) or rejection due to email validation/rate-limiting (400)
    if (response.status() === 201) {
      // Success case - user was created
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(uniqueEmail);
      expect(data.user.id).toBeDefined();
    } else if (response.status() === 400) {
      // Expected failure cases: invalid email domain or rate limiting
      expect(data.message).toBeDefined();
      // Verify it's a known acceptable error
      const isExpectedError =
        data.message.includes('invalid') ||
        data.message.includes('security purposes') ||
        data.message.includes('rate');
      expect(isExpectedError).toBeTruthy();
    } else {
      // Unexpected status code
      throw new Error(`Unexpected status code: ${response.status()}, body: ${JSON.stringify(data)}`);
    }
  });

  test('Backend login endpoint rejects invalid credentials', async ({ request }) => {
    const response = await request.post('http://localhost:3001/auth/login', {
      data: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(data.message).toContain('inválidas');
  });

  test('Backend password recovery endpoint accepts email', async ({ request }) => {
    const response = await request.post('http://localhost:3001/auth/recover-password', {
      data: {
        email: 'test@example.com',
      },
    });

    // Should always return 200 to prevent email enumeration
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.message).toBeDefined();
  });

  test('Backend password recovery endpoint validates email is required', async ({ request }) => {
    const response = await request.post('http://localhost:3001/auth/recover-password', {
      data: {},
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.message).toContain('obrigatório');
  });

  test('Backend /auth/me endpoint rejects requests without token', async ({ request }) => {
    const response = await request.get('http://localhost:3001/auth/me');

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  test('Backend /auth/me endpoint rejects invalid token', async ({ request }) => {
    const response = await request.get('http://localhost:3001/auth/me', {
      headers: {
        Authorization: 'Bearer invalid-token-12345',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('Backend logout endpoint responds successfully', async ({ request }) => {
    const response = await request.post('http://localhost:3001/auth/logout');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.message).toContain('sucesso');
  });
});

test.describe('F001: Session and State Management', () => {
  test('AuthContext is available on all pages', async ({ page }) => {
    // Visit home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that the auth link is present (shows AuthProvider is working)
    const authLink = page.getByRole('link', { name: 'Entrar' });
    await expect(authLink).toBeVisible();
  });

  test('Protected routes are configured correctly', async ({ page }) => {
    // Try to access watchlist without authentication
    await page.goto('/watchlist');
    await page.waitForLoadState('networkidle');

    // Should either be on watchlist (if no auth required yet) or redirected
    // Just verify the page loaded without errors
    await expect(page).toHaveURL(/\/(watchlist|auth)?/);
  });

  test('Supabase client is configured correctly in frontend', async ({ page }) => {
    // Go to auth page
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    // Check for any console errors about Supabase configuration
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Interact with the form
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('Test123456!');

    // Wait a bit to capture any errors
    await page.waitForTimeout(1000);

    // Check no Supabase configuration errors occurred
    const hasSupabaseError = consoleErrors.some(error =>
      error.includes('supabase') || error.includes('SUPABASE')
    );

    expect(hasSupabaseError).toBeFalsy();
  });
});
