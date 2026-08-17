import { redirect } from 'next/navigation';

// /register is an alias for /signup — used in email links and external referrals
export default function RegisterPage() {
  redirect('/signup');
}
