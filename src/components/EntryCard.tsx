'use client';

import Image from 'next/image';
import { Entry } from '../types';

interface EntryCardProps {
  entry: Entry;
  onSelect?: (entry: Entry) => void;
}

export function EntryCard({ entry, onSelect }: EntryCardProps) {
  const date = new Date(entry.ts);
  const previewText = entry.text.trim().slice(0, 120) || '（テキストなし）';
  return (
    <article
      className="bg-white rounded-2xl shadow-soft p-4 flex gap-3 cursor-pointer transition hover:-translate-y-0.5"
      onClick={() => onSelect?.(entry)}
    >
      {entry.photoBase64 ? (
        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-xl">
          <Image
            src={entry.photoBase64}
            alt="メモ写真"
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>
      ) : (
        <div className="w-20 h-20 flex-shrink-0 rounded-xl bg-mist border border-dotted border-moss flex items-center justify-center text-sm text-moss">
          no photo
        </div>
      )}
      <div className="flex-1 min-w-0">
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-dusk">
            {date.toLocaleString('ja-JP', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </h3>
          {entry.loc ? (
            <span className="text-xs font-semibold bg-moss text-white px-2 py-1 rounded-full">
              位置あり
            </span>
          ) : (
            <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
              位置なし
            </span>
          )}
        </header>
        <p className="text-sm text-slate-600 mt-2 line-clamp-3 whitespace-pre-wrap">{previewText}</p>
      </div>
    </article>
  );
}
