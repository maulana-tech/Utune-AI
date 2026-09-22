'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  Clock,
  Settings,
  Home,
  PanelLeft,
  History,
  ScanSearch,
  Sparkles,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    group: 'Overview',
    items: [
      { href: '/',             icon: Home,            label: 'Homepage'         },
      { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'        },
    ],
  },
  {
    group: 'Prospecting',
    items: [
      { href: '/dashboard/pipelines',        icon: Layers,      label: 'Pipelines'        },
      { href: '/dashboard/scrapes',          icon: ScanSearch,  label: 'Scrape History'   },
      { href: '/dashboard/scrape-schedules', icon: Clock,       label: 'Scrape Schedules' },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { href: '/dashboard/query',    icon: Sparkles,  label: 'AI Query'        },
      { href: '/dashboard/history',  icon: History,   label: 'History'         },
    ],
  },
];

const BOTTOM_ITEMS = [
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/') return false;
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={`relative flex h-screen flex-col border-r border-border bg-background transition-all duration-200 ${
        collapsed ? 'w-[64px]' : 'w-[240px]'
      }`}
    >
      {/* ── Header / Logo ── */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-border ${
          collapsed ? 'justify-center px-3' : 'justify-between px-4'
        }`}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="uTune AI" width={32} height={32} className="shrink-0" />
            <span className="text-[14px] font-bold uppercase tracking-tighter text-foreground">
              uTune AI
            </span>
          </div>
        )}

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex h-9 w-9 items-center justify-center border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft className="size-[18px]" />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto py-5 px-3">
        {NAV_ITEMS.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {group.group}
              </div>
            )}
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-none px-3 py-2.5 text-[13.5px] font-medium transition-colors border ${
                      active
                        ? 'border-border bg-accent text-foreground'
                        : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    <item.icon className="size-[18px] shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom ── */}
      <div className="shrink-0 border-t border-border px-3 py-3">
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium transition-colors border ${
                active
                  ? 'border-border bg-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <item.icon className="size-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
