import type { CSSProperties } from 'react';
import type { ErrorType } from './types';

export function getColorClass(type: string) {
  switch (type) {
    case '事实性错误': return 'bg-red-100 text-red-800 border-red-200';
    case '推理错误': return 'bg-orange-100 text-orange-800 border-orange-200';
    case '情感表达错误': return 'bg-teal-100 text-teal-800 border-teal-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getHighlightClass(type: string) {
  switch (type) {
    case '事实性错误': return 'bg-red-200/70 hover:bg-red-300/80';
    case '推理错误': return 'bg-orange-200/70 hover:bg-orange-300/80';
    case '情感表达错误': return 'bg-teal-200/70 hover:bg-teal-300/80';
    default: return 'bg-gray-200/70 hover:bg-gray-300/80';
  }
}

export function getActiveHighlightClass(type: string) {
  switch (type) {
    case '事实性错误': return 'ring-1 ring-red-400/70 underline decoration-dashed decoration-2 decoration-red-500 underline-offset-4';
    case '推理错误': return 'ring-1 ring-orange-400/70 underline decoration-dashed decoration-2 decoration-orange-500 underline-offset-4';
    case '情感表达错误': return 'ring-1 ring-teal-400/70 underline decoration-dashed decoration-2 decoration-teal-500 underline-offset-4';
    default: return 'ring-1 ring-gray-400/70 underline decoration-dashed decoration-2 decoration-gray-500 underline-offset-4';
  }
}

export function getTypeDotClass(type: string) {
  switch (type) {
    case '事实性错误': return 'bg-red-500';
    case '推理错误': return 'bg-orange-500';
    case '情感表达错误': return 'bg-teal-500';
    default: return 'bg-gray-400';
  }
}

export const HIGHLIGHT_LAYER_ORDER: ErrorType[] = ['事实性错误', '推理错误', '情感表达错误'];

const HIGHLIGHT_STRIPE_COLORS: Record<ErrorType, { normal: string; active: string }> = {
  '事实性错误': { normal: 'rgba(248, 113, 113, 0.58)', active: 'rgba(239, 68, 68, 0.82)' },
  '推理错误': { normal: 'rgba(96, 165, 250, 0.55)', active: 'rgba(59, 130, 246, 0.78)' },
  '情感表达错误': { normal: 'rgba(45, 212, 191, 0.58)', active: 'rgba(13, 148, 136, 0.82)' },
};

export function getHighlightStripeStyle(types: ErrorType[], isActive = false): CSSProperties {
  const stripeHeight = 8;
  const stripeGap = 2;
  const sortedTypes = [...types].sort((left, right) => HIGHLIGHT_LAYER_ORDER.indexOf(left) - HIGHLIGHT_LAYER_ORDER.indexOf(right));

  return {
    backgroundImage: sortedTypes.map((type) => `linear-gradient(${HIGHLIGHT_STRIPE_COLORS[type][isActive ? 'active' : 'normal']}, ${HIGHLIGHT_STRIPE_COLORS[type][isActive ? 'active' : 'normal']})`).join(', '),
    backgroundSize: sortedTypes.map(() => `100% ${stripeHeight}px`).join(', '),
    backgroundPosition: sortedTypes.map((_, index) => `0 calc(100% - ${index * (stripeHeight + stripeGap)}px)`).join(', '),
    backgroundRepeat: 'no-repeat',
    boxDecorationBreak: 'clone',
    WebkitBoxDecorationBreak: 'clone',
  };
}
