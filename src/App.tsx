import React, { useState, useRef, useEffect } from 'react';
import { Settings, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, SkipForward, History, Maximize2, X, Check, Search, Filter, AlertCircle, Trash2, Crosshair } from 'lucide-react';
import { Annotation, AnnotationRange, DraftAnnotation, ErrorType } from './types';
import { PROMPT, REPLY_1, REPLY_2, INITIAL_ANNOTATIONS, SUB_TYPES } from './constants';
import { getColorClass, getHighlightClass } from './utils';

const HOVER_CARD_WIDTH = 320;
const HOVER_CARD_OFFSET = 16;
const HOVER_CARD_MARGIN = 12;
const ANNOTATION_TEXT_JOINER = ' … ';

function getHoverCardPosition(clientX: number, clientY: number) {
  const maxLeft = Math.max(HOVER_CARD_MARGIN, window.innerWidth - HOVER_CARD_WIDTH - HOVER_CARD_MARGIN);
  const maxTop = Math.max(HOVER_CARD_MARGIN, window.innerHeight - 320);

  return {
    left: Math.min(clientX + HOVER_CARD_OFFSET, maxLeft),
    top: Math.min(clientY + HOVER_CARD_OFFSET, maxTop),
  };
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

function getOffsetFromContainer(container: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(node, offset);
  return range.toString().length;
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
    .filter(range => range.endIndex > range.startIndex)
    .sort((a, b) => a.startIndex - b.startIndex);

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
  return ranges.map(range => range.text).join(ANNOTATION_TEXT_JOINER);
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
  return annotation.ranges.some(range => startIndex < range.endIndex && endIndex > range.startIndex);
}

function getAnnotationDisplayIndex(annotation: Annotation, annotations: Annotation[]) {
  return annotations.filter((item) => item.replyId === annotation.replyId).findIndex((item) => item.id === annotation.id) + 1;
}

const HighlightedText = ({ text, annotations, replyId, activeAnnotationId, onHighlightClick, onHighlightHover }: any) => {
  const sortedSegments = annotations
    .filter((annotation: Annotation) => annotation.replyId === replyId)
    .flatMap((annotation: Annotation) => annotation.ranges.map((range, index) => ({ annotation, range, index })))
    .sort((a, b) => a.range.startIndex - b.range.startIndex);
  
  const elements = [];
  let currentIndex = 0;

  sortedSegments.forEach(({ annotation, range, index }, sortedIndex) => {
    const isActive = activeAnnotationId === annotation.id;
    const segmentStartIndex = Math.max(currentIndex, range.startIndex);
    const segmentEndIndex = range.endIndex;

    if (segmentEndIndex <= segmentStartIndex) return;

    if (segmentStartIndex > currentIndex) {
      elements.push(<span key={`text-${currentIndex}`}>{text.slice(currentIndex, segmentStartIndex)}</span>);
    }
    elements.push(
      <mark
        key={`ann-${annotation.id}-${index}`}
        id={`highlight-${annotation.id}-${index}`}
        data-annotation-id={annotation.id}
        className={`cursor-pointer select-text transition-colors duration-200 ${getHighlightClass(annotation.type, isActive)}`}
        onClick={() => {
          if (window.getSelection()?.toString()) return;
          onHighlightClick(annotation);
        }}
        onMouseEnter={(e) => {
          if (e.buttons !== 0 || window.getSelection()?.toString()) return;
          onHighlightHover(e, annotation);
        }}
        onMouseLeave={() => onHighlightHover(null, null)}
      >
        {text.slice(segmentStartIndex, segmentEndIndex)}
      </mark>
    );

    currentIndex = segmentEndIndex;
  });

  if (currentIndex < text.length) {
    elements.push(<span key={`text-${currentIndex}`}>{text.slice(currentIndex)}</span>);
  }

  return <div className="whitespace-pre-wrap leading-relaxed text-gray-800 text-sm select-text">{elements}</div>;
};

const DraftPopover = ({ draft, setDraft, onSave, onCancel }: any) => {
  return (
    <div 
      className="annotation-popover absolute z-50 bg-white shadow-2xl border border-gray-200 rounded-xl p-4 w-80 animate-in fade-in zoom-in duration-200"
      style={{ top: draft.top, left: draft.left }}
      onMouseUp={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="font-medium text-sm text-gray-800">添加标注</div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
      </div>
      
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">label name</label>
        <select
          className="w-full text-sm border border-gray-200 rounded-md p-1.5 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
          value={draft.type}
          onChange={e => setDraft({ ...draft, type: e.target.value as ErrorType, subType: '' })}
        >
          <option value="事实性错误">事实性错误</option>
          <option value="推理错误">推理错误</option>
          <option value="情感表达错误">情感表达错误</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">二级类型</label>
        <select 
          className="w-full text-sm border border-gray-200 rounded-md p-1.5 bg-white focus:ring-1 focus:ring-blue-500 outline-none" 
          value={draft.subType} 
          onChange={e => setDraft({...draft, subType: e.target.value})}
        >
          <option value="">无</option>
          {SUB_TYPES[draft.type]?.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
      </div>
      
      <textarea 
        className="w-full text-sm border border-gray-200 rounded-md p-2 mb-4 h-16 resize-none focus:ring-1 focus:ring-blue-500 outline-none" 
        placeholder="简短说明原因..."
        value={draft.reason}
        onChange={e => setDraft({...draft, reason: e.target.value})}
      />
      
      <div className="flex justify-end gap-2">
        <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors" onClick={onCancel}>取消</button>
        <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors" onClick={onSave}>保存</button>
      </div>
    </div>
  );
};

const HoverEditorPopover = ({ annotation, displayIndex, position, onMouseEnter, onMouseLeave, onDelete, handleUpdateAnnotation }: any) => {
  return (
    <div
      data-annotation-id={annotation.id}
      className="fixed z-50 w-80 rounded-xl border border-slate-700 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur-sm"
      style={position}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-slate-400 shrink-0">#{displayIndex}</span>
          <select
            className={`text-[11px] px-2 py-1 rounded-md border font-medium outline-none cursor-pointer ${getColorClass(annotation.type)}`}
            value={annotation.type}
            onChange={e => handleUpdateAnnotation(annotation.id, { type: e.target.value as ErrorType, subType: '' })}
          >
            <option value="事实性错误">事实性错误</option>
            <option value="推理错误">推理错误</option>
            <option value="情感表达错误">情感表达错误</option>
          </select>
        </div>
        <button
          className="p-1 text-slate-400 hover:text-red-300 hover:bg-white/5 rounded transition-colors"
          onClick={() => onDelete(annotation.id)}
          title="删除"
        >
          <Trash2 size={14}/>
        </button>
      </div>

      <div className="text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 mb-3 leading-relaxed line-clamp-3">
        "{annotation.text}"
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">二级类型</label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
            value={annotation.subType}
            onChange={e => handleUpdateAnnotation(annotation.id, { subType: e.target.value })}
          >
            <option value="">无</option>
            {SUB_TYPES[annotation.type]?.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 mb-1">原因</label>
          <textarea
            className="w-full h-24 resize-none rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white outline-none focus:border-blue-500"
            value={annotation.reason}
            onChange={e => handleUpdateAnnotation(annotation.id, { reason: e.target.value })}
            placeholder="简短说明原因..."
          />
        </div>
      </div>
    </div>
  );
};

const AnnotationSidebar = ({ replyId, annotations, activeAnnotationId, setActiveAnnotationId, handleLocate, handleDelete, handleUpdateAnnotation }: any) => {
  const [filter, setFilter] = useState('all');
  const [expandedAnnotationIds, setExpandedAnnotationIds] = useState<string[]>([]);

  const currentReplyAnnotations = annotations.filter((a: Annotation) => a.replyId === replyId);

  const filteredList = currentReplyAnnotations.filter((a: Annotation) => {
    if (filter === 'all') return true;
    return a.type === filter;
  });

  const allFilteredExpanded = filteredList.length > 0 && filteredList.every((ann: Annotation) => expandedAnnotationIds.includes(ann.id));

  const toggleAnnotationExpanded = (annotationId: string) => {
    const isExpanded = expandedAnnotationIds.includes(annotationId);
    setExpandedAnnotationIds((ids) => isExpanded ? ids.filter((id) => id !== annotationId) : [...ids, annotationId]);
    setActiveAnnotationId(annotationId);
  };

  const selectAnnotation = (annotationId: string) => {
    setActiveAnnotationId(annotationId);
  };

  const collapseAnnotation = (annotationId: string) => {
    setExpandedAnnotationIds((ids) => ids.filter((id) => id !== annotationId));
    setActiveAnnotationId(annotationId);
  };

  const toggleAllExpanded = () => {
    if (allFilteredExpanded) {
      const filteredIds = new Set(filteredList.map((ann: Annotation) => ann.id));
      setExpandedAnnotationIds((ids) => ids.filter((id) => !filteredIds.has(id)));
      return;
    }

    setExpandedAnnotationIds((ids) => Array.from(new Set([...ids, ...filteredList.map((ann: Annotation) => ann.id)])));
  };

  const handleDeleteInList = (annotationId: string) => {
    setExpandedAnnotationIds((ids) => ids.filter((id) => id !== annotationId));
    handleDelete(annotationId);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 overflow-hidden">
      <div className="shrink-0 p-4 pb-3">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-sm text-gray-700">全部问题 ({filteredList.length})</h3>
          <div className="flex items-center gap-2">
            <button
              className="text-xs text-blue-600 hover:text-blue-700"
              onClick={toggleAllExpanded}
            >
              {allFilteredExpanded ? '全部收起' : '一键展开'}
            </button>
            <select className="text-xs border border-gray-300 rounded p-1 bg-white" value={filter} onChange={e => setFilter(e.target.value)}>
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
            <div className="text-center text-gray-400 text-sm py-8">暂无标注</div>
          ) : (
            filteredList.map((ann: Annotation, idx: number) => {
              const isSelected = activeAnnotationId === ann.id;
              const isExpanded = expandedAnnotationIds.includes(ann.id);

              return (
                <div 
                  key={ann.id} 
                  data-annotation-id={ann.id}
                  className={`border rounded-lg p-3 text-sm transition-shadow cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/30' : isExpanded ? 'border-blue-200 bg-blue-50/20' : 'border-gray-200 bg-white hover:shadow-md'}`}
                  onClick={() => {
                    if (isExpanded) {
                      selectAnnotation(ann.id);
                      return;
                    }
                    toggleAnnotationExpanded(ann.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>
                      <select
                        className={`text-[11px] px-2 py-1 rounded-md border font-medium outline-none cursor-pointer ${getColorClass(ann.type)}`}
                        value={ann.type}
                        onClick={(e) => e.stopPropagation()}
                        onChange={e => handleUpdateAnnotation(ann.id, { type: e.target.value as ErrorType, subType: '' })}
                      >
                        <option value="事实性错误">事实性错误</option>
                        <option value="推理错误">推理错误</option>
                        <option value="情感表达错误">情感表达错误</option>
                      </select>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isExpanded) {
                            collapseAnnotation(ann.id);
                            return;
                          }
                          toggleAnnotationExpanded(ann.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title={isExpanded ? '收起' : '展开'}
                      >
                        {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleLocate(ann); }} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="定位"><Crosshair size={14}/></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteInList(ann.id); }} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除"><Trash2 size={14}/></button>
                    </div>
                  </div>

                  <div className={`text-xs text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100 ${isExpanded ? 'mb-3' : ''}`}>"{ann.text}"</div>

                  {isExpanded ? (
                    <div className="space-y-3 border-t border-gray-200 pt-3 mt-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">二级类型</label>
                        <select 
                          className="w-full text-sm border border-gray-200 rounded p-1.5 bg-white"
                          value={ann.subType}
                          onChange={e => handleUpdateAnnotation(ann.id, { subType: e.target.value })}
                        >
                          <option value="">无</option>
                          {SUB_TYPES[ann.type]?.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">原因</label>
                        <textarea 
                          className="w-full text-sm border border-gray-200 rounded p-1.5 h-16 resize-none"
                          value={ann.reason}
                          onChange={e => handleUpdateAnnotation(ann.id, { reason: e.target.value })}
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
};

const ReplyPanel = ({ replyId, text, title, wordCount, annotations, activeTab, setActiveTab, mode, draft, setDraft, activeAnnotationId, setActiveAnnotationId, handleLocate, handleDelete, handleUpdateAnnotation, onSaveDraft, onHighlightHover, onTextMouseDown }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target;
    if (target instanceof Element && target.closest('.annotation-popover')) return;
    onTextMouseDown();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mode !== 'annotate') return;
    const target = e.target;
    if (target instanceof Element && target.closest('.annotation-popover')) return;

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
      const endIndex = startIndex + selectedText.length;
      const sourceText = getReplyText(replyId);

      if (e.shiftKey) {
        const currentReplyAnnotations = annotations.filter((ann: Annotation) => ann.replyId === replyId);
        const activeAnnotation = currentReplyAnnotations.find((ann: Annotation) => ann.id === activeAnnotationId);
        const overlappingAnnotations = currentReplyAnnotations.filter((ann: Annotation) => annotationOverlapsSelection(ann, startIndex, endIndex));
        const targetAnnotation = activeAnnotation ?? (overlappingAnnotations.length === 1 ? overlappingAnnotations[0] : null);

        if (!targetAnnotation) {
          selection.removeAllRanges();
          return;
        }

        if (isForwardSelection(selection)) {
          const updatedRanges = normalizeRanges(
            [
              ...targetAnnotation.ranges,
              createAnnotationRange(startIndex, endIndex, sourceText),
            ],
            sourceText,
          );

          handleUpdateAnnotation(targetAnnotation.id, {
            ranges: updatedRanges,
          });
          setActiveAnnotationId(targetAnnotation.id);
        } else {
          const updatedRanges = removeSelectionFromRanges(targetAnnotation.ranges, startIndex, endIndex, sourceText);

          if (!updatedRanges.length) {
            handleDelete(targetAnnotation.id);
          } else {
            handleUpdateAnnotation(targetAnnotation.id, {
              ranges: updatedRanges,
            });
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
      const containerRect = container.getBoundingClientRect();

      setDraft({
        replyId,
        startIndex,
        endIndex,
        text: selectedText,
        top: rect.bottom - containerRect.top + container.scrollTop + 8,
        left: rect.left - containerRect.left + container.scrollLeft,
        type: '事实性错误',
        subType: '',
        reason: '',
      });
    });
  };

  return (
    <div className="flex-1 flex bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden min-w-0">
      <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 relative">
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-sm">{title}</span>
            <span className="text-xs text-gray-500">{wordCount}字</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">渲染</span>
            <div className="w-8 h-4 bg-blue-500 rounded-full relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div></div>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto p-6 relative"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          <HighlightedText 
            text={text} 
            replyId={replyId}
            annotations={annotations} 
            activeAnnotationId={activeAnnotationId}
            onHighlightClick={(ann: Annotation) => {
              setActiveAnnotationId(ann.id);
              setActiveTab('annotate');
            }}
            onHighlightHover={onHighlightHover}
          />
          
          {draft && draft.replyId === replyId && (
            <DraftPopover 
              draft={draft} 
              setDraft={setDraft} 
              onSave={onSaveDraft} 
              onCancel={() => {
                setDraft(null);
                window.getSelection()?.removeAllRanges();
              }} 
            />
          )}
        </div>
      </div>

      <div className="w-[340px] flex flex-col shrink-0 min-h-0 bg-gray-50 overflow-hidden">
        <div className="flex border-b border-gray-200 shrink-0">
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'overall' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('overall')}
          >
            标注表单
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'annotate' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('annotate')}
          >
            文本标注列表 ({annotations.filter((a: Annotation) => a.replyId === replyId).length})
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeTab === 'overall' ? (
            <div className="p-4 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2"><span className="text-red-500">*</span> 排序原因</label>
                <textarea className="w-full border border-gray-300 rounded-md p-2 text-sm h-32 resize-none focus:ring-1 focus:ring-blue-500 outline-none" placeholder="请输入排序原因..."></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">对{title}的整体评价</label>
                <textarea className="w-full border border-gray-300 rounded-md p-2 text-sm h-24 resize-none focus:ring-1 focus:ring-blue-500 outline-none" placeholder="请输入评价..."></textarea>
              </div>
            </div>
          ) : (
            <AnnotationSidebar 
              replyId={replyId}
              annotations={annotations}
              activeAnnotationId={activeAnnotationId}
              setActiveAnnotationId={setActiveAnnotationId}
              handleLocate={handleLocate}
              handleDelete={handleDelete}
              handleUpdateAnnotation={handleUpdateAnnotation}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [mode, setMode] = useState<'normal' | 'annotate'>('annotate');
  const [annotations, setAnnotations] = useState<Annotation[]>(() => INITIAL_ANNOTATIONS.map(normalizeAnnotation));
  const [activeTab1, setActiveTab1] = useState<'overall' | 'annotate'>('overall');
  const [activeTab2, setActiveTab2] = useState<'overall' | 'annotate'>('overall');
  const [draft, setDraft] = useState<DraftAnnotation | null>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [hoveredAnn, setHoveredAnn] = useState<{ annotationId: string, clientX: number, clientY: number } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable;
  };

  const clearHoverCloseTimeout = () => {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
  };

  const scheduleHoverClose = () => {
    clearHoverCloseTimeout();
    hoverCloseTimeoutRef.current = setTimeout(() => {
      setHoveredAnn(null);
    }, 140);
  };

  const hideHoveredAnnotation = () => {
    clearHoverCloseTimeout();
    setHoveredAnn(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraft(null);
        window.getSelection()?.removeAllRanges();
        return;
      }

      if (e.key === 'Delete' && activeAnnotationId && !isEditableTarget(e.target)) {
        e.preventDefault();
        handleDelete(activeAnnotationId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearHoverCloseTimeout();
    };
  }, [activeAnnotationId]);

  useEffect(() => {
    if (!draft) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.annotation-popover')) return;
      setDraft(null);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
    };
  }, [draft]);

  useEffect(() => {
    if (!activeAnnotationId) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (event.shiftKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(`[data-annotation-id="${activeAnnotationId}"]`)) return;

      setActiveAnnotationId(null);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown, true);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown, true);
    };
  }, [activeAnnotationId]);

  const handleSaveDraft = () => {
    if (!draft) return;
    const newAnn = normalizeAnnotation({
      id: `a${Date.now()}`,
      replyId: draft.replyId,
      startIndex: draft.startIndex,
      endIndex: draft.endIndex,
      text: draft.text,
      ranges: [createAnnotationRange(draft.startIndex, draft.endIndex, getReplyText(draft.replyId))],
      type: draft.type,
      subType: draft.subType,
      reason: draft.reason,
      severity: '中'
    });
    setAnnotations((currentAnnotations) => [...currentAnnotations, newAnn]);
    setDraft(null);
    window.getSelection()?.removeAllRanges();
    
    if (draft.replyId === 'reply1') setActiveTab1('annotate');
    else setActiveTab2('annotate');
    
    setActiveAnnotationId(newAnn.id);
  };

  const handleLocate = (ann: Annotation) => {
    const highlightElements = ann.ranges
      .map((_, index) => document.getElementById(`highlight-${ann.id}-${index}`))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);

    const firstHighlightElement = highlightElements[0];
    if (!firstHighlightElement) return;

    firstHighlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightElements.forEach((element) => {
      element.classList.add('ring-4', 'ring-blue-400', 'ring-opacity-50');
    });

    setTimeout(() => {
      highlightElements.forEach((element) => {
        element.classList.remove('ring-4', 'ring-blue-400', 'ring-opacity-50');
      });
    }, 1500);
  };

  const handleDelete = (id: string) => {
    setAnnotations((currentAnnotations) => currentAnnotations.filter(a => a.id !== id));
    if (activeAnnotationId === id) setActiveAnnotationId(null);
    if (hoveredAnn?.annotationId === id) setHoveredAnn(null);
  };

  const handleUpdateAnnotation = (id: string, updates: Partial<Annotation>) => {
    setAnnotations((currentAnnotations) => currentAnnotations.map(a => a.id === id ? normalizeAnnotation({ ...a, ...updates }) : a));
    setActiveAnnotationId(id);
  };

  const handleHighlightHover = (e: React.MouseEvent | null, ann: Annotation | null) => {
    if (e && ann) {
      clearHoverCloseTimeout();
      setHoveredAnn({
        annotationId: ann.id,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    } else {
      scheduleHoverClose();
    }
  };

  const hoveredAnnotation = hoveredAnn ? annotations.find((ann) => ann.id === hoveredAnn.annotationId) ?? null : null;
  const hoveredAnnotationPosition = hoveredAnn ? getHoverCardPosition(hoveredAnn.clientX, hoveredAnn.clientY) : null;
  const hoveredAnnotationDisplayIndex = hoveredAnnotation ? getAnnotationDisplayIndex(hoveredAnnotation, annotations) : null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg text-gray-800">全职体感测_rl_2603</h1>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">第3题/4 标注4 跳过0</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="font-mono text-lg bg-blue-50 text-blue-700 px-4 py-1 rounded-full font-bold border border-blue-100">00:02:19</div>
          <div className="flex items-center gap-4 border-l pl-4 border-gray-200">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${mode === 'normal' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-800'}`} 
                onClick={() => setMode('normal')}
              >
                普通模式
              </button>
              <button 
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${mode === 'annotate' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-800'}`} 
                onClick={() => setMode('annotate')}
              >
                批注模式
              </button>
            </div>
            <button onClick={() => setShowShortcuts(true)} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"><AlertCircle size={16}/> 快捷键</button>
            <div className="text-sm text-emerald-600 flex items-center gap-1 font-medium"><Check size={16}/> 已自动保存</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm border border-gray-200 rounded text-gray-600 hover:bg-gray-50 flex items-center gap-1 transition-colors"><ChevronLeft size={16}/> 上一题</button>
          <button className="px-3 py-1.5 text-sm border border-gray-200 rounded text-gray-600 hover:bg-gray-50 flex items-center gap-1 transition-colors">下一题 <ChevronRight size={16}/></button>
        </div>
      </header>

      <div className="p-4 shrink-0">
        <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-purple-800 font-medium text-sm">
            <span className="bg-purple-100 px-2 py-0.5 rounded text-xs border border-purple-200">指示</span>
            22字
          </div>
          <p className="text-gray-800">{PROMPT}</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 px-4 pb-4 min-h-0">
        <ReplyPanel 
          replyId="reply1"
          text={REPLY_1}
          title="回复1"
          wordCount={1050}
          annotations={annotations}
          activeTab={activeTab1}
          setActiveTab={setActiveTab1}
          mode={mode}
          draft={draft}
          setDraft={setDraft}
          activeAnnotationId={activeAnnotationId}
          setActiveAnnotationId={(id: string | null) => {
            setActiveAnnotationId(id);
            if (id) setActiveTab1('annotate');
          }}
          handleLocate={handleLocate}
          handleDelete={handleDelete}
          handleUpdateAnnotation={handleUpdateAnnotation}
          onSaveDraft={handleSaveDraft}
          onHighlightHover={handleHighlightHover}
          onTextMouseDown={hideHoveredAnnotation}
        />
        
        <ReplyPanel 
          replyId="reply2"
          text={REPLY_2}
          title="回复2"
          wordCount={987}
          annotations={annotations}
          activeTab={activeTab2}
          setActiveTab={setActiveTab2}
          mode={mode}
          draft={draft}
          setDraft={setDraft}
          activeAnnotationId={activeAnnotationId}
          setActiveAnnotationId={(id: string | null) => {
            setActiveAnnotationId(id);
            if (id) setActiveTab2('annotate');
          }}
          handleLocate={handleLocate}
          handleDelete={handleDelete}
          handleUpdateAnnotation={handleUpdateAnnotation}
          onSaveDraft={handleSaveDraft}
          onHighlightHover={handleHighlightHover}
          onTextMouseDown={hideHoveredAnnotation}
        />
      </div>

      {hoveredAnnotation && hoveredAnnotationPosition && (
        <HoverEditorPopover
          annotation={hoveredAnnotation}
          displayIndex={hoveredAnnotationDisplayIndex}
          position={hoveredAnnotationPosition}
          onMouseEnter={clearHoverCloseTimeout}
          onMouseLeave={scheduleHoverClose}
          onDelete={handleDelete}
          handleUpdateAnnotation={handleUpdateAnnotation}
        />
      )}

      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">快捷键提示</h2>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">事实性错误</span>
                <kbd className="bg-gray-100 border border-gray-200 rounded px-2 py-0.5 font-mono text-gray-600">1</kbd>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">推理错误</span>
                <kbd className="bg-gray-100 border border-gray-200 rounded px-2 py-0.5 font-mono text-gray-600">2</kbd>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">情感表达错误</span>
                <kbd className="bg-gray-100 border border-gray-200 rounded px-2 py-0.5 font-mono text-gray-600">3</kbd>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">保存标注</span>
                <kbd className="bg-gray-100 border border-gray-200 rounded px-2 py-0.5 font-mono text-gray-600">Enter</kbd>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">取消标注</span>
                <kbd className="bg-gray-100 border border-gray-200 rounded px-2 py-0.5 font-mono text-gray-600">Esc</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">删除当前问题</span>
                <kbd className="bg-gray-100 border border-gray-200 rounded px-2 py-0.5 font-mono text-gray-600">Delete</kbd>
              </div>
            </div>
            <div className="mt-6 text-center">
              <button onClick={() => setShowShortcuts(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium w-full">我知道了</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
