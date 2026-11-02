'use client';

import { TREATS, type TreatId } from '@/lib/chat/treat';
import { PixelTreat } from './PixelTreat';

type Props = {
  treat: TreatId;
  onClick: () => void;
  disabled?: boolean;
};

/** 간식 주기 버튼. 모서리가 둥근 네모. */
export function TreatButton({ treat, onClick, disabled = false }: Props) {
  const label = `간식 주기: ${TREATS[treat].name}`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-14 w-14 items-center sm:h-16 sm:w-16 justify-center rounded-2xl border-[3px] border-bark bg-[#ffd98a] text-bark shadow-[3px_3px_0_0_rgba(91,58,41,0.25)] transition hover:bg-[#ffcd66] active:translate-y-0.5 active:shadow-none disabled:opacity-40"
    >
      <PixelTreat treat={treat} size={36} />
    </button>
  );
}
