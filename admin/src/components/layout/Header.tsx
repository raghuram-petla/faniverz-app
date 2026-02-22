'use client';

import { supabase } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Breadcrumbs from './Breadcrumbs';

export default function Header() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header
      data-testid="admin-header"
      className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between"
    >
      <Breadcrumbs />
      <button
        data-testid="sign-out-button"
        onClick={handleSignOut}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Sign Out
      </button>
    </header>
  );
}
