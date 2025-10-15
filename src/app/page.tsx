'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { v4 as uuid } from 'uuid';
import { AppState, Entry, Trail } from '../types';
import { loadState, saveState, exportState } from '../lib/storage';
import { fileToResizedDataUrl } from '../lib/image';
import { formatDistance, haversineDistanceMeters } from '../lib/geo';
import { EntryCard } from '../components/EntryCard';
import { Modal } from '../components/Modal';

const MapView = dynamic(() => import('../components/Map').then((mod) => mod.MapView), {
  ssr: false
});

const NUDGES = [
  '次の角で左に曲がってみよう',
  '青いものを3つ探してみて',
  '水の音がする方向へ進もう',
  '立ち止まって空の色を眺めてみる',
  '道の分かれ道では普段選ばない方へ',
  '気になる匂いのする方へ',
  '5分だけ早歩きしてみる',
  '座れる場所を見つけて深呼吸'
];

const defaultState: AppState = {
  entries: [],
  trails: [],
  prefs: {
    unit: 'metric',
    photoMaxPx: 800
  }
};

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (text: string) => {
    setMessage(text);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setMessage(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { message, showToast };
}

export default function HomePage() {
  const [state, setState] = useState<AppState>(() => (typeof window !== 'undefined' ? loadState() : defaultState));
  const [isReady, setIsReady] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [entryPhoto, setEntryPhoto] = useState<File | null>(null);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTrail, setActiveTrail] = useState<Trail | null>(null);
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { message, showToast } = useToast();

  useEffect(() => {
    setState(loadState());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    saveState(state);
  }, [state, isReady]);

  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
    };
  }, []);

  const sortedEntries = useMemo(
    () => [...state.entries].sort((a, b) => b.ts - a.ts),
    [state.entries]
  );

  const sortedTrails = useMemo(
    () => [...state.trails].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)),
    [state.trails]
  );

  const handleOpenEntryModal = () => {
    setEntryText('');
    setEntryPhoto(null);
    setIsEntryModalOpen(true);
  };

  const handleEntryPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setEntryPhoto(event.target.files[0]);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      showToast('位置情報は利用できませんでした');
      return Promise.resolve(null);
    }
    return new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => {
          showToast('位置情報の取得に失敗しました');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  const handleSaveEntry = async () => {
    if (isSavingEntry) return;
    setIsSavingEntry(true);
    try {
      const id = uuid();
      const ts = Date.now();
      let photoBase64: string | undefined;
      if (entryPhoto) {
        photoBase64 = await fileToResizedDataUrl(entryPhoto, state.prefs.photoMaxPx);
      }
      const position = await captureLocation();
      const entry: Entry = {
        id,
        ts,
        text: entryText,
        photoBase64,
        loc: position
          ? {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              acc: position.coords.accuracy
            }
          : undefined
      };
      setState((prev) => ({
        ...prev,
        entries: [entry, ...prev.entries]
      }));
      showToast('メモを保存しました');
      setIsEntryModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('メモの保存に失敗しました');
    } finally {
      setIsSavingEntry(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
      setIsRecording(false);
      setActiveTrail((current) => {
        if (!current) return null;
        const finalized: Trail = {
          ...current,
          endedAt: Date.now(),
          distanceM: haversineDistanceMeters(current.points)
        };
        if (finalized.points.length < 2) {
          showToast('記録が短かったため距離は計測されませんでした');
        }
        setState((prev) => ({
          ...prev,
          trails: [finalized, ...prev.trails]
        }));
        showToast('やさしい記録を保存しました');
        return null;
      });
      return;
    }

    const newTrail: Trail = {
      id: uuid(),
      startedAt: Date.now(),
      points: []
    };
    setActiveTrail(newTrail);
    setIsRecording(true);
    const sample = async () => {
      const position = await captureLocation();
      if (!position) return;
      setActiveTrail((current) => {
        if (!current) return null;
        const nextPoints = [
          ...current.points,
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            ts: Date.now()
          }
        ];
        return {
          ...current,
          points: nextPoints,
          distanceM: haversineDistanceMeters(nextPoints)
        };
      });
    };

    await sample();
    recordIntervalRef.current = setInterval(sample, 20000);
    showToast('やさしい記録を開始しました');
  };

  const handleExport = () => {
    exportState(state);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as AppState;
      if (!data.entries || !data.trails || !data.prefs) {
        throw new Error('Invalid data');
      }
      setState(data);
      showToast('データを読み込みました');
    } catch (error) {
      console.error(error);
      showToast('JSON の読み込みに失敗しました');
    } finally {
      event.target.value = '';
    }
  };

  const handlePrefsChange = (changes: Partial<AppState['prefs']>) => {
    setState((prev) => ({
      ...prev,
      prefs: {
        ...prev.prefs,
        ...changes
      }
    }));
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-moss">WALKING DIARY</p>
        <h1 className="text-4xl font-bold text-dusk">さまよう散歩を、やさしく残す。</h1>
        <p className="text-slate-600 max-w-2xl">
          その場で感じたことや見つけた景色をワンタップで記録。メモと写真、ゆったり歩いた軌跡を地図で振り返りましょう。
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleOpenEntryModal}
            className="px-6 py-3 rounded-full bg-clay text-white font-semibold shadow-soft hover:bg-[#a43d3f]"
          >
            その場メモ
          </button>
          <button
            type="button"
            onClick={() => showToast(NUDGES[Math.floor(Math.random() * NUDGES.length)])}
            className="px-6 py-3 rounded-full bg-moss text-white font-semibold shadow-soft hover:bg-[#5c8743]"
          >
            きっかけを表示
          </button>
          <button
            type="button"
            onClick={toggleRecording}
            className={`px-6 py-3 rounded-full font-semibold shadow-soft ${
              isRecording
                ? 'bg-white text-clay border border-clay'
                : 'bg-dusk text-white hover:bg-[#2f5337]'
            }`}
          >
            {isRecording ? 'やさしい記録を停止' : 'やさしい記録を開始'}
          </button>
        </div>
        {message ? (
          <div className="mt-4 bg-white border border-moss/30 text-dusk px-4 py-3 rounded-2xl shadow-soft inline-flex items-center gap-2">
            <span className="text-lg">✨</span>
            <p>{message}</p>
          </div>
        ) : null}
      </header>

      <section className="grid gap-6">
        <div className="bg-white rounded-3xl shadow-soft p-6">
          <h2 className="text-2xl font-semibold text-dusk mb-4">今日の散歩を地図で振り返る</h2>
          <div className="overflow-hidden rounded-3xl">
            <MapView entries={state.entries} trails={state.trails} activeTrail={activeTrail} unit={state.prefs.unit} />
          </div>
          {isRecording && activeTrail ? (
            <div className="mt-4 p-4 rounded-2xl bg-mist text-slate-700 flex flex-wrap gap-3 items-center justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-dusk">やさしい記録中…</p>
                <p className="text-sm">
                  現在 {activeTrail.points.length} 点 | 距離 {formatDistance(activeTrail.distanceM ?? 0, state.prefs.unit)}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleRecording}
                className="px-4 py-2 rounded-full bg-clay text-white font-semibold shadow-soft"
              >
                記録を終了
              </button>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-3xl shadow-soft p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-dusk">日記リスト</h2>
          {sortedEntries.length === 0 ? (
            <p className="text-slate-500">まだメモはありません。散歩のひとコマを記録してみましょう。</p>
          ) : (
            <div className="space-y-4">
              {sortedEntries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} onSelect={setSelectedEntry} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-soft p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-dusk">やさしい記録の履歴</h2>
          {sortedTrails.length === 0 ? (
            <p className="text-slate-500">まだ記録はありません。トグルをオンにして散歩の軌跡を残しましょう。</p>
          ) : (
            <ul className="space-y-3">
              {sortedTrails.map((trail) => (
                <li key={trail.id} className="flex items-center justify-between bg-mist rounded-2xl px-4 py-3">
                  <div>
                    <p className="font-semibold text-dusk">
                      {new Date(trail.startedAt).toLocaleString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-sm text-slate-600">
                      ポイント {trail.points.length} 点 ・ 距離 {formatDistance(trail.distanceM ?? 0, state.prefs.unit)}
                    </p>
                  </div>
                  {trail.endedAt ? (
                    <span className="text-xs text-slate-500">
                      終了 {new Date(trail.endedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-soft p-6 space-y-4">
        <h2 className="text-2xl font-semibold text-dusk">設定</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-600">距離の単位</span>
            <select
              value={state.prefs.unit}
              onChange={(event) => handlePrefsChange({ unit: event.target.value as 'metric' | 'imperial' })}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss"
            >
              <option value="metric">キロメートル (km)</option>
              <option value="imperial">マイル (mi)</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-600">画像縮小サイズ（最大辺 px）</span>
            <input
              type="number"
              min={400}
              max={1600}
              step={50}
              value={state.prefs.photoMaxPx}
              onChange={(event) => handlePrefsChange({ photoMaxPx: Number(event.target.value) })}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss"
            />
          </label>
        </div>
      </section>

      <footer className="bg-white rounded-3xl shadow-soft p-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="space-y-1 text-sm text-slate-600">
          <p>データはこの端末のブラウザにだけ保存されます。</p>
          <p>必要に応じて JSON でバックアップしてください。</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 rounded-full bg-dusk text-white font-semibold shadow-soft"
          >
            JSON エクスポート
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="px-4 py-2 rounded-full bg-white border border-moss text-moss font-semibold shadow-soft"
          >
            JSON インポート
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </footer>

      <Modal
        open={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title="その場メモ"
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsEntryModalOpen(false)}
              className="px-4 py-2 rounded-full border border-slate-200 text-slate-600"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSaveEntry}
              disabled={isSavingEntry}
              className="px-6 py-2 rounded-full bg-clay text-white font-semibold shadow-soft disabled:opacity-60"
            >
              {isSavingEntry ? '保存中…' : '保存する'}
            </button>
          </>
        }
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-600">感じたことをメモ</span>
          <textarea
            value={entryText}
            onChange={(event) => setEntryText(event.target.value)}
            placeholder="見つけたもの、感じた空気、音の記録など"
            rows={4}
            className="rounded-2xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-600">写真を添える（任意）</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleEntryPhotoChange}
            className="rounded-2xl border border-slate-200 px-3 py-2"
          />
          {entryPhoto ? (
            <p className="text-xs text-slate-500">選択中: {entryPhoto.name}</p>
          ) : (
            <p className="text-xs text-slate-400">カメラまたはライブラリから追加できます</p>
          )}
        </label>
        <p className="text-xs text-slate-500">
          保存時に最大 {state.prefs.photoMaxPx}px まで縮小し、端末内にのみ保存します。
        </p>
      </Modal>

      <Modal
        open={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        title={selectedEntry ? new Date(selectedEntry.ts).toLocaleString('ja-JP') : 'メモ詳細'}
        actions={
          <button
            type="button"
            onClick={() => setSelectedEntry(null)}
            className="px-4 py-2 rounded-full bg-dusk text-white font-semibold shadow-soft"
          >
            閉じる
          </button>
        }
      >
        {selectedEntry ? (
          <div className="space-y-4">
            {selectedEntry.photoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedEntry.photoBase64}
                alt="メモ写真"
                className="w-full rounded-2xl object-cover"
              />
            ) : null}
            <p className="whitespace-pre-wrap text-slate-700">{selectedEntry.text || '（テキストなし）'}</p>
            {selectedEntry.loc ? (
              <div className="text-xs text-slate-500 space-y-1">
                <p>
                  緯度: {selectedEntry.loc.lat.toFixed(5)} / 経度: {selectedEntry.loc.lng.toFixed(5)}
                </p>
                {selectedEntry.loc.acc ? <p>精度: ±{selectedEntry.loc.acc.toFixed(0)}m</p> : null}
              </div>
            ) : (
              <p className="text-xs text-slate-400">位置情報は保存されていません。</p>
            )}
          </div>
        ) : null}
      </Modal>
    </main>
  );
}
