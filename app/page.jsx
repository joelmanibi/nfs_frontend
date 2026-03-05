import { redirect } from 'next/navigation';

/**
 * Root "/" redirects to /dashboard.
 * The middleware will intercept and redirect to /login if unauthenticated.
 */
export default function RootPage() {
  redirect('/dashboard');
}

