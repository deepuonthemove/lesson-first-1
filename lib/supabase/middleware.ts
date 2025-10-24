import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Check if there are any auth cookies present
    const authCookies = request.cookies.getAll().filter(cookie => 
      cookie.name.startsWith('sb-') || cookie.name.includes('supabase')
    );
    
    // Only try to refresh session if auth cookies are present
    if (authCookies.length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Only refresh session if user exists and session might be expired
        if (user) {
          await supabase.auth.getSession();
        }
      } catch (authError) {
        // If auth fails, clear any invalid cookies and continue
        console.warn('Auth session refresh failed, clearing cookies:', authError);
        authCookies.forEach(cookie => {
          response.cookies.delete(cookie.name);
        });
      }
    }

    return response;
  } catch (error) {
    // If there's an error with session refresh, continue without authentication
    console.warn('Session refresh error:', error);
    return response;
  }
}
