import type { LyricSourcePreference } from '../types';
import { useOnlineProviderAccountStore } from '../stores/useOnlineProviderAccountStore';
import { resolvePreferredLyricSource } from '../utils/lyrics/sourcePriority';

// src/services/lyricSourcePreference.ts

export const getPreferredLyricSource = (preference: LyricSourcePreference) => (
    resolvePreferredLyricSource(preference, useOnlineProviderAccountStore.getState().activeProviderId)
);
