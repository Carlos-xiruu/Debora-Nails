'use client';

import { useEffect, useState } from 'react';
import { Loader2, LogOut, Sparkles } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'debora199917silva@gmail.com';

export default function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;

      if (!user) {
        router.replace('/login');
        return;
      }

      if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        router.replace('/');
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    void checkAccess();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (authorized && pathname !== '/dashboard/servicos') {
      router.replace('/dashboard/servicos');
    }
  }, [authorized, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading || !authorized) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f0eb] flex flex-col items-center justify-center gap-3 text-[#621c35]">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-sm font-semibold">Abrindo seu painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f7f0eb] text-[#260d18]">
      <header className="sticky top-0 z-30 border-b border-[#dfc4b6] bg-[#f7f0eb]/95 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-[#621c35] text-white"><Sparkles size={17} /></span>
            <div>
              <p className="font-serif text-xl leading-none">Debora Nails</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8c5a68]">Conteúdo do site</p>
            </div>
          </div>
          <button type="button" onClick={signOut} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#621c35] hover:bg-[#f1d9d1]" aria-label="Sair do painel">
            <LogOut size={18} /> <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-9">{children}</main>
    </div>
  );
}
