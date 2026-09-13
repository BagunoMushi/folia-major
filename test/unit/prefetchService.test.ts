import { beforeEach, describe, expect, it } from 'vitest';
import { useLyricSettingsStore } from '@/stores/useLyricSettingsStore';
import { useOnlineProviderAccountStore } from '@/stores/useOnlineProviderAccountStore';
import type { SongResult } from '@/types';
import { clearPrefetchRuntime, getPrefetchedData, updatePrefetchedAudioUrl } from '@/services/prefetchService';

// test/unit/prefetchService.test.ts

const song: SongResult = {
    id: 'prefetch-song',
    name: 'Song',
    artists: [],
    album: { id: 'album', name: 'Album' },
    durationMs: 1000,
    sourceRef: { kind: 'online', providerId: 'netease', mediaId: 'prefetch-song' },
};

describe('prefetched online ReplayGain metadata', () => {
    beforeEach(() => clearPrefetchRuntime());

    it('keeps ReplayGain alongside a prefetched URL', () => {
        updatePrefetchedAudioUrl(song, 'https://audio.test/song.flac', 'high', {
            trackGain: -7.1,
            trackPeak: 0.9,
        });

        expect(getPrefetchedData(song, 'high')).toMatchObject({
            audioUrl: 'https://audio.test/song.flac',
            replayGain: { trackGain: -7.1, trackPeak: 0.9 },
        });
    });

    it('keeps the media-cache sentinel, which has no quality to mismatch', () => {
        // 'CACHED_IN_DB' says the bytes are already on disk. It is not a URL, so there is nothing
        // to re-fetch at a different quality - but the mismatch branch answered by nulling it,
        // and a cached track therefore reported itself as uncached the first time anything asked.
        updatePrefetchedAudioUrl(song, 'CACHED_IN_DB', 'standard');

        expect(getPrefetchedData(song, 'hires')).toMatchObject({ audioUrl: 'CACHED_IN_DB' });
    });

    it('invalidates URL metadata together on a quality mismatch', () => {
        updatePrefetchedAudioUrl(song, 'https://audio.test/song.flac', 'high', { trackGain: -7.1 });

        expect(getPrefetchedData(song, 'lossless')).toMatchObject({
            audioUrl: null,
            replayGain: undefined,
        });
    });
});

describe('prefetched lyric priority', () => {
    beforeEach(() => {
        clearPrefetchRuntime();
        useLyricSettingsStore.setState({ autoUseBestLyric: true, preferredAlternativeLyricSource: 'auto' });
        useOnlineProviderAccountStore.setState({ activeProviderId: 'qq' });
    });

    it('drops lyrics chosen for the previous platform while retaining the audio', () => {
        updatePrefetchedAudioUrl(song, 'https://audio.test/song.flac', 'high');
        const cached = getPrefetchedData(song)!;
        cached.lyricPreferenceSource = 'qq';
        cached.lyrics = { lines: [], isWordByWord: true };
        cached.lyricRaw = { mainLrc: 'QQ lyrics', yrcLrc: null, transLrc: null, isPureMusic: false };
        expect(getPrefetchedData(song)?.lyrics).toBe(cached.lyrics);
        useOnlineProviderAccountStore.setState({ activeProviderId: 'netease' });
        expect(getPrefetchedData(song)).toMatchObject({
            audioUrl: 'https://audio.test/song.flac', lyrics: null, lyricRaw: null, lyricPreferenceSource: null,
        });
    });

    it('keeps an explicit QQ preference when the active platform changes', () => {
        useLyricSettingsStore.setState({ preferredAlternativeLyricSource: 'qq' });
        updatePrefetchedAudioUrl(song, 'https://audio.test/song.flac', 'high');
        const cached = getPrefetchedData(song)!;
        cached.lyricPreferenceSource = 'qq';
        const lyrics = { lines: [], isWordByWord: true };
        cached.lyrics = lyrics;
        useOnlineProviderAccountStore.setState({ activeProviderId: 'netease' });
        expect(getPrefetchedData(song)?.lyrics).toBe(lyrics);
    });
});
