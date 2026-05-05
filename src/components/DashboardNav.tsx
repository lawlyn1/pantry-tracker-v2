'use client';

import { DashboardTab } from '@/hooks/usePantryDashboard';

const TAB_CONFIG: { key: DashboardTab; label: string }[] = [
  { key: 'inventory', label: 'Pantry' },
  { key: 'add', label: 'Add' },
  { key: 'receipt', label: 'Receipt' },
  { key: 'shop', label: 'Shop' },
  { key: 'recipes', label: 'Recipes' },
];

interface DashboardNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  expiringItemsCount: number;
}

export function DashboardNav({ activeTab, onTabChange, expiringItemsCount }: DashboardNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center safe-area-pb z-50">
      {TAB_CONFIG.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all text-xs font-medium ${
            activeTab === tab.key
              ? 'text-blue-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <TabIcon tab={tab.key} active={activeTab === tab.key} />
          <span>{tab.label}</span>
          {tab.key === 'recipes' && expiringItemsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
              {expiringItemsCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

function TabIcon({ tab, active }: { tab: DashboardTab; active: boolean }) {
  const color = active ? 'text-blue-600' : 'text-gray-400';
  const cls = `w-5 h-5 ${color}`;

  switch (tab) {
    case 'inventory':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'add':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      );
    case 'receipt':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'shop':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    case 'recipes':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
  }
}
