import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDot,
  Eye,
  EyeOff,
  Layers3,
  Trash2,
  X,
} from 'lucide-react';
import {
  Annotation,
  AnnotationRange,
  DraftAnnotation,
  ErrorType,
  TextSegment,
} from './types';
import { INITIAL_ANNOTATIONS, PROMPT, REPLY_1, REPLY_2, SUB_TYPES } from './constants';
import {
  getActiveHighlightClass,
  getColorClass,
  getHighlightClass,
  getTypeDotClass,
  HIGHLIGHT_LAYER_ORDER,
} from './utils';

const FLOATING_WIDTH = 320;
const FLOATING_MARGIN = 12;
const FLOATING_OFFSET = 14;
const ANNOTATION_TEXT_JOINER = ' … ';

type FloatingPosition = {
  left: number;
  top: number;
};

type OverlapPopoverState = {
  segmentKey: string;
  left: number;
  top: number;
};

type EditorPopoverState = {
  annotationId: string;
  left: number;
  top: number;
};

type DragPopoverState =
  | {
    kind: 'overlap';
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  }
  | {
    kind: 'editor';
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  };

type SuspendedPopoversState = {
  draft: DraftAnnotation | null;
  overlapPopover: OverlapPopoverState | null;
  editorPopover: EditorPopoverState | null;
};

type AnnotationFilter = 'all' | ErrorType;
type ShiftCursorHint = 'add' | 'remove' | null;

function clampFloatingPosition(left: number, top: number, width = FLOATING_WIDTH, height = 320): FloatingPosition {
  const maxLeft = Math.max(FLOATING_MARGIN, window.innerWidth - width - FLOATING_MARGIN);
  const maxTop = Math.max(FLOATING_MARGIN, window.innerHeight - height - FLOATING_MARGIN);

  return {
    left: Math.min(Math.max(FLOATING_MARGIN, left), maxLeft),
    top: Math.min(Math.max(FLOATING_MARGIN, top), maxTop),
  };
}

function getFloatingPosition(clientX: number, clientY: number, width = FLOATING_WIDTH, height = 320) {
  return clampFloatingPosition(clientX + FLOATING_OFFSET, clientY + FLOATING_OFFSET, width, height);
}

function buildCursorDataUri(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 18, text`;
}

const EDIT_CURSOR = buildCursorDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <path d="M11 5h10M16 5v22M11 27h10" stroke="#334155" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M21.8 8.4l3.8 3.8" stroke="#0f766e" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M18.8 17.2l1.2-4.2 6.1-6.1a1.8 1.8 0 0 1 2.5 0l1.5 1.5a1.8 1.8 0 0 1 0 2.5L24 17l-4.2 1.2 1.2-4.2" fill="none" stroke="#0f766e" stroke-width="1.8" stroke-linejoin="round"/>
  </svg>
`);

const ADD_CURSOR = buildCursorDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <path d="M11 5h10M16 5v22M11 27h10" stroke="#334155" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="25" cy="10" r="5.5" fill="#ecfdf5" stroke="#10b981" stroke-width="1.4"/>
    <path d="M25 7.5v5M22.5 10h5" stroke="#10b981" stroke-width="1.8" stroke-linecap="round"/>
  </svg>
`);

const REMOVE_CURSOR = buildCursorDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <path d="M11 5h10M16 5v22M11 27h10" stroke="#334155" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="25" cy="10" r="5.5" fill="#fff7ed" stroke="#f97316" stroke-width="1.4"/>
    <path d="M22.5 10h5" stroke="#f97316" stroke-width="1.8" stroke-linecap="round"/>
  </svg>
`);

function getTextCanvasCursor(mode: 'normal' | 'annotate', isShiftPressed: boolean, shiftCursorHint: ShiftCursorHint) {
  if (mode !== 'annotate') return 'text';
  if (!isShiftPressed) return EDIT_CURSOR;
  if (shiftCursorHint === 'remove') return REMOVE_CURSOR;
  if (shiftCursorHint === 'add') return ADD_CURSOR;
  return EDIT_CURSOR;
}

function isSpaceToggleEvent(event: KeyboardEvent) {
  return event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
}

function collapseSelectionToPoint(clientX: number, clientY: number) {
  const selection = window.getSelection();
  if (!selection) return;

  if ('caretPositionFromPoint' in document) {
    const caretPosition = document.caretPositionFromPoint(clientX, clientY);
    if (caretPosition?.offsetNode) {
      selection.removeAllRanges();
      selection.collapse(caretPosition.offsetNode, caretPosition.offset);
    }
    return;
  }

  if ('caretRangeFromPoint' in document) {
    const caretRangeFromPoint = (document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    }).caretRangeFromPoint;
    const range = caretRangeFromPoint?.(clientX, clientY);
    if (range) {
      selection.removeAllRanges();
      selection.addRange(range);
      selection.collapseToStart();
    }
  }
}

function isForwardSelection(selection: Selection) {
  const { anchorNode, anchorOffset, focusNode, focusOffset } = selection;

  if (!anchorNode || !focusNode) return true;
  if (anchorNode === focusNode) return anchorOffset <= focusOffset;

  const position = anchorNode.compareDocumentPosition(focusNode);
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return false;
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return true;

  return anchorOffset <= focusOffset;
}

function getSelectableTextLength(node: Node): number {
  if (node instanceof HTMLElement && node.dataset.selectionIgnore === 'true') return 0;
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length ?? 0;

  return Array.from(node.childNodes).reduce((sum, child) => sum + getSelectableTextLength(child), 0);
}

function getOffsetFromContainer(container: HTMLElement, node: Node, offset: number) {
  let total = 0;

  const visit = (current: Node): boolean => {
    if (current instanceof HTMLElement && current.dataset.selectionIgnore === 'true') return false;

    if (current === node) {
      if (current.nodeType === Node.TEXT_NODE) {
        total += offset;
        return true;
      }

      const childNodes = Array.from(current.childNodes).slice(0, offset);
      total += childNodes.reduce((sum, child) => sum + getSelectableTextLength(child), 0);
      return true;
    }

    if (current.nodeType === Node.TEXT_NODE) {
      total += current.textContent?.length ?? 0;
      return false;
    }

    for (const child of Array.from(current.childNodes)) {
      if (visit(child)) return true;
    }

    return false;
  };

  visit(container);
  return total;
}

function getReplyText(replyId: Annotation['replyId']) {
  return replyId === 'reply1' ? REPLY_1 : REPLY_2;
}

function createAnnotationRange(startIndex: number, endIndex: number, sourceText: string): AnnotationRange {
  return {
    startIndex,
    endIndex,
    text: sourceText.slice(startIndex, endIndex),
  };
}

function normalizeRanges(ranges: AnnotationRange[], sourceText: string) {
  const sortedRanges = [...ranges]
    .filter((range) => range.endIndex > range.startIndex)
    .sort((left, right) => left.startIndex - right.startIndex);

  return sortedRanges.reduce<AnnotationRange[]>((acc, range) => {
    const lastRange = acc[acc.length - 1];

    if (!lastRange || range.startIndex > lastRange.endIndex) {
      acc.push(createAnnotationRange(range.startIndex, range.endIndex, sourceText));
      return acc;
    }

    lastRange.endIndex = Math.max(lastRange.endIndex, range.endIndex);
    lastRange.text = sourceText.slice(lastRange.startIndex, lastRange.endIndex);
    return acc;
  }, []);
}

function buildAnnotationText(ranges: AnnotationRange[]) {
  return ranges.map((range) => range.text).join(ANNOTATION_TEXT_JOINER);
}

function normalizeAnnotation(annotation: Annotation) {
  const sourceText = getReplyText(annotation.replyId);
  const baseRanges = annotation.ranges?.length
    ? annotation.ranges
    : [createAnnotationRange(annotation.startIndex, annotation.endIndex, sourceText)];
  const ranges = normalizeRanges(baseRanges, sourceText);

  if (!ranges.length) return annotation;

  return {
    ...annotation,
    ranges,
    startIndex: ranges[0].startIndex,
    endIndex: ranges[ranges.length - 1].endIndex,
    text: buildAnnotationText(ranges),
    hidden: annotation.hidden ?? false,
  };
}

function removeSelectionFromRanges(ranges: AnnotationRange[], startIndex: number, endIndex: number, sourceText: string) {
  return normalizeRanges(
    ranges.flatMap((range) => {
      if (endIndex <= range.startIndex || startIndex >= range.endIndex) {
        return [range];
      }

      const nextRanges: AnnotationRange[] = [];

      if (startIndex > range.startIndex) {
        nextRanges.push(createAnnotationRange(range.startIndex, Math.min(startIndex, range.endIndex), sourceText));
      }

      if (endIndex < range.endIndex) {
        nextRanges.push(createAnnotationRange(Math.max(endIndex, range.startIndex), range.endIndex, sourceText));
      }

      return nextRanges;
    }),
    sourceText,
  );
}

function annotationOverlapsSelection(annotation: Annotation, startIndex: number, endIndex: number) {
  return annotation.ranges.some((range) => startIndex < range.endIndex && endIndex > range.startIndex);
}

function getAnnotationDisplayIndex(annotation: Annotation, annotations: Annotation[]) {
  return annotations.filter((item) => item.replyId === annotation.replyId).findIndex((item) => item.id === annotation.id) + 1;
}

function getDisplayIndexMap(annotations: Annotation[]) {
  return Object.fromEntries(annotations.map((annotation) => [annotation.id, getAnnotationDisplayIndex(annotation, annotations)]));
}

function buildTextSegments(
  text: string,
  replyId: Annotation['replyId'],
  annotations: Annotation[],
  annotationDisplayOrder: string[],
): TextSegment[] {
  const boundaries = Array.from(new Set([
    0,
    text.length,
    ...annotations.flatMap((annotation) => annotation.ranges.flatMap((range) => [range.startIndex, range.endIndex])),
  ])).sort((left, right) => left - right);

  const annotationPriority = new Map(annotationDisplayOrder.map((annotationId, index) => [annotationId, index]));

  const segments: TextSegment[] = [];

  for (let boundaryIndex = 0; boundaryIndex < boundaries.length - 1; boundaryIndex += 1) {
    const startIndex = boundaries[boundaryIndex];
    const endIndex = boundaries[boundaryIndex + 1];

    if (endIndex <= startIndex) continue;

    const coveringAnnotations = annotations
      .filter((annotation) => annotation.ranges.some((range) => startIndex >= range.startIndex && endIndex <= range.endIndex))
      .sort((left, right) => (
        (annotationPriority.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (annotationPriority.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      ));

    const key = `${replyId}:${startIndex}-${endIndex}`;
    const primaryAnnotation = coveringAnnotations[0]?.id ?? null;

    segments.push({
      key,
      replyId,
      startIndex,
      endIndex,
      text: text.slice(startIndex, endIndex),
      annotationIds: coveringAnnotations.map((annotation) => annotation.id),
      primaryAnnotationId: primaryAnnotation,
      isOverlap: coveringAnnotations.length > 1,
      overlapCount: coveringAnnotations.length,
    });
  }

  return segments;
}

type DraftPopoverProps = {
  draft: DraftAnnotation;
  setDraft: React.Dispatch<React.SetStateAction<DraftAnnotation | null>>;
  onSave: () => void;
  onCancel: () => void;
};

function DraftPopover({ draft, setDraft, onSave, onCancel }: DraftPopoverProps) {
  return createPortal(
    <div
      className="annotation-popover fixed z-[120] w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl"
      style={{ top: draft.top, left: draft.left }}
      onMouseUp={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-800">添加标注</div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs text-gray-500">label name</label>
        <select
          className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          value={draft.type}
          onChange={(event) => setDraft({ ...draft, type: event.target.value as ErrorType, subType: '' })}
        >
          <option value="事实性错误">事实性错误</option>
          <option value="推理错误">推理错误</option>
          <option value="情感表达错误">情感表达错误</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs text-gray-500">二级类型</label>
        <select
          className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          value={draft.subType}
          onChange={(event) => setDraft({ ...draft, subType: event.target.value })}
        >
          <option value="">无</option>
          {SUB_TYPES[draft.type]?.map((subType) => <option key={subType} value={subType}>{subType}</option>)}
        </select>
      </div>

      <textarea
        className="mb-4 h-16 w-full resize-none rounded-md border border-gray-200 p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="简短说明原因..."
        value={draft.reason}
        onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
      />

      <div className="flex justify-end gap-2">
        <button className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100" onClick={onCancel}>取消</button>
        <button className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700" onClick={onSave}>保存</button>
      </div>
    </div>,
    document.body,
  );
}

type AnnotationEditorPopoverProps = {
  annotation: Annotation;
  displayIndex: number;
  position: FloatingPosition;
  onClose: () => void;
  onDelete: (annotationId: string) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDragStart: (event: React.PointerEvent<HTMLDivElement>) => void;
};

function AnnotationEditorPopover({
  annotation,
  displayIndex,
  position,
  onClose,
  onDelete,
  onUpdateAnnotation,
  onDragStart,
}: AnnotationEditorPopoverProps) {
  return createPortal(
    <div className="annotation-editor-popover fixed z-[145] w-[340px] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl" style={position}>
      <div className="mb-3 flex cursor-move items-start justify-between gap-3" onPointerDown={onDragStart}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <span className={`h-2.5 w-2.5 rounded-full ${getTypeDotClass(annotation.type)}`}></span>
            <span>#{displayIndex}</span>
            <span className={`rounded-md border px-2 py-1 text-[11px] font-medium ${getColorClass(annotation.type)}`}>
              {annotation.type}
            </span>
          </div>
          <div className="mt-2 rounded border border-gray-100 bg-gray-50 p-2 text-xs text-gray-600">
            <div className="leading-relaxed">"{annotation.text}"</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(annotation.id);
            }}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="删除"
          >
            <Trash2 size={16}/>
          </button>
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16}/>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">错误类型</label>
          <select
            className={`w-full rounded-md border px-2 py-1.5 text-sm font-medium outline-none ${getColorClass(annotation.type)}`}
            value={annotation.type}
            onChange={(event) => onUpdateAnnotation(annotation.id, { type: event.target.value as ErrorType, subType: '' })}
          >
            <option value="事实性错误">事实性错误</option>
            <option value="推理错误">推理错误</option>
            <option value="情感表达错误">情感表达错误</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">二级类型</label>
          <select
            className="w-full rounded border border-gray-200 bg-white p-1.5 text-sm"
            value={annotation.subType}
            onChange={(event) => onUpdateAnnotation(annotation.id, { subType: event.target.value })}
          >
            <option value="">无</option>
            {SUB_TYPES[annotation.type]?.map((subType) => <option key={subType} value={subType}>{subType}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">原因</label>
          <textarea
            className="h-16 w-full resize-none rounded border border-gray-200 p-1.5 text-sm"
            value={annotation.reason}
            onChange={(event) => onUpdateAnnotation(annotation.id, { reason: event.target.value })}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

type OverlapPopoverProps = {
  segment: TextSegment;
  annotations: Annotation[];
  displayIndexMap: Record<string, number>;
  position: FloatingPosition;
  onClose: () => void;
  onSetPrimary: (currentPrimaryId: string | null, annotationId: string) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDelete: (annotationId: string) => void;
  onDragStart: (event: React.PointerEvent<HTMLDivElement>) => void;
};

function OverlapPopover({
  segment,
  annotations,
  displayIndexMap,
  position,
  onClose,
  onSetPrimary,
  onUpdateAnnotation,
  onDelete,
  onDragStart,
}: OverlapPopoverProps) {
  const [expandedAnnotationIds, setExpandedAnnotationIds] = useState<string[]>([]);

  const toggleExpanded = (annotationId: string) => {
    setExpandedAnnotationIds((ids) => (
      ids.includes(annotationId)
        ? ids.filter((id) => id !== annotationId)
        : [...ids, annotationId]
    ));
  };

  return createPortal(
    <div className="overlap-popover fixed z-[140] w-[360px] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl" style={position}>
      <div className="mb-3 flex cursor-move items-start justify-between gap-3" onPointerDown={onDragStart}>
        <div>
          <div className="text-sm font-semibold text-gray-800">重叠标注</div>
        </div>
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16}/>
        </button>
      </div>

      <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-700">
        "{segment.text}"
      </div>

      <div className="space-y-3">
        {annotations.map((annotation) => {
          const isPrimary = annotation.id === segment.primaryAnnotationId;
          const isExpanded = expandedAnnotationIds.includes(annotation.id);
          const primaryBorderClass = isPrimary ? getColorClass(annotation.type).split(' ').find((item) => item.startsWith('border-')) ?? 'border-gray-300' : 'border-gray-200';

          return (
            <div
              key={annotation.id}
              className={`cursor-pointer rounded-xl bg-white p-3 transition-shadow ${isPrimary ? `border-2 ${primaryBorderClass}` : 'border border-gray-200'} ${isExpanded ? 'shadow-sm' : ''}`}
              onClick={() => toggleExpanded(annotation.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <span className={`h-2.5 w-2.5 rounded-full ${getTypeDotClass(annotation.type)}`}></span>
                    <span>#{displayIndexMap[annotation.id]}</span>
                    <span className={`rounded-md border px-2 py-1 text-[11px] font-medium ${getColorClass(annotation.type)}`}>
                      {annotation.type}
                    </span>
                  </div>
                  <div className="mt-2 rounded border border-gray-100 bg-gray-50 p-2 text-xs text-gray-600">
                    <div className="leading-relaxed">"{annotation.text}"</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetPrimary(segment.primaryAnnotationId, annotation.id);
                    }}
                    className={`rounded p-1 transition-colors ${isPrimary ? `${getTypeDotClass(annotation.type).replace('bg-', 'text-')} bg-gray-50` : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
                    title="设为主显示"
                  >
                    <CircleDot size={16}/>
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(annotation.id);
                    }}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="删除"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-3 cursor-default space-y-3 border-t border-gray-200 pt-3" onClick={(event) => event.stopPropagation()}>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">错误类型</label>
                    <select
                      className={`w-full rounded-md border px-2 py-1.5 text-sm font-medium outline-none ${getColorClass(annotation.type)}`}
                      value={annotation.type}
                      onChange={(event) => onUpdateAnnotation(annotation.id, { type: event.target.value as ErrorType, subType: '' })}
                    >
                      <option value="事实性错误">事实性错误</option>
                      <option value="推理错误">推理错误</option>
                      <option value="情感表达错误">情感表达错误</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">二级类型</label>
                    <select
                      className="w-full rounded border border-gray-200 bg-white p-1.5 text-sm"
                      value={annotation.subType}
                      onChange={(event) => onUpdateAnnotation(annotation.id, { subType: event.target.value })}
                    >
                      <option value="">无</option>
                      {SUB_TYPES[annotation.type]?.map((subType) => <option key={subType} value={subType}>{subType}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">原因</label>
                    <textarea
                      className="h-16 w-full resize-none rounded border border-gray-200 p-1.5 text-sm"
                      value={annotation.reason}
                      onChange={(event) => onUpdateAnnotation(annotation.id, { reason: event.target.value })}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}

type HighlightedTextProps = {
  text: string;
  segments: TextSegment[];
  annotationsById: Record<string, Annotation>;
  activeAnnotationId: string | null;
  onAnnotationClick: (event: React.MouseEvent<HTMLSpanElement>, annotation: Annotation) => void;
  onSegmentHover: (event: React.MouseEvent<HTMLElement>, segment: TextSegment) => void;
  onSegmentLeave: () => void;
  onOverlapLabelHover: (event: React.MouseEvent<HTMLButtonElement>, segment: TextSegment) => void;
  onOverlapLabelLeave: () => void;
  onOverlapLabelClick: (event: React.MouseEvent<HTMLButtonElement>, segment: TextSegment) => void;
  textCursor: string;
};

function HighlightedText({
  text,
  segments,
  annotationsById,
  activeAnnotationId,
  onAnnotationClick,
  onSegmentHover,
  onSegmentLeave,
  onOverlapLabelHover,
  onOverlapLabelLeave,
  onOverlapLabelClick,
  textCursor,
}: HighlightedTextProps) {
  const elements = segments.map((segment) => {
    if (!segment.annotationIds.length) {
      return <span key={segment.key}>{segment.text}</span>;
    }

    const primaryAnnotation = segment.primaryAnnotationId ? annotationsById[segment.primaryAnnotationId] : null;
    if (!primaryAnnotation) {
      return <span key={segment.key}>{segment.text}</span>;
    }

    const isActive = Boolean(activeAnnotationId && segment.annotationIds.includes(activeAnnotationId));
    const activeAnnotation = isActive && activeAnnotationId ? annotationsById[activeAnnotationId] : null;
    const displayAnnotation = activeAnnotation ?? primaryAnnotation;
    const wrapperClassName = segment.isOverlap
      ? 'relative inline-block align-baseline pt-4'
      : 'inline';

    const highlight = (
      <span
        className={`cursor-pointer transition-colors duration-150 [box-decoration-break:clone] [-webkit-box-decoration-break:clone] ${getHighlightClass(displayAnnotation.type)} ${isActive ? getActiveHighlightClass(displayAnnotation.type) : ''}`}
        style={{ cursor: textCursor }}
        onClick={(event) => {
          if (window.getSelection()?.toString()) return;
          onAnnotationClick(event, displayAnnotation);
        }}
        onMouseEnter={(event) => {
          if (event.buttons !== 0 || window.getSelection()?.toString()) return;
          onSegmentHover(event, segment);
        }}
        onMouseLeave={onSegmentLeave}
      >
        {segment.text}
      </span>
    );

    return (
      <span
        key={segment.key}
        data-highlight-ids={segment.annotationIds.join(' ')}
        data-annotation-id={displayAnnotation.id}
        className={wrapperClassName}
      >
        {segment.isOverlap ? (
          <button
            type="button"
            data-selection-ignore="true"
            className="overlap-pill absolute left-1/2 top-0 -translate-x-1/2 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold leading-none text-sky-700 shadow-sm hover:bg-sky-100"
            onMouseEnter={(event) => onOverlapLabelHover(event, segment)}
            onMouseLeave={onOverlapLabelLeave}
            onClick={(event) => onOverlapLabelClick(event, segment)}
          >
            {segment.overlapCount}
          </button>
        ) : null}
        {highlight}
      </span>
    );
  });

  return <div className="whitespace-pre-wrap leading-relaxed text-sm text-gray-800 select-text">{elements}</div>;
}

type AnnotationSidebarProps = {
  replyId: Annotation['replyId'];
  annotations: Annotation[];
  activeAnnotationId: string | null;
  setActiveAnnotationId: (id: string | null) => void;
  handleDelete: (id: string) => void;
  handleUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  handleToggleHidden: (id: string) => void;
  filter: AnnotationFilter;
  setFilter: (value: AnnotationFilter) => void;
};

function AnnotationSidebar({
  replyId,
  annotations,
  activeAnnotationId,
  setActiveAnnotationId,
  handleDelete,
  handleUpdateAnnotation,
  handleToggleHidden,
  filter,
  setFilter,
}: AnnotationSidebarProps) {
  const [expandedAnnotationIds, setExpandedAnnotationIds] = useState<string[]>([]);

  const currentReplyAnnotations = annotations.filter((annotation) => annotation.replyId === replyId);
  const filteredList = currentReplyAnnotations.filter((annotation) => (filter === 'all' ? true : annotation.type === filter));
  const allFilteredExpanded = filteredList.length > 0 && filteredList.every((annotation) => expandedAnnotationIds.includes(annotation.id));

  useEffect(() => {
    if (!activeAnnotationId) return;
    if (!annotations.some((annotation) => annotation.replyId === replyId && annotation.id === activeAnnotationId)) return;

    setExpandedAnnotationIds((ids) => (ids.includes(activeAnnotationId) ? ids : [...ids, activeAnnotationId]));
  }, [activeAnnotationId, annotations, replyId]);

  const toggleAnnotationExpanded = (annotationId: string, shouldSelect = true) => {
    const isExpanded = expandedAnnotationIds.includes(annotationId);
    setExpandedAnnotationIds((ids) => (isExpanded ? ids.filter((id) => id !== annotationId) : [...ids, annotationId]));
    if (shouldSelect) {
      setActiveAnnotationId(annotationId);
    }
  };

  const toggleAllExpanded = () => {
    if (allFilteredExpanded) {
      const filteredIds = new Set(filteredList.map((annotation) => annotation.id));
      setExpandedAnnotationIds((ids) => ids.filter((id) => !filteredIds.has(id)));
      return;
    }

    setExpandedAnnotationIds((ids) => Array.from(new Set([...ids, ...filteredList.map((annotation) => annotation.id)])));
  };

  const handleDeleteInList = (annotationId: string) => {
    setExpandedAnnotationIds((ids) => ids.filter((id) => id !== annotationId));
    handleDelete(annotationId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-50">
      <div className="shrink-0 p-4 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">全部问题 ({filteredList.length})</h3>
          <div className="flex items-center gap-2">
            <button className="text-xs text-blue-600 hover:text-blue-700" onClick={toggleAllExpanded}>
              {allFilteredExpanded ? '全部收起' : '一键展开'}
            </button>
            <select className="rounded border border-gray-300 bg-white p-1 text-xs" value={filter} onChange={(event) => setFilter(event.target.value as AnnotationFilter)}>
              <option value="all">全部</option>
              <option value="事实性错误">事实性错误</option>
              <option value="推理错误">推理错误</option>
              <option value="情感表达错误">情感表达错误</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
        <div className="space-y-3">
          {filteredList.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">暂无标注</div>
          ) : (
            filteredList.map((annotation, index) => {
              const isSelected = activeAnnotationId === annotation.id;
              const isExpanded = expandedAnnotationIds.includes(annotation.id);

              return (
                <div
                  key={annotation.id}
                  data-annotation-id={annotation.id}
                  className={`cursor-pointer rounded-lg border p-3 text-sm transition-shadow ${isSelected ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500' : isExpanded ? 'border-blue-200 bg-blue-50/20' : 'border-gray-200 bg-white hover:shadow-md'}`}
                  onClick={() => {
                    if (isExpanded) {
                      toggleAnnotationExpanded(annotation.id, false);
                      return;
                    }

                    setActiveAnnotationId(annotation.id);
                    toggleAnnotationExpanded(annotation.id, false);
                  }}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">#{index + 1}</span>
                        <select
                          className={`rounded-md border px-2 py-1 text-[11px] font-medium outline-none ${getColorClass(annotation.type)}`}
                          value={annotation.type}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleUpdateAnnotation(annotation.id, { type: event.target.value as ErrorType, subType: '' })}
                        >
                          <option value="事实性错误">事实性错误</option>
                          <option value="推理错误">推理错误</option>
                          <option value="情感表达错误">情感表达错误</option>
                        </select>
                      </div>
                      {annotation.hidden ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">高亮已隐藏</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleAnnotationExpanded(annotation.id, !isExpanded);
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        title={isExpanded ? '收起' : '展开'}
                      >
                        {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleHidden(annotation.id);
                        }}
                        className={`rounded p-1 ${annotation.hidden ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
                        title={annotation.hidden ? '显示高亮' : '隐藏高亮'}
                      >
                        {annotation.hidden ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); handleDeleteInList(annotation.id); }} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" title="删除"><Trash2 size={14}/></button>
                    </div>
                  </div>

                  <div className="rounded border border-gray-100 bg-gray-50 p-2 text-xs text-gray-600">
                    <div className="leading-relaxed">"{annotation.text}"</div>
                  </div>

                  {isExpanded ? (
                    <div className="mt-3 cursor-default space-y-3 border-t border-gray-200 pt-3" onClick={(event) => event.stopPropagation()}>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">二级类型</label>
                        <select
                          className="w-full rounded border border-gray-200 bg-white p-1.5 text-sm"
                          value={annotation.subType}
                          onChange={(event) => handleUpdateAnnotation(annotation.id, { subType: event.target.value })}
                        >
                          <option value="">无</option>
                          {SUB_TYPES[annotation.type]?.map((subType) => <option key={subType} value={subType}>{subType}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">原因</label>
                        <textarea
                          className="h-16 w-full resize-none rounded border border-gray-200 p-1.5 text-sm"
                          value={annotation.reason}
                          onChange={(event) => handleUpdateAnnotation(annotation.id, { reason: event.target.value })}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

type ReplyPanelProps = {
  replyId: Annotation['replyId'];
  text: string;
  title: string;
  wordCount: number;
  annotations: Annotation[];
  segments: TextSegment[];
  activeTab: 'overall' | 'annotate';
  setActiveTab: (value: 'overall' | 'annotate') => void;
  mode: 'normal' | 'annotate';
  draft: DraftAnnotation | null;
  setDraft: React.Dispatch<React.SetStateAction<DraftAnnotation | null>>;
  activeAnnotationId: string | null;
  setActiveAnnotationId: (id: string | null) => void;
  handleDelete: (id: string) => void;
  handleUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  handleToggleHidden: (id: string) => void;
  onSaveDraft: () => void;
  onFocusAnnotation: (event: React.MouseEvent<HTMLSpanElement>, annotation: Annotation) => void;
  onSegmentHover: (event: React.MouseEvent<HTMLElement>, segment: TextSegment) => void;
  onSegmentLeave: () => void;
  onOverlapLabelHover: (event: React.MouseEvent<HTMLButtonElement>, segment: TextSegment) => void;
  onOverlapLabelLeave: () => void;
  onOverlapLabelClick: (event: React.MouseEvent<HTMLButtonElement>, segment: TextSegment) => void;
  onTextMouseDown: (event: React.MouseEvent) => void;
  isShiftPressed: boolean;
};

function ReplyPanel({
  replyId,
  text,
  title,
  wordCount,
  annotations,
  segments,
  activeTab,
  setActiveTab,
  mode,
  draft,
  setDraft,
  activeAnnotationId,
  setActiveAnnotationId,
  handleDelete,
  handleUpdateAnnotation,
  handleToggleHidden,
  onSaveDraft,
  onFocusAnnotation,
  onSegmentHover,
  onSegmentLeave,
  onOverlapLabelHover,
  onOverlapLabelLeave,
  onOverlapLabelClick,
  onTextMouseDown,
  isShiftPressed,
}: ReplyPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [annotationFilter, setAnnotationFilter] = useState<AnnotationFilter>('all');
  const [shiftCursorHint, setShiftCursorHint] = useState<ShiftCursorHint>(null);

  const visibleAnnotations = annotations.filter((annotation) => !annotation.hidden && annotation.replyId === replyId);
  const annotationsById = Object.fromEntries(visibleAnnotations.map((annotation) => [annotation.id, annotation]));

  const handleMouseDown = (event: React.MouseEvent) => {
    const target = event.target;
    if (target instanceof Element && (target.closest('.annotation-popover') || target.closest('.overlap-popover'))) return;
    if (event.shiftKey) {
      setShiftCursorHint(null);
    }
    onTextMouseDown(event);
  };

  const handleMouseMove = () => {
    if (mode !== 'annotate' || !isShiftPressed) {
      if (shiftCursorHint !== null) setShiftCursorHint(null);
      return;
    }

    const selection = window.getSelection();
    const container = containerRef.current;
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !container) {
      if (shiftCursorHint !== null) setShiftCursorHint(null);
      return;
    }

    const { anchorNode, focusNode } = selection;
    if (!anchorNode || !focusNode || !container.contains(anchorNode) || !container.contains(focusNode)) {
      if (shiftCursorHint !== null) setShiftCursorHint(null);
      return;
    }

    const nextHint: ShiftCursorHint = isForwardSelection(selection) ? 'add' : 'remove';
    if (shiftCursorHint !== nextHint) {
      setShiftCursorHint(nextHint);
    }
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    setShiftCursorHint(null);
    if (mode !== 'annotate') return;

    const target = event.target;
    if (target instanceof Element && (
      target.closest('.annotation-popover')
      || target.closest('.overlap-pill')
      || target.closest('.overlap-popover')
    )) return;

    requestAnimationFrame(() => {
      const selection = window.getSelection();
      const container = containerRef.current;

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !container) return;

      const { anchorNode, focusNode } = selection;
      if (!anchorNode || !focusNode || !container.contains(anchorNode) || !container.contains(focusNode)) return;

      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      if (!selectedText.trim()) return;

      const startIndex = getOffsetFromContainer(container, range.startContainer, range.startOffset);
      const endIndex = getOffsetFromContainer(container, range.endContainer, range.endOffset);
      const normalizedStart = Math.min(startIndex, endIndex);
      const normalizedEnd = Math.max(startIndex, endIndex);
      const sourceText = getReplyText(replyId);

      if (event.shiftKey) {
        const currentReplyAnnotations = annotations.filter((annotation) => annotation.replyId === replyId);
        const activeAnnotation = currentReplyAnnotations.find((annotation) => annotation.id === activeAnnotationId);
        const targetAnnotation = activeAnnotation ?? null;

        if (!targetAnnotation) {
          selection.removeAllRanges();
          return;
        }

        if (isForwardSelection(selection)) {
          const updatedRanges = normalizeRanges(
            [
              ...targetAnnotation.ranges,
              createAnnotationRange(normalizedStart, normalizedEnd, sourceText),
            ],
            sourceText,
          );

          handleUpdateAnnotation(targetAnnotation.id, { ranges: updatedRanges });
          setActiveAnnotationId(targetAnnotation.id);
        } else {
          const updatedRanges = removeSelectionFromRanges(targetAnnotation.ranges, normalizedStart, normalizedEnd, sourceText);

          if (!updatedRanges.length) {
            handleDelete(targetAnnotation.id);
          } else {
            handleUpdateAnnotation(targetAnnotation.id, { ranges: updatedRanges });
            setActiveAnnotationId(targetAnnotation.id);
          }
        }

        setDraft(null);
        selection.removeAllRanges();
        return;
      }

      if (!isForwardSelection(selection)) {
        selection.removeAllRanges();
        return;
      }

      const rect = range.getBoundingClientRect();
      const position = clampFloatingPosition(rect.left, rect.bottom + 8);

      setDraft({
        replyId,
        startIndex: normalizedStart,
        endIndex: normalizedEnd,
        text: sourceText.slice(normalizedStart, normalizedEnd),
        top: position.top,
        left: position.left,
        type: '事实性错误',
        subType: '',
        reason: '',
      });
    });
  };

  const textCursor = getTextCanvasCursor(mode, isShiftPressed, shiftCursorHint);

  return (
    <div className="flex min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="relative flex min-w-0 flex-1 flex-col border-r border-gray-200">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-sm font-medium text-blue-700">{title}</span>
            <span className="text-xs text-gray-500">{wordCount}字</span>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative flex-1 overflow-y-auto p-6"
          style={{ cursor: textCursor }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <HighlightedText
            text={text}
            segments={segments}
            annotationsById={annotationsById}
            activeAnnotationId={activeAnnotationId}
            onAnnotationClick={onFocusAnnotation}
            onSegmentHover={onSegmentHover}
            onSegmentLeave={onSegmentLeave}
            onOverlapLabelHover={onOverlapLabelHover}
            onOverlapLabelLeave={onOverlapLabelLeave}
            onOverlapLabelClick={onOverlapLabelClick}
            textCursor={textCursor}
          />

          {draft && draft.replyId === replyId ? (
            <DraftPopover
              draft={draft}
              setDraft={setDraft}
              onSave={onSaveDraft}
              onCancel={() => {
                setDraft(null);
                window.getSelection()?.removeAllRanges();
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="flex w-[360px] min-h-0 shrink-0 flex-col overflow-hidden bg-gray-50">
        <div className="flex shrink-0 border-b border-gray-200">
          <button
            className={`flex-1 border-b-2 py-3 text-sm font-medium ${activeTab === 'overall' ? 'border-blue-600 bg-white text-blue-600' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('overall')}
          >
            标注表单
          </button>
          <button
            className={`flex-1 border-b-2 py-3 text-sm font-medium ${activeTab === 'annotate' ? 'border-blue-600 bg-white text-blue-600' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('annotate')}
          >
            文本标注列表 ({annotations.filter((annotation) => annotation.replyId === replyId).length})
          </button>
        </div>

        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {activeTab === 'overall' ? (
            <div className="overflow-y-auto p-4">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700"><span className="text-red-500">*</span> 排序原因</label>
                <textarea className="h-32 w-full resize-none rounded-md border border-gray-300 p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" placeholder="请输入排序原因..."></textarea>
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">对{title}的整体评价</label>
                <textarea className="h-24 w-full resize-none rounded-md border border-gray-300 p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" placeholder="请输入评价..."></textarea>
              </div>
            </div>
          ) : (
            <AnnotationSidebar
              replyId={replyId}
              annotations={annotations}
              activeAnnotationId={activeAnnotationId}
              setActiveAnnotationId={setActiveAnnotationId}
              handleDelete={handleDelete}
              handleUpdateAnnotation={handleUpdateAnnotation}
              handleToggleHidden={handleToggleHidden}
              filter={annotationFilter}
              setFilter={setAnnotationFilter}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<'normal' | 'annotate'>('annotate');
  const [annotations, setAnnotations] = useState<Annotation[]>(() => INITIAL_ANNOTATIONS.map(normalizeAnnotation));
  const [activeTab1, setActiveTab1] = useState<'overall' | 'annotate'>('overall');
  const [activeTab2, setActiveTab2] = useState<'overall' | 'annotate'>('overall');
  const [draft, setDraft] = useState<DraftAnnotation | null>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [annotationDisplayOrder, setAnnotationDisplayOrder] = useState<string[]>(() => INITIAL_ANNOTATIONS.map((annotation) => annotation.id));
  const [overlapPopover, setOverlapPopover] = useState<OverlapPopoverState | null>(null);
  const [editorPopover, setEditorPopover] = useState<EditorPopoverState | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const dragPopoverStateRef = useRef<DragPopoverState | null>(null);
  const suspendedPopoversRef = useRef<SuspendedPopoversState | null>(null);
  const shiftPopoverSuspendedRef = useRef(false);

  const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable;
  };

  const reply1Annotations = annotations.filter((annotation) => annotation.replyId === 'reply1');
  const reply2Annotations = annotations.filter((annotation) => annotation.replyId === 'reply2');
  const visibleReply1Annotations = reply1Annotations.filter((annotation) => !annotation.hidden);
  const visibleReply2Annotations = reply2Annotations.filter((annotation) => !annotation.hidden);
  const reply1Segments = buildTextSegments(REPLY_1, 'reply1', visibleReply1Annotations, annotationDisplayOrder);
  const reply2Segments = buildTextSegments(REPLY_2, 'reply2', visibleReply2Annotations, annotationDisplayOrder);
  const allSegments = [...reply1Segments, ...reply2Segments];
  const segmentByKey = Object.fromEntries(allSegments.map((segment) => [segment.key, segment]));
  const annotationById = Object.fromEntries(annotations.map((annotation) => [annotation.id, annotation]));
  const displayIndexMap = getDisplayIndexMap(annotations);
  const overlapSegment = overlapPopover ? segmentByKey[overlapPopover.segmentKey] : null;
  const editorAnnotation = editorPopover ? annotationById[editorPopover.annotationId] ?? null : null;

  useEffect(() => {
    setAnnotationDisplayOrder((currentOrder) => {
      const existingIds = new Set(annotations.map((annotation) => annotation.id));
      const preservedOrder = currentOrder.filter((annotationId) => existingIds.has(annotationId));
      const newIds = annotations
        .map((annotation) => annotation.id)
        .filter((annotationId) => !preservedOrder.includes(annotationId));
      return [...newIds.reverse(), ...preservedOrder];
    });
  }, [annotations]);

  useEffect(() => {
    if (mode !== 'normal') return;

    setDraft(null);
    setOverlapPopover(null);
    setEditorPopover(null);
    setActiveAnnotationId(null);
    suspendedPopoversRef.current = null;
    shiftPopoverSuspendedRef.current = false;
    dragPopoverStateRef.current = null;
    window.getSelection()?.removeAllRanges();
  }, [mode]);

  const focusAnnotation = (annotation: Annotation) => {
    setActiveAnnotationId(annotation.id);
    if (annotation.replyId === 'reply1') {
      setActiveTab1('annotate');
    } else {
      setActiveTab2('annotate');
    }
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragPopoverStateRef.current;
      if (!dragState) return;

      const nextPosition = clampFloatingPosition(
        event.clientX - dragState.offsetX,
        event.clientY - dragState.offsetY,
        dragState.width,
        dragState.height,
      );

      if (dragState.kind === 'overlap') {
        setOverlapPopover((currentPopover) => (
          currentPopover ? { ...currentPopover, ...nextPosition } : currentPopover
        ));
        return;
      }

      setEditorPopover((currentPopover) => (
        currentPopover ? { ...currentPopover, ...nextPosition } : currentPopover
      ));
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (dragPopoverStateRef.current?.pointerId !== event.pointerId) return;
      dragPopoverStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSpaceToggleEvent(event) && !event.repeat && !isEditableTarget(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        if (document.activeElement instanceof HTMLButtonElement) {
          document.activeElement.blur();
        }
        setMode((currentMode) => (currentMode === 'annotate' ? 'normal' : 'annotate'));
        return;
      }

      if (event.key === 'Shift' && !shiftPopoverSuspendedRef.current) {
        setIsShiftPressed(true);
        const hasOpenPopover = Boolean(draft || overlapPopover || editorPopover);
        if (hasOpenPopover) {
          suspendedPopoversRef.current = { draft, overlapPopover, editorPopover };
          shiftPopoverSuspendedRef.current = true;
          setDraft(null);
          setOverlapPopover(null);
          setEditorPopover(null);
        }
      }

      if (event.key === 'Escape') {
        setDraft(null);
        setOverlapPopover(null);
        setEditorPopover(null);
        dragPopoverStateRef.current = null;
        suspendedPopoversRef.current = null;
        shiftPopoverSuspendedRef.current = false;
        window.getSelection()?.removeAllRanges();
        return;
      }

      if (event.key === 'Delete' && activeAnnotationId && !isEditableTarget(event.target)) {
        event.preventDefault();
        handleDelete(activeAnnotationId);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isSpaceToggleEvent(event) && !isEditableTarget(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }

      setIsShiftPressed(false);
      if (event.key !== 'Shift' || !shiftPopoverSuspendedRef.current) return;
      const suspendedPopovers = suspendedPopoversRef.current;
      shiftPopoverSuspendedRef.current = false;
      suspendedPopoversRef.current = null;
      if (!suspendedPopovers) return;

      setDraft(suspendedPopovers.draft);
      setOverlapPopover(suspendedPopovers.overlapPopover);
      setEditorPopover(suspendedPopovers.editorPopover);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeAnnotationId, draft, overlapPopover, editorPopover]);

  useEffect(() => {
    if (!draft) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.annotation-popover')) return;
      setDraft(null);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown, true);
  }, [draft]);

  useEffect(() => {
    if (!overlapPopover) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.overlap-popover') || target.closest('.overlap-pill')) return;
      setOverlapPopover(null);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown, true);
  }, [overlapPopover]);

  useEffect(() => {
    if (!editorPopover) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.annotation-editor-popover')) return;
      setEditorPopover(null);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown, true);
  }, [editorPopover]);

  useEffect(() => {
    if (!activeAnnotationId) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (event.shiftKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(`[data-annotation-id="${activeAnnotationId}"]`) || target.closest(`[data-highlight-ids~="${activeAnnotationId}"]`)) return;

      setActiveAnnotationId(null);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown, true);
  }, [activeAnnotationId]);

  useEffect(() => {
    if (!overlapPopover) return;
    if (overlapSegment?.isOverlap) return;
    setOverlapPopover(null);
  }, [overlapPopover, overlapSegment]);

  useEffect(() => {
    if (!editorPopover) return;
    if (editorAnnotation) return;
    setEditorPopover(null);
  }, [editorPopover, editorAnnotation]);

  const handleSaveDraft = () => {
    if (!draft) return;

    const newAnnotation = normalizeAnnotation({
      id: `a${Date.now()}`,
      replyId: draft.replyId,
      startIndex: draft.startIndex,
      endIndex: draft.endIndex,
      text: draft.text,
      ranges: [createAnnotationRange(draft.startIndex, draft.endIndex, getReplyText(draft.replyId))],
      type: draft.type,
      subType: draft.subType,
      reason: draft.reason,
      severity: '中',
    });

    setAnnotations((currentAnnotations) => [...currentAnnotations, newAnnotation]);
    setDraft(null);
    window.getSelection()?.removeAllRanges();

    if (draft.replyId === 'reply1') {
      setActiveTab1('annotate');
    } else {
      setActiveTab2('annotate');
    }

    setActiveAnnotationId(newAnnotation.id);
  };

  const handleDelete = (id: string) => {
    setAnnotations((currentAnnotations) => currentAnnotations.filter((annotation) => annotation.id !== id));
    setActiveAnnotationId((currentActive) => (currentActive === id ? null : currentActive));
    setEditorPopover((currentPopover) => (currentPopover?.annotationId === id ? null : currentPopover));
  };

  const handleUpdateAnnotation = (id: string, updates: Partial<Annotation>) => {
    setAnnotations((currentAnnotations) => currentAnnotations.map((annotation) => (
      annotation.id === id ? normalizeAnnotation({ ...annotation, ...updates }) : annotation
    )));
    setActiveAnnotationId(id);
  };

  const handleToggleHidden = (id: string) => {
    setAnnotations((currentAnnotations) => currentAnnotations.map((annotation) => (
      annotation.id === id ? normalizeAnnotation({ ...annotation, hidden: !annotation.hidden }) : annotation
    )));
    setActiveAnnotationId(id);
  };

  const handleOverlapLabelClick = (event: React.MouseEvent<HTMLButtonElement>, segment: TextSegment) => {
    event.stopPropagation();
    if (overlapPopover?.segmentKey === segment.key) {
      setOverlapPopover(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setOverlapPopover({
      segmentKey: segment.key,
      ...clampFloatingPosition(rect.left - 20, rect.bottom + 8, 360, 420),
    });
  };

  const startDraggingPopover = (
    kind: DragPopoverState['kind'],
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;

    const popoverElement = event.currentTarget.parentElement;
    if (!(popoverElement instanceof HTMLElement)) return;

    const rect = popoverElement.getBoundingClientRect();
    dragPopoverStateRef.current = {
      kind,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleHighlightClick = (event: React.MouseEvent<HTMLSpanElement>, annotation: Annotation) => {
    setActiveAnnotationId(annotation.id);
    if (annotation.replyId === 'reply1') {
      setActiveTab1('annotate');
    } else {
      setActiveTab2('annotate');
    }

    setOverlapPopover(null);
    setEditorPopover({
      annotationId: annotation.id,
      ...getFloatingPosition(event.clientX, event.clientY, 340, 360),
    });
  };

  const handleSetSegmentPrimary = (currentPrimaryId: string | null, annotationId: string) => {
    setAnnotationDisplayOrder((currentOrder) => {
      if (currentPrimaryId === annotationId) return currentOrder;

      const nextOrder = currentOrder.filter((currentId) => currentId !== annotationId);
      if (!currentPrimaryId) {
        return [annotationId, ...nextOrder];
      }

      const targetIndex = nextOrder.indexOf(currentPrimaryId);
      if (targetIndex === -1) {
        return [annotationId, ...nextOrder];
      }

      nextOrder.splice(targetIndex, 0, annotationId);
      return nextOrder;
    });
    const annotation = annotationById[annotationId];
    if (annotation) {
      focusAnnotation(annotation);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 font-sans">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-800">全职体感测_rl_2603</h1>
          <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">第3题/4 标注7 跳过0</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="rounded-full border border-blue-100 bg-blue-50 px-4 py-1 font-mono text-lg font-bold text-blue-700">00:02:19</div>
          <div className="flex items-center gap-4 border-l border-gray-200 pl-4">
            <button onClick={() => setShowShortcuts(true)} className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-800"><AlertCircle size={16}/> 快捷键</button>
            <div className="flex items-center gap-1 text-sm font-medium text-emerald-600"><Check size={16}/> 已自动保存</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"><ChevronLeft size={16}/> 上一题</button>
          <button className="flex items-center gap-1 rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50">下一题 <ChevronRight size={16}/></button>
        </div>
      </header>

      <div className="shrink-0 p-4">
        <div className="rounded-lg border border-sky-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-sky-800">
            <span className="rounded border border-sky-200 bg-sky-100 px-2 py-0.5 text-xs">指示</span>
            22字
          </div>
          <p className="text-gray-800">{PROMPT}</p>
        </div>
      </div>

      <div className="flex flex-1 gap-4 px-4 pb-4 min-h-0">
        <ReplyPanel
          replyId="reply1"
          text={REPLY_1}
          title="回复1"
          wordCount={1050}
          annotations={annotations}
          segments={reply1Segments}
          activeTab={activeTab1}
          setActiveTab={setActiveTab1}
          mode={mode}
          draft={draft}
          setDraft={setDraft}
          activeAnnotationId={activeAnnotationId}
          setActiveAnnotationId={(id) => {
            setActiveAnnotationId(id);
            if (id) setActiveTab1('annotate');
          }}
          handleDelete={handleDelete}
          handleUpdateAnnotation={handleUpdateAnnotation}
          handleToggleHidden={handleToggleHidden}
          onSaveDraft={handleSaveDraft}
          onFocusAnnotation={handleHighlightClick}
          onSegmentHover={() => {}}
          onSegmentLeave={() => {}}
          onOverlapLabelHover={() => {}}
          onOverlapLabelLeave={() => {}}
          onOverlapLabelClick={handleOverlapLabelClick}
          onTextMouseDown={(event) => {
            if (event.shiftKey) {
              collapseSelectionToPoint(event.clientX, event.clientY);
              return;
            }
          }}
          isShiftPressed={isShiftPressed}
        />

        <ReplyPanel
          replyId="reply2"
          text={REPLY_2}
          title="回复2"
          wordCount={987}
          annotations={annotations}
          segments={reply2Segments}
          activeTab={activeTab2}
          setActiveTab={setActiveTab2}
          mode={mode}
          draft={draft}
          setDraft={setDraft}
          activeAnnotationId={activeAnnotationId}
          setActiveAnnotationId={(id) => {
            setActiveAnnotationId(id);
            if (id) setActiveTab2('annotate');
          }}
          handleDelete={handleDelete}
          handleUpdateAnnotation={handleUpdateAnnotation}
          handleToggleHidden={handleToggleHidden}
          onSaveDraft={handleSaveDraft}
          onFocusAnnotation={handleHighlightClick}
          onSegmentHover={() => {}}
          onSegmentLeave={() => {}}
          onOverlapLabelHover={() => {}}
          onOverlapLabelLeave={() => {}}
          onOverlapLabelClick={handleOverlapLabelClick}
          onTextMouseDown={(event) => {
            if (event.shiftKey) {
              collapseSelectionToPoint(event.clientX, event.clientY);
              return;
            }
          }}
          isShiftPressed={isShiftPressed}
        />
      </div>

      {overlapPopover && overlapSegment ? (
        <OverlapPopover
          segment={overlapSegment}
          annotations={overlapSegment.annotationIds.map((id) => annotationById[id]).filter(Boolean)}
          displayIndexMap={displayIndexMap}
          position={{ left: overlapPopover.left, top: overlapPopover.top }}
          onClose={() => setOverlapPopover(null)}
          onSetPrimary={handleSetSegmentPrimary}
          onUpdateAnnotation={handleUpdateAnnotation}
          onDelete={(annotationId) => {
            handleDelete(annotationId);
            setOverlapPopover(null);
          }}
          onDragStart={(event) => startDraggingPopover('overlap', event)}
        />
      ) : null}

      {editorPopover && editorAnnotation ? (
        <AnnotationEditorPopover
          annotation={editorAnnotation}
          displayIndex={displayIndexMap[editorAnnotation.id]}
          position={{ left: editorPopover.left, top: editorPopover.top }}
          onClose={() => setEditorPopover(null)}
          onDelete={(annotationId) => handleDelete(annotationId)}
          onUpdateAnnotation={handleUpdateAnnotation}
          onDragStart={(event) => startDraggingPopover('editor', event)}
        />
      ) : null}

      {showShortcuts ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowShortcuts(false)}>
          <div className="w-[460px] rounded-xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">快捷键提示</h2>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="space-y-5 text-sm">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">模式切换</div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">普通模式 / 批注模式切换</span>
                  <kbd className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-gray-600">Space</kbd>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">标注编辑</div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">先选中标注后追加范围</span>
                  <kbd className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-gray-600">Shift + 正向画选</kbd>
                </div>
                <div className="mt-3 flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">先选中标注后移除范围</span>
                  <kbd className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-gray-600">Shift + 反向画选</kbd>
                </div>
                <div className="mt-3 flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">删除当前选中标注</span>
                  <kbd className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-gray-600">Delete</kbd>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">浮窗操作</div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">关闭草稿 / 编辑窗 / 重叠窗</span>
                  <kbd className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-gray-600">Esc</kbd>
                </div>
                <div className="mt-3 flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">按住 Shift 时临时隐藏浮窗</span>
                  <kbd className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-gray-600">按下 / 松开 Shift</kbd>
                </div>
                <div className="mt-3 flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">拖动浮窗位置</span>
                  <kbd className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-gray-600">拖动浮窗顶部</kbd>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">使用说明</div>
                <div className="space-y-2 text-xs leading-relaxed text-gray-600">
                  <div>批注模式下直接拖选文本可新建标注；新建标注保存后会默认成为主显示。</div>
                  <div>点击正文高亮可打开该标注的编辑悬浮窗；点击重叠数字可展开当前片段的全部重叠标注。</div>
                  <div>“设为主显示”调整的是标注在当前显示层级中的顺序，不会把被中间片段截断的前后部分拆开单独设置。</div>
                  <div>普通模式下会关闭所有草稿、编辑窗、重叠窗，并取消当前选中高亮。</div>
                </div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <button onClick={() => setShowShortcuts(false)} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">我知道了</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
