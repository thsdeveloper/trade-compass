import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Auth Callback Route Handler
 *
 * Handles OAuth and magic link authentication callbacks from Supabase.
 * This route exchanges the authorization code from the URL for a session.
 *
 * Flow:
 * 1. User clicks magic link in email
 * 2. Supabase redirects to this callback URL with code/token_hash
 * 3. This handler exchanges code for session using Supabase client
 * 4. Redirects to dashboard on success or auth page with error
 *
 * URL Parameters:
 * - code: Authorization code from Supabase (for magic link)
 * - token_hash: Token hash (alternative to code)
 * - error: Error message if authentication failed
 * - error_description: Detailed error description
 *
 * @param request - Next.js request object with URL parameters
 * @returns Redirect response to dashboard or auth page
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle Supabase auth errors (expired link, invalid link, etc.)
  if (error) {
    console.error('Auth callback error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(error_description || error)}`, request.url)
    );
  }

  // Exchange code for session
  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        new URL('/auth?error=Link inválido ou expirado', request.url)
      );
    }

    // Successfully authenticated - redirect to dashboard
    return NextResponse.redirect(new URL('/watchlist', request.url));
  }

  // Handle token_hash (alternative auth method)
  if (token_hash) {
    const supabase = await createClient();

    // Verify token_hash with Supabase
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'magiclink',
    });

    if (!verifyError) {
      return NextResponse.redirect(new URL('/watchlist', request.url));
    }

    console.error('Error verifying token_hash:', verifyError);
  }

  // No code or token_hash provided - invalid callback
  console.error('No code or token_hash in callback URL');
  return NextResponse.redirect(
    new URL('/auth?error=Link de autenticação inválido', request.url)
  );
}
