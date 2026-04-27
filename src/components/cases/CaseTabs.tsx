import Link from 'next/link';

const tabs = [
  { key: 'summary', label: '基本' },
  { key: 'confirmed', label: '確定測量' },
  { key: 'subdivision', label: '分筆測量' },
  { key: 'lands', label: '土地登記事項' },
  { key: 'site-visits', label: '訪問・立会' },
  { key: 'rewards', label: '報酬額計算書' },
  { key: 'documents', label: '帳票' },
];

export function CaseTabs({ caseId, active }: { caseId: string; active: string }) {
  return (
    <nav className="no-print overflow-x-auto border-y border-[var(--color-border)] bg-[var(--color-white)]">
      <div className="flex min-w-max px-4 md:px-6">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/cases/${caseId}?tab=${tab.key}`}
            className={`min-h-11 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              active === tab.key
                ? 'border-[var(--color-main)] text-[var(--color-main)]'
                : 'border-transparent text-[var(--color-text-grey)] hover:text-[var(--color-text-black)]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
