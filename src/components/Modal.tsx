'use client';

import { ReactNode } from 'react';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}

export function Modal({ title, open, onClose, children, actions }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-3xl shadow-soft w-full max-w-lg p-6 relative">
        <button
          type="button"
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
          onClick={onClose}
          aria-label="閉じる"
        >
          ✕
        </button>
        <h2 className="text-2xl font-bold text-dusk mb-4">{title}</h2>
        <div className="space-y-4">{children}</div>
        {actions ? <div className="mt-6 flex justify-end gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
