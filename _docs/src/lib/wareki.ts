/**
 * Date → 和暦文字列変換
 * 令和（2019/05/01〜）、平成（1989/01/08〜）のみ対応
 */
export function toWareki(date: Date): string {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();

    // 令和: 2019年5月1日以降
    if (y > 2019 || (y === 2019 && m >= 5)) {
        const reiwa = y - 2018;
        return `令和${reiwa}年${m}月${d}日`;
    }
    // 平成: 1989年1月8日以降
    if (y > 1989 || (y === 1989 && (m > 1 || d >= 8))) {
        const heisei = y - 1988;
        return `平成${heisei}年${m}月${d}日`;
    }
    // 昭和（念のため）
    if (y >= 1926) {
        const showa = y - 1925;
        return `昭和${showa}年${m}月${d}日`;
    }
    return `${y}年${m}月${d}日`;
}

/** 和暦の年号のみ返す（例: "令和8年" → "R8" ショートコード） */
export function toWareciShort(date: Date): string {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    if (y > 2019 || (y === 2019 && m >= 5)) return `R${y - 2018}`;
    if (y >= 1989) return `H${y - 1988}`;
    return `${y}`;
}
