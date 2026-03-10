export function getColorClass(type: string) {
  switch (type) {
    case '事实性错误': return 'bg-red-100 text-red-800 border-red-200';
    case '推理错误': return 'bg-orange-100 text-orange-800 border-orange-200';
    case '情感表达错误': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getHighlightClass(type: string, isActive = false) {
  switch (type) {
    case '事实性错误': return isActive ? 'bg-red-300/90 ring-1 ring-red-400/70 underline decoration-dashed decoration-2 decoration-red-500 underline-offset-4' : 'bg-red-200/60 hover:bg-red-300/80';
    case '推理错误': return isActive ? 'bg-orange-300/90 ring-1 ring-orange-400/70 underline decoration-dashed decoration-2 decoration-orange-500 underline-offset-4' : 'bg-orange-200/60 hover:bg-orange-300/80';
    case '情感表达错误': return isActive ? 'bg-purple-300/90 ring-1 ring-purple-400/70 underline decoration-dashed decoration-2 decoration-purple-500 underline-offset-4' : 'bg-purple-200/60 hover:bg-purple-300/80';
    default: return isActive ? 'bg-gray-300/90 ring-1 ring-gray-400/70 underline decoration-dashed decoration-2 decoration-gray-500 underline-offset-4' : 'bg-gray-200/60 hover:bg-gray-300/80';
  }
}
