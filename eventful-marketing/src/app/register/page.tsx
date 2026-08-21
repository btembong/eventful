import { redirect } from 'next/navigation';

// /register is an alias for /signup — forwards query params (e.g. ?email=&name=)
export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const qs = new URLSearchParams(params).toString();
  redirect(qs ? `/signup?${qs}` : '/signup');
}
