import type { LyricProviderSource, LyricSourcePreference } from '../../types';

// src/utils/lyrics/sourcePriority.ts

export const DEFAULT_PREFERRED_LYRIC_SOURCE: LyricSourcePreference = 'auto';

const BASE_LYRIC_SOURCE_ORDER: readonly LyricProviderSource[] = ['netease', 'amll', 'qq', 'kugou'];

export const isLyricProviderSource = (value: unknown): value is LyricProviderSource => (
    value === 'netease' || value === 'amll' || value === 'qq' || value === 'kugou'
);

// Places the user preference first while retaining every fallback source exactly once.
export const buildLyricSourceOrder = (
    preferredSource: LyricProviderSource = 'netease',
): LyricProviderSource[] => [
    preferredSource,
    ...BASE_LYRIC_SOURCE_ORDER.filter(source => source !== preferredSource),
];

export const migratePreferredLyricSource = (
    versionedValue: unknown,
    legacyValue: unknown,
): LyricSourcePreference => {
    if (versionedValue !== null && versionedValue !== undefined) {
        return versionedValue === 'auto' || isLyricProviderSource(versionedValue) ? versionedValue : DEFAULT_PREFERRED_LYRIC_SOURCE;
    }
    if (isLyricProviderSource(legacyValue)) return legacyValue;
    return DEFAULT_PREFERRED_LYRIC_SOURCE;
};

// Resolve at the start of each match so switching platforms does not leave a stale default.
export const resolvePreferredLyricSource = (
    preference: LyricSourcePreference,
    activeProviderId: string | undefined,
): LyricProviderSource => {
    if (preference !== 'auto') return preference;
    return activeProviderId === 'qq' || activeProviderId === 'kugou' ? activeProviderId : 'netease';
};
