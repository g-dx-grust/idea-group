'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash2 } from 'lucide-react';

// ─── Zod スキーマ ────────────────────────────────────────────────
const detailSchema = z.object({
    section: z.enum(['investigation', 'survey', 'application', 'document']),
    itemCode: z.string().optional(),
    itemName: z.string().min(1, '品目名は必須です'),
    subType: z.string().optional(),
    unitPrice: z.coerce.number().int().min(0),
    quantity: z.coerce.number().min(0),
    unit: z.string().min(1),
    rate: z.coerce.number().int().min(0).max(200).default(100),
    amount: z.coerce.number().int().min(0),
    note: z.string().optional(),
    sortOrder: z.number().int().default(0),
});

const rewardFormSchema = z.object({
    businessName: z.string().min(1, '業務名は必須です'),
    address: z.string().min(1, '所在は必須です'),
    recipientName: z.string().min(1, '宛名は必須です'),
    formVersion: z.enum(['new', 'old']).default('new'),
    adjustAmount: z.coerce.number().int().min(0).default(0),
    miscExpense: z.coerce.number().int().min(0).default(0),
    stampCost: z.coerce.number().int().min(0).default(0),
    taxRate: z.coerce.number().int().default(10),
    taxRounding: z.enum(['floor', 'round']).default('floor'),
    estimateDate: z.string().optional(),
    invoiceDate: z.string().optional(),
    requireSend: z.boolean().default(false),
    paidDate: z.string().optional(),
    receiptDate: z.string().optional(),
    receiptSentDate: z.string().optional(),
    note: z.string().optional(),
    details: z.array(detailSchema),
});

type RewardFormValues = z.infer<typeof rewardFormSchema>;

const SECTION_LABELS = {
    investigation: '調査業務',
    survey: '測量業務',
    application: '申請手続業務',
    document: '書類作成等',
} as const;

type Section = keyof typeof SECTION_LABELS;
const SECTIONS: Section[] = ['investigation', 'survey', 'application', 'document'];

interface Props {
    defaultValues?: Partial<RewardFormValues>;
    onSubmit: (values: RewardFormValues) => Promise<void>;
    onDraft?: (values: RewardFormValues) => Promise<void>;
}

export function RewardForm({ defaultValues, onSubmit, onDraft }: Props) {
    const form = useForm<RewardFormValues>({
        resolver: zodResolver(rewardFormSchema),
        defaultValues: {
            formVersion: 'new',
            taxRate: 10,
            taxRounding: 'floor',
            adjustAmount: 0,
            miscExpense: 0,
            stampCost: 0,
            requireSend: false,
            details: [],
            ...defaultValues,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'details',
    });

    const watchedDetails = form.watch('details');
    const watchedAdjust = form.watch('adjustAmount') ?? 0;
    const watchedMisc = form.watch('miscExpense') ?? 0;
    const watchedStamp = form.watch('stampCost') ?? 0;
    const watchedTaxRate = form.watch('taxRate') ?? 10;
    const watchedRounding = form.watch('taxRounding');

    // 自動計算
    const subtotals = SECTIONS.reduce((acc, section) => {
        acc[section] = watchedDetails
            .filter((d) => d.section === section)
            .reduce((s, d) => s + (d.amount || 0), 0);
        return acc;
    }, {} as Record<Section, number>);

    const totalReward = Object.values(subtotals).reduce((a, b) => a + b, 0);
    const netReward = totalReward - watchedAdjust;
    const taxBase = netReward + watchedMisc;
    const taxRaw = (taxBase * watchedTaxRate) / 100;
    const taxAmount = watchedRounding === 'floor' ? Math.floor(taxRaw) : Math.round(taxRaw);
    const total = netReward + watchedMisc + taxAmount + watchedStamp;

    function addDetailRow(section: Section) {
        append({
            section,
            itemName: '',
            unitPrice: 0,
            quantity: 1,
            unit: '筆',
            rate: 100,
            amount: 0,
            sortOrder: fields.filter((f) => f.section === section).length,
        });
    }

    function recalcAmount(index: number) {
        const d = form.getValues(`details.${index}`);
        const amount = Math.floor((d.unitPrice * d.quantity * d.rate) / 100);
        form.setValue(`details.${index}.amount`, amount);
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* ── 基本情報 ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="md:col-span-2">
                    <Label>業務名 *</Label>
                    <Input {...form.register('businessName')} placeholder="筆界確定測量業務" />
                    {form.formState.errors.businessName && (
                        <p className="text-red-500 text-xs mt-1">{form.formState.errors.businessName.message}</p>
                    )}
                </div>
                <div className="md:col-span-2">
                    <Label>所在 *</Label>
                    <Input {...form.register('address')} placeholder="名古屋市中村区塩池町二丁目148番" />
                </div>
                <div>
                    <Label>宛名 *</Label>
                    <Input {...form.register('recipientName')} placeholder="小出 恵子" />
                </div>
                <div>
                    <Label>様式</Label>
                    <RadioGroup
                        value={form.watch('formVersion')}
                        onValueChange={(v) => form.setValue('formVersion', v as 'new' | 'old')}
                        className="flex gap-4 mt-1"
                    >
                        <div className="flex items-center gap-2">
                            <RadioGroupItem value="new" id="form-new" />
                            <Label htmlFor="form-new">新様式</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <RadioGroupItem value="old" id="form-old" />
                            <Label htmlFor="form-old">旧様式</Label>
                        </div>
                    </RadioGroup>
                </div>
            </div>

            {/* ── 明細（セクション別） ── */}
            {SECTIONS.map((section) => {
                const sectionFields = fields
                    .map((f, i) => ({ field: f, index: i }))
                    .filter(({ field }) => field.section === section);

                return (
                    <div key={section} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                            <h3 className="font-medium text-sm">■ {SECTION_LABELS[section]}</h3>
                            <span className="text-sm text-gray-600 font-mono">
                                小計: {subtotals[section].toLocaleString()}円
                            </span>
                        </div>
                        <div className="p-2">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-gray-500">
                                        <th className="text-left py-1 px-2 w-1/3">品目</th>
                                        <th className="text-right px-2 w-16">数量</th>
                                        <th className="text-left px-2 w-14">単位</th>
                                        <th className="text-right px-2 w-24">単価</th>
                                        <th className="text-right px-2 w-16">加減率%</th>
                                        <th className="text-right px-2 w-28">金額</th>
                                        <th className="w-8" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {sectionFields.map(({ field, index }) => (
                                        <tr key={field.id} className="border-t">
                                            <td className="py-1 px-2">
                                                <Input
                                                    {...form.register(`details.${index}.itemName`)}
                                                    className="h-7 text-sm"
                                                />
                                            </td>
                                            <td className="px-2">
                                                <Input
                                                    {...form.register(`details.${index}.quantity`)}
                                                    type="number"
                                                    step="0.01"
                                                    className="h-7 text-sm text-right w-16"
                                                    onBlur={() => recalcAmount(index)}
                                                />
                                            </td>
                                            <td className="px-2">
                                                <Input
                                                    {...form.register(`details.${index}.unit`)}
                                                    className="h-7 text-sm w-14"
                                                />
                                            </td>
                                            <td className="px-2">
                                                <Input
                                                    {...form.register(`details.${index}.unitPrice`)}
                                                    type="number"
                                                    className="h-7 text-sm text-right w-24"
                                                    onBlur={() => recalcAmount(index)}
                                                />
                                            </td>
                                            <td className="px-2">
                                                <Input
                                                    {...form.register(`details.${index}.rate`)}
                                                    type="number"
                                                    className="h-7 text-sm text-right w-16"
                                                    onBlur={() => recalcAmount(index)}
                                                />
                                            </td>
                                            <td className="px-2 text-right font-mono">
                                                {(form.watch(`details.${index}.amount`) ?? 0).toLocaleString()}円
                                            </td>
                                            <td className="px-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-gray-400 hover:text-red-500"
                                                    onClick={() => remove(index)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-1 text-blue-600 hover:text-blue-700 text-xs"
                                onClick={() => addDetailRow(section)}
                            >
                                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                                行を追加
                            </Button>
                        </div>
                    </div>
                );
            })}

            {/* ── 合計 ── */}
            <div className="border rounded-lg p-4 space-y-2 bg-gray-50">
                <SummaryRow label="合計報酬額（①+②+③+④）" value={totalReward} />
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-48">調整額</span>
                    <Input
                        {...form.register('adjustAmount')}
                        type="number"
                        className="h-7 text-sm text-right w-36 font-mono"
                    />
                    <span className="text-sm text-gray-500">円</span>
                </div>
                <SummaryRow label="差引報酬額（①-②）" value={netReward} />
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-48">諸経費（境界標等）</span>
                    <Input
                        {...form.register('miscExpense')}
                        type="number"
                        className="h-7 text-sm text-right w-36 font-mono"
                    />
                    <span className="text-sm text-gray-500">円</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-48">
                        消費税（{watchedTaxRate}%）
                    </span>
                    <span className="font-mono text-sm w-36 text-right">{taxAmount.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">円</span>
                    <RadioGroup
                        value={watchedRounding}
                        onValueChange={(v) => form.setValue('taxRounding', v as 'floor' | 'round')}
                        className="flex gap-3"
                    >
                        <div className="flex items-center gap-1 text-xs">
                            <RadioGroupItem value="floor" id="tax-floor" />
                            <Label htmlFor="tax-floor">切り捨て</Label>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                            <RadioGroupItem value="round" id="tax-round" />
                            <Label htmlFor="tax-round">四捨五入</Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-48">立替金（収入印紙等）</span>
                    <Input
                        {...form.register('stampCost')}
                        type="number"
                        className="h-7 text-sm text-right w-36 font-mono"
                    />
                    <span className="text-sm text-gray-500">円</span>
                </div>
                <div className="flex items-center gap-4 border-t pt-2 mt-2">
                    <span className="font-bold text-sm w-48">総合計</span>
                    <span className="font-bold font-mono text-lg text-right w-36">
                        {total.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500">円</span>
                </div>
            </div>

            {/* ── 日付・送付情報 ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                <div>
                    <Label>見積日</Label>
                    <Input type="date" {...form.register('estimateDate')} className="mt-1" />
                </div>
                <div>
                    <Label>請求日</Label>
                    <Input type="date" {...form.register('invoiceDate')} className="mt-1" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                    <Checkbox
                        id="requireSend"
                        checked={form.watch('requireSend')}
                        onCheckedChange={(c) => form.setValue('requireSend', !!c)}
                    />
                    <Label htmlFor="requireSend">要送付</Label>
                </div>
                <div>
                    <Label>入金日</Label>
                    <Input type="date" {...form.register('paidDate')} className="mt-1" />
                </div>
                <div>
                    <Label>領収日</Label>
                    <Input type="date" {...form.register('receiptDate')} className="mt-1" />
                </div>
                <div>
                    <Label>領収書送付日</Label>
                    <Input type="date" {...form.register('receiptSentDate')} className="mt-1" />
                </div>
            </div>

            {/* ── ボタン ── */}
            <div className="flex justify-end gap-2">
                {onDraft && (
                    <Button type="button" variant="outline" onClick={() => onDraft(form.getValues())}>
                        下書き保存
                    </Button>
                )}
                <Button type="submit">保存</Button>
            </div>
        </form>
    );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 w-48">{label}</span>
            <span className="font-mono text-sm text-right w-36">{value.toLocaleString()}</span>
            <span className="text-sm text-gray-500">円</span>
        </div>
    );
}
