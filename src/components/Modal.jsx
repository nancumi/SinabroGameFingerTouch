import React from 'react';

export default function Modal({ isOpen, title, message, onClose, confirmText = '확인' }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-default select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl text-center text-[12px] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className="font-semibold text-neutral-100 text-[13px] mb-2">
            {title}
          </h3>
        )}
        <p className="text-neutral-300 text-[12px] leading-relaxed mb-5 whitespace-pre-line">
          {message}
        </p>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-[12px] text-neutral-800 bg-[#bae6fd] hover:bg-[#93c5fd] active:scale-95 transition-all shadow-sm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

