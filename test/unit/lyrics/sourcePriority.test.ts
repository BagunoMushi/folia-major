import { describe, expect, it } from 'vitest';
import {
    buildLyricSourceOrder,
    migratePreferredLyricSource,
    resolvePreferredLyricSource,
} from '@/utils/lyrics/sourcePriority';

// test/unit/lyrics/sourcePriority.test.ts

describe('lyric source priority', () => {
    it('defaults to NetEase and retains every fallback exactly once', () => {
        expect(buildLyricSourceOrder()).toEqual(['netease', 'amll', 'qq', 'kugou']);
        expect(buildLyricSourceOrder('qq')).toEqual(['qq', 'netease', 'amll', 'kugou']);
        expect(buildLyricSourceOrder('kugou')).toEqual(['kugou', 'netease', 'amll', 'qq']);
        expect(buildLyricSourceOrder('netease')).toEqual(['netease', 'amll', 'qq', 'kugou']);
        expect(buildLyricSourceOrder('amll')).toEqual(['amll', 'netease', 'qq', 'kugou']);
    });

    it('uses automatic priority for missing or invalid preferences', () => {
        expect(migratePreferredLyricSource(null, null)).toBe('auto');
        expect(migratePreferredLyricSource(null, 'netease')).toBe('netease');
        expect(migratePreferredLyricSource(null, 'invalid')).toBe('auto');
        expect(migratePreferredLyricSource('invalid', 'kugou')).toBe('auto');
    });

    it('preserves other legacy values and trusts the versioned preference thereafter', () => {
        expect(migratePreferredLyricSource(null, 'amll')).toBe('amll');
        expect(migratePreferredLyricSource(null, 'qq')).toBe('qq');
        expect(migratePreferredLyricSource(null, 'kugou')).toBe('kugou');
        expect(migratePreferredLyricSource('netease', 'qq')).toBe('netease');
    });
});

describe('automatic lyric priority', () => {
    it.each(['netease', 'qq', 'kugou'] as const)('follows the active %s platform', provider => {
        expect(buildLyricSourceOrder(resolvePreferredLyricSource('auto', provider))[0]).toBe(provider);
    });

    it('uses NetEase when the active platform has no supported lyric source', () => {
        expect(resolvePreferredLyricSource('auto', 'navidrome')).toBe('netease');
        expect(resolvePreferredLyricSource('auto', undefined)).toBe('netease');
    });

    it('preserves explicit choices, including a saved QQ preference', () => {
        expect(resolvePreferredLyricSource('qq', 'netease')).toBe('qq');
        expect(resolvePreferredLyricSource('amll', 'netease')).toBe('amll');
        expect(migratePreferredLyricSource('qq', null)).toBe('qq');
        expect(migratePreferredLyricSource('auto', 'qq')).toBe('auto');
    });
});
