'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileText, Gauge, Menu, Settings } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';

const navItems = [
  { id: 'dashboard', href: '/dashboard', label: 'ダッシュボード', icon: Gauge },
  { id: 'cases', href: '/cases', label: '現場管理', icon: BriefcaseBusiness },
  { id: 'calendar', href: '/calendar', label: 'カレンダー', icon: CalendarDays },
  { id: 'invoiced', href: '/cases?status=invoiced', label: '未入金確認', icon: FileText },
  { id: 'schedule', href: '/cases?businessType=confirmed_survey', label: '工程確認', icon: ClipboardList },
  { id: 'settings', href: '/dashboard#settings', label: '設定', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem('idea-sidebar-collapsed') === 'true');
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem('idea-sidebar-collapsed', String(next));
      return next;
    });
  }

  const activeId = useMemo(() => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/calendar') return 'calendar';
    if (pathname.startsWith('/cases') && searchParams.get('status') === 'invoiced') return 'invoiced';
    if (pathname.startsWith('/cases') && searchParams.get('businessType') === 'confirmed_survey') return 'schedule';
    if (pathname.startsWith('/cases')) return 'cases';
    return '';
  }, [pathname, searchParams]);

  return (
    <div className="page-shell">
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-white)] px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="hidden min-h-11 w-11 items-center justify-center rounded-[var(--radius-m)] text-[var(--color-text-mid)] transition-colors hover:bg-[var(--color-surface)] md:inline-flex"
            aria-label={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
            onClick={toggleSidebar}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 w-11 items-center justify-center rounded-[var(--radius-m)] text-[var(--color-text-mid)] transition-colors hover:bg-[var(--color-surface)] md:hidden"
            aria-label="メニュー"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link href="/dashboard" className="truncate text-sm font-semibold text-[var(--color-text-black)]">
            イデア業務管理
          </Link>
        </div>
        <div className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-grey)]">
          MVP
        </div>
      </header>
      <div
        className="grid min-h-[calc(100vh-56px)] grid-cols-1 transition-[grid-template-columns] duration-200 md:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]"
        style={{ '--sidebar-width': collapsed ? '56px' : '256px' } as CSSProperties}
      >
        <aside className="no-print sticky top-14 hidden h-[calc(100vh-56px)] self-start overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-white)] md:block">
          <nav className="grid gap-1 p-2">
            {!collapsed && (
              <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                メニュー
              </div>
            )}
            {navItems.map((item) => (
              <SidebarLink key={item.href} item={item} active={activeId === item.id} collapsed={collapsed} />
            ))}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid min-h-14 grid-cols-4 border-t border-[var(--color-border)] bg-[var(--color-white)] px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        {navItems.slice(0, 4).map((item) => {
          const active = activeId === item.id;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                active ? 'text-[var(--color-main)]' : 'text-[var(--color-text-grey)]'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-m)] px-3 text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--color-column)] text-[var(--color-text-black)]'
          : 'text-[var(--color-text-mid)] hover:bg-[var(--color-surface)]'
      } ${collapsed ? 'justify-center px-0' : ''}`}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
