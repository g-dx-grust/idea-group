import Link from 'next/link';
import { createCaseAction } from '@/lib/actions';
import { businessTypeLabels } from '@/lib/labels';
import { getStore } from '@/lib/store';
import { businessTypes } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NewCasePage() {
  const store = await getStore();

  return (
    <div className="content space-y-6">
      <div>
        <Link href="/cases" className="muted hover:text-[var(--color-text-black)]">
          現場一覧へ戻る
        </Link>
        <h1 className="page-title mt-1">
          現場を作成する
        </h1>
      </div>

      <form action={createCaseAction} className="panel grid gap-6 p-6">
        <section className="grid gap-4 md:grid-cols-2">
          <Field label="受託番号" name="jutakuNo" required placeholder="26-0186" />
          <Field label="CAD番号" name="cadNo" placeholder="CAD-1043" />
          <Field label="件名" name="title" required placeholder="筆界確定測量業務" span />
          <Field label="所在" name="address" required placeholder="名古屋市北区芦辺町三丁目" span />
          <label className="grid gap-2">
            <span className="field-label">依頼先</span>
            <select name="clientId" required className="control">
              {store.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="依頼先担当者" name="clientContactName" />
          <Field label="依頼先電話" name="clientTel" />
          <Field label="依頼先メール" name="clientEmail" />
        </section>

        <section>
          <h2 className="section-title mb-3">担当者</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <UserSelect label="設計部担当" name="designerUserId" users={store.users} />
            <UserSelect label="測量部担当" name="surveyorUserId" users={store.users} />
            <UserSelect label="登記部担当" name="registrarUserId" users={store.users} />
          </div>
        </section>

        <section>
          <h2 className="section-title mb-3">業務区分</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {businessTypes.map((type) => (
              <label key={type} className="flex min-h-11 items-center gap-3 rounded-[var(--radius-m)] border border-[var(--color-border)] p-3">
                <input type="checkbox" name="businessTypes" value={type} defaultChecked={type === 'confirmed_survey'} />
                <span className="font-medium">{businessTypeLabels[type]}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Field label="期限" name="deadline" type="date" />
          <label className="grid gap-2 md:col-span-2">
            <span className="field-label">特記事項</span>
            <textarea name="specialNote" className="control min-h-24" />
          </label>
        </section>

        <div className="flex justify-end gap-[var(--space-s)]">
          <Link href="/cases" className="button button-secondary">
            キャンセルする
          </Link>
          <button type="submit" className="button button-primary">
            作成する
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  span,
  type = 'text',
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  span?: boolean;
  type?: string;
}) {
  return (
    <label className={`grid gap-2 ${span ? 'md:col-span-2' : ''}`}>
      <span className="field-label">{label}</span>
      <input name={name} type={type} required={required} placeholder={placeholder} className="control" />
    </label>
  );
}

function UserSelect({ label, name, users }: { label: string; name: string; users: Array<{ id: string; name: string }> }) {
  return (
    <label className="grid gap-2">
      <span className="field-label">{label}</span>
      <select name={name} className="control" defaultValue="">
        <option value="">未設定</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </label>
  );
}
