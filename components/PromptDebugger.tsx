import React, { useState, useEffect, useRef } from 'react';
import { Save, Play, Copy, RefreshCw, ChevronDown, CheckCircle, AlertCircle, Maximize2, Minimize2, Columns, History, Settings, X, Zap, Box, ChevronUp, ChevronDown as ChevronDownIcon, ChevronRight, ChevronLeft, Send, Plus, List, MoreVertical as MoreVerticalIcon, Download } from 'lucide-react';
import { Task, ModelConfig, Language } from '../types';
import { INITIAL_PROMPT_CONTENT, MOCK_VERSIONS, MOCK_MODELS, TRANSLATIONS } from '../constants';

interface PromptDebuggerProps {
  task: Task | null;
  lang: Language;
}

export const PromptDebugger: React.FC<PromptDebuggerProps> = ({ task, lang }) => {
  const [versions, setVersions] = useState(MOCK_VERSIONS);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [promptContent, setPromptContent] = useState(
    versions[0]?.content || INITIAL_PROMPT_CONTENT
  );
  const [variables, setVariables] = useState<Record<string, string>>(
    versions[0]?.variables || {}
  );
  const [detectedVars, setDetectedVars] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelConfig>(MOCK_MODELS[0]);
  const [results, setResults] = useState<{ modelId: string; model: string; text: string }[]>([]);
  const [isSystemPromptCollapsed, setIsSystemPromptCollapsed] = useState(false);
  const [isVariablesCollapsed, setIsVariablesCollapsed] = useState(false);
  const [isUserNoteCollapsed, setIsUserNoteCollapsed] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [isUserPromptExpanded, setIsUserPromptExpanded] = useState(false);
  const DEFAULT_PROMPT_BOTTOM = 16;
  const [userPromptBottom, setUserPromptBottom] = useState(DEFAULT_PROMPT_BOTTOM);
  const [isDraggingPrompt, setIsDraggingPrompt] = useState(false);
  const promptDragStartRef = useRef<{ mouseY: number; bottom: number } | null>(null);

  const [layout, setLayout] = useState<{ left: number; center: number; right: number }>({
    left: 35,
    center: 25,
    right: 40,
  });
  const [resizing, setResizing] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef(0);
  const startLayoutRef = useRef(layout);
  
  // Model Selector Modal State
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isTaskListOpen, setIsTaskListOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCollaborators, setNewTaskCollaborators] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [versionName, setVersionName] = useState('V3');
  const [versionDescription, setVersionDescription] = useState('');
  const [isVersionListOpen, setIsVersionListOpen] = useState(false);
  const [isCompareManageOpen, setIsCompareManageOpen] = useState(false);
  const [compareSelectedIndices, setCompareSelectedIndices] = useState<number[]>(
    () => (MOCK_VERSIONS.length > 0 ? [0] : [])
  );
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportMode, setExportMode] = useState<'direct' | 'save_then_export'>('direct');
  const [activeResultIndex, setActiveResultIndex] = useState<number | null>(null);

  const defaultResultWidth = 420;
  const [resultWidths, setResultWidths] = useState<number[]>([]);
  const [resultResizingIndex, setResultResizingIndex] = useState<number | null>(null);
  const resultResizeStartXRef = useRef(0);
  const resultResizeStartWidthRef = useRef(defaultResultWidth);
  const [loadingCards, setLoadingCards] = useState<number[]>([]);
  const [generationScope, setGenerationScope] = useState<'all' | 'single' | null>(null);
  const generationTimeoutRef = useRef<number | null>(null);
  const [expandedResultIndex, setExpandedResultIndex] = useState<number | null>(null);

  useEffect(() => {
    setCompareSelectedIndices(prev =>
      prev.filter((idx) => idx >= 0 && idx < versions.length)
    );
  }, [versions.length]);

  const t = TRANSLATIONS[lang];

  // Regex to find {{variable}}
  useEffect(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = [...promptContent.matchAll(regex)]
      .map(m => (m[1] || '').trim())
      .filter(name => !!name);
    setDetectedVars([...new Set(matches)]);
  }, [promptContent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate()
      )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setLastAutoSaveAt(formatted);
    }, 1500);

    return () => clearTimeout(timer);
  }, [promptContent, variables, userPrompt]);

  useEffect(() => {
    return () => {
      if (generationTimeoutRef.current !== null) {
        clearTimeout(generationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const ver = versions[currentVersionIndex] || versions[0];
    if (!ver) return;
    setPromptContent(ver.content || INITIAL_PROMPT_CONTENT);
    setVariables(ver.variables || {});
  }, [currentVersionIndex]);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      if (!containerWidth) return;

      const deltaX = event.clientX - startXRef.current;
      const deltaPercent = (deltaX / containerWidth) * 100;

      setLayout(() => {
        const start = startLayoutRef.current;
        let left = start.left;
        let center = start.center;
        let right = start.right;

        if (resizing === 'left') {
          const total = start.left + start.center;
          const minLeft = 15;
          const minCenter = 15;
          let newLeft = start.left + deltaPercent;
          newLeft = Math.max(minLeft, Math.min(newLeft, total - minCenter));
          const newCenter = total - newLeft;
          left = newLeft;
          center = newCenter;
          right = start.right;
        } else if (resizing === 'right') {
          const total = start.center + start.right;
          const minCenter = 15;
          const minRight = 20;
          let newCenter = start.center + deltaPercent;
          newCenter = Math.max(minCenter, Math.min(newCenter, total - minRight));
          const newRight = total - newCenter;
          center = newCenter;
          right = newRight;
          left = start.left;
        }

        const normalization = left + center + right;
        return {
          left: (left / normalization) * 100,
          center: (center / normalization) * 100,
          right: (right / normalization) * 100,
        };
      });
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  // Ensure there is a width value for each result card
  useEffect(() => {
    setResultWidths(prev => {
      if (prev.length === results.length) return prev;
      const next = [...prev];
      while (next.length < results.length) {
        next.push(defaultResultWidth);
      }
      return next.slice(0, results.length);
    });
  }, [results.length]);

  useEffect(() => {
    if (results.length === 1) {
      setExpandedResultIndex(null);
    }
  }, [results.length]);

  // Horizontal resize for result cards
  useEffect(() => {
    if (resultResizingIndex === null) return;

    const handleMove = (event: MouseEvent) => {
      const delta = event.clientX - resultResizeStartXRef.current;
      setResultWidths(prev => {
        const next = [...prev];
        const minWidth = 320;
        const maxWidth = 720;
        const base = resultResizeStartWidthRef.current;
        next[resultResizingIndex] = Math.max(minWidth, Math.min(maxWidth, base + delta));
        return next;
      });
    };

    const handleUp = () => {
      setResultResizingIndex(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [resultResizingIndex]);

  const handleResultResizeStart = (index: number) => (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    setResultResizingIndex(index);
    resultResizeStartXRef.current = event.clientX;
    resultResizeStartWidthRef.current = resultWidths[index] ?? defaultResultWidth;
  };

  const handleRun = () => {
    if (generationTimeoutRef.current !== null) {
      clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }

    const targetConfigs =
      results.length > 0
        ? results.map(r => ({ modelId: r.modelId, model: r.model }))
        : [{ modelId: selectedModel.id, model: selectedModel.name }];

    setIsLoading(true);
    setLoadingCards(targetConfigs.map((_, idx) => idx));
    setGenerationScope('all');
    // Ensure cards exist immediately so宽度和动画不会闪烁
    setResults(prev =>
      targetConfigs.map((info, idx) => ({
        ...info,
        text: prev[idx]?.text || '',
      }))
    );

    generationTimeoutRef.current = window.setTimeout(() => {
      setResults(
        targetConfigs.map(info => ({
          ...info,
          text: buildReplyText(),
        }))
      );
      setIsLoading(false);
      setLoadingCards([]);
      setGenerationScope(null);
      generationTimeoutRef.current = null;
    }, 1500);
  };

  const handleRunSingle = (index: number) => {
    if (index < 0 || index >= results.length) return;

    if (generationTimeoutRef.current !== null) {
      clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }

    setIsLoading(true);
    setLoadingCards([index]);
    setGenerationScope('single');

    generationTimeoutRef.current = window.setTimeout(() => {
      setResults(prev => {
        const next = [...prev];
        if (next[index]) {
          next[index] = {
            ...next[index],
            text: buildReplyText(),
          };
        }
        return next;
      });
      setIsLoading(false);
      setLoadingCards([]);
      setGenerationScope(null);
      generationTimeoutRef.current = null;
    }, 1500);
  };

  const cancelGeneration = () => {
    if (generationTimeoutRef.current !== null) {
      clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }
    setIsLoading(false);
    setLoadingCards([]);
    setGenerationScope(null);
    setActiveResultIndex(null);
  };

  const handlePromptDragStart = (event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (!isUserPromptExpanded) return;
    event.preventDefault();
    promptDragStartRef.current = {
      mouseY: event.clientY,
      bottom: userPromptBottom,
    };
    setIsDraggingPrompt(true);
  };

  useEffect(() => {
    if (!isDraggingPrompt) return;

    const handleMove = (event: MouseEvent) => {
      if (!promptDragStartRef.current) return;
      const dy = event.clientY - promptDragStartRef.current.mouseY;
      const nextBottom = promptDragStartRef.current.bottom - dy;
      const minBottom = 16;
      const maxBottom = Math.max(16, window.innerHeight - 240);
      setUserPromptBottom(Math.max(minBottom, Math.min(maxBottom, nextBottom)));
    };

    const handleUp = () => {
      setIsDraggingPrompt(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingPrompt]);

  const handleUserPromptSend = () => {
    const trimmed = userPrompt.trim();
    if (trimmed) {
      setVariables(prev => ({ ...prev, context: trimmed }));
    }
    handleRun();
  };

  const buildReplyText = () => {
    return `<think>\nAnalyzing user context: ${variables.context || 'None'}\nPersona: ${
      variables.persona_name
    }\n</think>\n\nAs ${variables.persona_name || 'the assistant'}, a specialist in ${
      variables.field || 'your field'
    }, I have reviewed the case.\n\nThe reported symptoms are concerning. The combination of ${
      variables.trait_1 || 'careful'
    } listening and ${variables.trait_2 || 'analytical'} reasoning leads me to suggest...`;
  };

  const handleStartResize = (type: 'left' | 'right') => (event: React.MouseEvent<HTMLDivElement>) => {
    setResizing(type);
    startXRef.current = event.clientX;
    startLayoutRef.current = layout;
  };

  const VariableInput = ({ name }: { name: string }) => {
    const isFilled = !!variables[name];
    return (
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <label className="text-xs font-semibold text-slate-600 font-mono">{name}</label>
          {isFilled ? (
            <CheckCircle className="w-3 h-3 text-green-500" />
          ) : (
            <AlertCircle className="w-3 h-3 text-red-500" />
          )}
        </div>
        <input
          type="text"
          value={variables[name] || ''}
          onChange={(e) => setVariables(prev => ({ ...prev, [name]: e.target.value }))}
          className={`w-full px-3 py-2 text-sm rounded border focus:outline-none transition-colors ${
            isFilled 
              ? 'border-slate-200 bg-slate-50 focus:border-blue-500' 
              : 'border-red-200 bg-red-50 focus:border-red-400'
          }`}
          placeholder={`Value for ${name}`}
        />
      </div>
    );
  };

  // The Advanced Model Selector Modal
  const ModelSelectorModal = () => {
    if (!isModelSelectorOpen) return null;

    const handleSelectModel = (model: ModelConfig) => {
      if (activeResultIndex !== null) {
        setResults(prev => {
          const next = [...prev];
          if (next[activeResultIndex]) {
            next[activeResultIndex] = {
              ...next[activeResultIndex],
              modelId: model.id,
              model: model.name,
            };
          }
          return next;
        });
        setActiveResultIndex(null);
      } else {
        setSelectedModel(model);
      }
      setIsModelSelectorOpen(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white w-[900px] h-[600px] rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in duration-200">
          
          {/* Left Column: Model List */}
          <div className="w-[60%] border-r border-slate-100 flex flex-col bg-slate-50">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-slate-800 text-lg">{t['model.selector.title']}</h3>
              <span className="text-xs text-slate-400">17 {lang === 'en' ? 'Models' : '个模型'}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {MOCK_MODELS.map(model => (
                <div 
                  key={model.id}
                  onClick={() => handleSelectModel(model)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start space-x-4 ${
                    selectedModel.id === model.id 
                    ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-500' 
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 text-white">
                    <Box className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{model.name}</h4>
                    <p className="text-xs text-slate-500 break-all">{model.description}</p>
                  </div>
                  {selectedModel.id === model.id && <Settings className="w-4 h-4 text-blue-500" />}
                </div>
              ))}
              
              <button className="w-full py-3 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-white transition-all text-sm font-medium mt-4">
                <PlusIcon /> {t['model.custom']}
              </button>
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="w-[40%] bg-slate-50/30 flex flex-col">
             <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-lg">{t['model.settings.title']}</h3>
                <button onClick={() => setIsModelSelectorOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
             </div>
             
             <div className="p-6 space-y-8">
               <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">{t['model.temp']}</label>
                    <div className="bg-white border border-slate-200 px-2 py-1 rounded text-sm min-w-[3rem] text-center shadow-sm">
                      {selectedModel.temperature}
                    </div>
                  </div>
                  <input 
                    type="range" min="0" max="2" step="0.1" 
                    value={selectedModel.temperature} 
                    onChange={(e) => setSelectedModel({...selectedModel, temperature: parseFloat(e.target.value)})}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
               </div>

               <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">{t['model.topP']}</label>
                    <div className="bg-white border border-slate-200 px-2 py-1 rounded text-sm min-w-[3rem] text-center shadow-sm">
                      {selectedModel.topP}
                    </div>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={selectedModel.topP} 
                    onChange={(e) => setSelectedModel({...selectedModel, topP: parseFloat(e.target.value)})}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
               </div>

               {/* Mock Reasoning Toggle */}
               <div className="flex items-center justify-between">
                 <div className="flex flex-col">
                   <label className="text-sm font-medium text-slate-700">Thinking Process</label>
                   <span className="text-xs text-slate-500">Enable chain-of-thought display</span>
                 </div>
                 <button className="w-11 h-6 bg-blue-600 rounded-full relative transition-colors focus:outline-none">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform"></div>
                 </button>
               </div>
             </div>

             <div className="mt-auto p-6 bg-white border-t border-slate-100">
               <button 
                 onClick={() => setIsModelSelectorOpen(false)}
                 className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md shadow-blue-200 transition-all"
               >
                 {lang === 'en' ? 'Confirm' : '确定'}
               </button>
             </div>
          </div>

        </div>
      </div>
    );
  }

  const TaskListModal = () => {
    if (!isTaskListOpen) return null;

    const mockTasks: Task[] = [
      task,
      {
        id: 't-2',
        title: lang === 'en' ? 'Customer Support Bot' : '客服机器人',
        description: '',
        updatedAt: '2025-07-20 10:30:28',
        author: 'System',
        status: 'active',
        tags: [],
      },
    ].filter(Boolean) as Task[];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white w-[420px] max-h-[70vh] rounded-2xl shadow-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {lang === 'en' ? 'Switch Task' : '切换任务'}
            </h3>
            <button
              onClick={() => setIsTaskListOpen(false)}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {lang === 'en'
              ? 'Switching tasks may discard unsaved prompt changes.'
              : '切换任务可能会导致未保存的 Prompt 丢失。'}
          </p>
          <div className="flex-1 overflow-y-auto space-y-3">
            {mockTasks.map(tk => (
              <div
                key={tk.id}
                className="bg-slate-50 rounded-xl p-3 border border-slate-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                onClick={() => {
                  setIsTaskListOpen(false);
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-900">{tk.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {tk.id}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>{lang === 'en' ? 'Updated' : '更新时间'}</span>
                  <span>{tk.updatedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const NewTaskModal = () => {
    if (!isNewTaskOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white w-[420px] rounded-2xl shadow-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {lang === 'en' ? 'New Task' : '新建任务'}
            </h3>
            <button
              onClick={() => setIsNewTaskOpen(false)}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {lang === 'en' ? 'Task Name' : '任务名称'} <span className="text-red-500">*</span>
              </label>
              <input
                value={newTaskName}
                onChange={e => setNewTaskName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder={lang === 'en' ? 'Untitled task' : '未命名任务'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {lang === 'en' ? 'Collaborators' : '协作人'}
              </label>
              <textarea
                value={newTaskCollaborators}
                onChange={e => setNewTaskCollaborators(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 min-h-[96px]"
                placeholder={
                  lang === 'en'
                    ? 'Collaborator UIDs, one per line'
                    : '协作人 UID，每个 UID 一行'
                }
              />
            </div>
          </div>
          <button
            onClick={() => {
              setIsNewTaskOpen(false);
            }}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm shadow-blue-200"
          >
            {lang === 'en' ? 'Go debug prompt' : '去调试 Prompt'}
          </button>
        </div>
      </div>
    );
  };

  const SaveVersionModal = () => {
    if (!isSaveModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white w-[420px] rounded-2xl shadow-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {lang === 'en' ? 'Save Version' : '保存版本'}
            </h3>
            <button
              onClick={() => setIsSaveModalOpen(false)}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {lang === 'en' ? 'Version Name' : '版本名称'}
              </label>
              <input
                value={versionName}
                onChange={e => setVersionName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {lang === 'en' ? 'Description' : '版本描述'}
              </label>
              <textarea
                value={versionDescription}
                onChange={e => setVersionDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 min-h-[96px]"
                placeholder={
                  lang === 'en'
                    ? 'Describe what changed in this version...'
                    : '简单说明本次版本修改内容...'
                }
              />
            </div>
          </div>

          <button
            onClick={() => setIsSaveModalOpen(false)}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm shadow-blue-200 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{lang === 'en' ? 'Save' : '保存'}</span>
          </button>
        </div>
      </div>
    );
  };

  const VersionListModal = () => {
    if (!isVersionListOpen) return null;

    const total = versions.length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white w-[460px] max-h-[80vh] rounded-2xl shadow-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-sm text-slate-500">
                {lang === 'en' ? `Total ${total} versions` : `共 ${total} 个版本`}
              </span>
            </div>
            <button
              onClick={() => setIsVersionListOpen(false)}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {versions.map((ver, idx) => {
              const isActive = idx === currentVersionIndex;
              return (
                <button
                  key={ver.id}
                  onClick={() => {
                    setCurrentVersionIndex(idx);
                    setIsVersionListOpen(false);
                  }}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-900">{ver.version}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {isActive
                        ? lang === 'en'
                          ? 'Editable'
                          : '可编辑'
                        : lang === 'en'
                        ? 'Read only'
                        : '只读'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mb-1">
                    {lang === 'en' ? 'Description:' : '版本描述:'}{' '}
                    {ver.description || (lang === 'en' ? 'My version description' : '我的版本描述')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'en' ? 'Last edited at ' : '最近编辑于 '}
                    {ver.timestamp}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const ExportModal = () => {
    if (!isExportModalOpen) return null;

    const handleConfirm = () => {
      // Placeholder: real export wiring can be added later
      console.log('Exporting debug data as', exportFormat, 'mode', exportMode);
      setIsExportModalOpen(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white w-[420px] rounded-2xl shadow-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {lang === 'en' ? 'Export Settings' : '导出设置'}
            </h3>
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5 text-sm text-slate-700 mb-6">
            <div>
              <div className="font-semibold mb-2">
                {lang === 'en' ? 'Export As' : '导出为'}
              </div>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      exportFormat === 'json'
                        ? 'border-blue-500'
                        : 'border-slate-300'
                    }`}
                  >
                    {exportFormat === 'json' && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </span>
                  <span className="text-slate-700 text-sm">JSON</span>
                  <input
                    type="radio"
                    className="hidden"
                    checked={exportFormat === 'json'}
                    onChange={() => setExportFormat('json')}
                  />
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      exportFormat === 'csv'
                        ? 'border-blue-500'
                        : 'border-slate-300'
                    }`}
                  >
                    {exportFormat === 'csv' && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </span>
                  <span className="text-slate-700 text-sm">CSV</span>
                  <input
                    type="radio"
                    className="hidden"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-2">
                {lang === 'en' ? 'Export Mode' : '导出方式'}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                {lang === 'en'
                  ? 'Exporting directly will use the data stored in the database, which may be slightly different from what you currently see. If you want them to be consistent, choose "Save then export".'
                  : '直接导出会导出数据库里存储的数据，可能会与您当前看到的内容不一致。如果希望导出的数据和当前界面一致，请选择“先保存再导出”。'}
              </p>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      exportMode === 'direct'
                        ? 'border-blue-500'
                        : 'border-slate-300'
                    }`}
                  >
                    {exportMode === 'direct' && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </span>
                  <span className="text-slate-700 text-sm">
                    {lang === 'en' ? 'Export directly' : '直接导出'}
                  </span>
                  <input
                    type="radio"
                    className="hidden"
                    checked={exportMode === 'direct'}
                    onChange={() => setExportMode('direct')}
                  />
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      exportMode === 'save_then_export'
                        ? 'border-blue-500'
                        : 'border-slate-300'
                    }`}
                  >
                    {exportMode === 'save_then_export' && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </span>
                  <span className="text-slate-700 text-sm">
                    {lang === 'en' ? 'Save then export' : '先保存再导出'}
                  </span>
                  <input
                    type="radio"
                    className="hidden"
                    checked={exportMode === 'save_then_export'}
                    onChange={() => setExportMode('save_then_export')}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
            >
              {lang === 'en' ? 'Cancel' : '取消'}
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 shadow-sm"
            >
              {lang === 'en' ? 'Export' : '导出'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CompareManageModal = () => {
    if (!isCompareManageOpen) return null;

    const selectedIndices = compareSelectedIndices.length
      ? compareSelectedIndices
      : [currentVersionIndex].filter(idx => idx >= 0 && idx < versions.length);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white w-[520px] max-h-[80vh] rounded-2xl shadow-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {lang === 'en' ? 'Select versions to compare' : '请选择想要对比的版本'}
            </h3>
            <button
              onClick={() => setIsCompareManageOpen(false)}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {versions.map((ver, idx) => {
              const isActive = idx === currentVersionIndex;
              const badgeIndex = selectedIndices.indexOf(idx);
              const isSelected = badgeIndex !== -1;

              return (
                <button
                  type="button"
                  key={ver.id}
                  onClick={() => {
                    setCompareSelectedIndices(prev => {
                      const exists = prev.includes(idx);
                      if (exists) {
                        const next = prev.filter(i => i !== idx);
                        return next.length ? next : [idx];
                      }
                      return [...prev, idx];
                    });
                  }}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{ver.version}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {isActive
                          ? lang === 'en'
                            ? 'Editable'
                            : '可编辑'
                          : lang === 'en'
                          ? 'Read only'
                          : '只读'}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] flex items-center justify-center">
                        {badgeIndex + 1}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mb-1">
                    {lang === 'en' ? 'Description:' : '版本描述:'}{' '}
                    {ver.description ||
                      (lang === 'en' ? 'My version description' : '我的版本描述')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'en' ? 'Last edited at ' : '最近编辑于 '}
                    {ver.timestamp}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setIsCompareManageOpen(false)}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
            >
              {lang === 'en' ? 'Cancel' : '取消'}
            </button>
            <button
              onClick={() => {
                setIsCompareManageOpen(false);
                setIsComparing(true);
              }}
              className="px-5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 shadow-sm"
            >
              {lang === 'en' ? 'Confirm' : '确定'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ResultContent = ({ text }: { text: string }) => {
    const [showThinking, setShowThinking] = useState(true);

    const start = text.indexOf('<think>');
    const end = text.indexOf('</think>');

    let thinking = '';
    let finalText = text;

    if (start !== -1 && end !== -1 && end > start) {
      thinking = text.slice(start + '<think>'.length, end).trim();
      finalText = (text.slice(0, start) + text.slice(end + '</think>'.length)).trim();
    }

    if (!thinking) {
      return (
        <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
          {finalText}
        </div>
      );
    }

    return (
      <div className="space-y-3 text-sm leading-relaxed whitespace-pre-wrap font-sans">
        <div className="border border-amber-200 bg-amber-50 rounded-md px-3 py-2 text-xs text-amber-900">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">
              {lang === 'en' ? 'Thinking (hidden to user)' : '推理过程（对用户不可见）'}
            </span>
            <button
              type="button"
              onClick={() => setShowThinking(prev => !prev)}
              className="text-[11px] text-amber-800 hover:underline"
            >
              {showThinking
                ? lang === 'en'
                  ? 'Collapse'
                  : '收起推理'
                : lang === 'en'
                ? 'Expand'
                : '展开推理'}
            </button>
          </div>
          {showThinking && <div>{thinking}</div>}
          {!showThinking && (
            <div className="italic opacity-70">
              {lang === 'en' ? 'Thinking collapsed' : '推理内容已收起'}
            </div>
          )}
        </div>

        <div className="rounded-md px-3 py-2 bg-white text-slate-900 border border-slate-200 shadow-xs">
          {finalText}
        </div>
      </div>
    );
  };

  const CompareView = () => {
    const defaultWidth = 420;
    const defaultSectionHeights = { sys: 160, note: 120, result: 180 };
    const [collapsedSections, setCollapsedSections] = useState<{ sys: boolean; note: boolean }[]>(
      () => versions.map(() => ({ sys: false, note: false }))
    );
    const [sectionHeights, setSectionHeights] = useState<
      { sys: number; note: number; result: number }[]
    >(() => {
      if (typeof window === 'undefined') {
        return versions.map(() => ({ ...defaultSectionHeights }));
      }
      try {
        const raw = window.localStorage.getItem('pm_compare_section_heights');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length === versions.length) {
            return parsed.map((h: any) => ({
              sys: typeof h?.sys === 'number' ? h.sys : defaultSectionHeights.sys,
              note: typeof h?.note === 'number' ? h.note : defaultSectionHeights.note,
              result: typeof h?.result === 'number' ? h.result : defaultSectionHeights.result,
            }));
          }
        }
      } catch {
        // ignore
      }
      return versions.map(() => ({ ...defaultSectionHeights }));
    });
    const [versionWidths, setVersionWidths] = useState<number[]>(() => {
      if (typeof window === 'undefined') {
        return versions.map(() => defaultWidth);
      }
      try {
        const raw = window.localStorage.getItem('pm_version_widths');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length === versions.length) {
            return parsed.map((n) => (typeof n === 'number' ? n : defaultWidth));
          }
        }
      } catch {
        // ignore
      }
      return versions.map(() => defaultWidth);
    });

    useEffect(() => {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('pm_version_widths', JSON.stringify(versionWidths));
        } catch {
          // ignore
        }
      }
    }, [versionWidths]);

    const [resizingIndex, setResizingIndex] = useState<number | null>(null);
    const resizeStartXRef = useRef(0);
    const resizeStartWidthRef = useRef(0);

    useEffect(() => {
      if (resizingIndex === null) return;

      const handleMove = (e: MouseEvent) => {
        const delta = e.clientX - resizeStartXRef.current;
        setVersionWidths((prev) => {
          const next = [...prev];
          const minWidth = 320;
          const maxWidth = 720;
          const target = resizeStartWidthRef.current + delta;
          next[resizingIndex] = Math.max(minWidth, Math.min(maxWidth, target));
          return next;
        });
      };

      const handleUp = () => {
        setResizingIndex(null);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);

      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
    }, [resizingIndex]);

    const startResize = (index: number) => (e: React.MouseEvent<HTMLDivElement>) => {
      resizeStartXRef.current = e.clientX;
      resizeStartWidthRef.current = versionWidths[index];
      setResizingIndex(index);
    };

    useEffect(() => {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            'pm_compare_section_heights',
            JSON.stringify(sectionHeights)
          );
        } catch {
          // ignore
        }
      }
    }, [sectionHeights]);

    const [verticalResizing, setVerticalResizing] = useState<{
      idx: number;
      key: 'sys' | 'note' | 'result';
    } | null>(null);
    const verticalStartRef = useRef<{ y: number; height: number } | null>(null);

    useEffect(() => {
      if (!verticalResizing) return;

      const handleMove = (e: MouseEvent) => {
        if (!verticalStartRef.current) return;
        const delta = e.clientY - verticalStartRef.current.y;
        const minHeight = 80;
        const maxHeight = 400;
        const target = Math.max(
          minHeight,
          Math.min(maxHeight, verticalStartRef.current.height + delta)
        );
        setSectionHeights(prev =>
          prev.map((h, idx) =>
            idx === verticalResizing.idx ? { ...h, [verticalResizing.key]: target } : h
          )
        );
      };

      const handleUp = () => {
        setVerticalResizing(null);
        verticalStartRef.current = null;
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);

      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
    }, [verticalResizing]);

    const startVerticalResize = (index: number, key: 'sys' | 'note' | 'result') =>
      (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        verticalStartRef.current = {
          y: e.clientY,
          height: sectionHeights[index]?.[key] ?? defaultSectionHeights[key],
        };
        setVerticalResizing({ idx: index, key });
      };

    const toggleSection = (index: number, key: 'sys' | 'note') => {
      setCollapsedSections(prev =>
        prev.map((item, i) => (i === index ? { ...item, [key]: !item[key] } : item))
      );
    };

    const activeCompareIndices =
      compareSelectedIndices.length > 0
        ? compareSelectedIndices
        : versions.map((_, idx) => idx);

    return (
      <div className="flex flex-1 flex-col bg-slate-50 relative">
        <div className="flex-1 overflow-x-auto overflow-y-auto pt-4 px-4 pb-28">
          <div className="flex min-h-full">
            {activeCompareIndices.map((idx) => {
              const ver = versions[idx];
              if (!ver) return null;
              return (
              <div key={ver.id} className="flex items-stretch">
                <div
                  className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col"
                  style={{ width: versionWidths[idx] ?? defaultWidth }}
                >
                  <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-slate-900">{ver.version}</span>
                      </div>
                      <span className="text-xs text-slate-500 mt-0.5">
                        {lang === 'en'
                          ? 'Version description...'
                          : '这里是版本描述，尽量展示完整信息'}
                      </span>
                    </div>
                    <button
                      className="px-2 py-1 rounded border border-slate-300 text-[11px] text-slate-600 hover:bg-slate-100"
                      onClick={() => {
                        const newId = `v-copy-${Date.now()}-${idx}`;
                        const newVersionLabel = `${ver.version}-copy`;
                        const newVersion = {
                          ...ver,
                          id: newId,
                          version: newVersionLabel,
                          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
                        };
                        setVersions(prev => [...prev, newVersion]);
                      }}
                    >
                      {lang === 'en' ? 'Save as new' : '另存为新版本'}
                    </button>
                  </div>

                  <div className="p-4 space-y-4 text-sm text-slate-800">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase">
                          system prompt
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSection(idx, 'sys')}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400"
                          title={
                            collapsedSections[idx]?.sys
                              ? lang === 'en'
                                ? 'Expand system prompt'
                                : '展开 system prompt'
                              : lang === 'en'
                              ? 'Collapse system prompt'
                              : '收起 system prompt'
                          }
                        >
                          {collapsedSections[idx]?.sys ? (
                            <ChevronDownIcon className="w-3 h-3" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {!collapsedSections[idx]?.sys && (
                        <div className="border border-slate-200 rounded-lg bg-slate-50 text-xs leading-relaxed flex flex-col">
                          <div
                            className="px-3 py-2 whitespace-pre-wrap overflow-y-auto"
                            style={{ height: sectionHeights[idx]?.sys ?? defaultSectionHeights.sys }}
                          >
                            {ver.content}
                          </div>
                          <div
                            onMouseDown={startVerticalResize(idx, 'sys')}
                            className="h-2 flex items-center justify-center cursor-row-resize"
                          >
                            <div className="w-10 h-0.5 bg-slate-300 rounded-full" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-500">
                          {lang === 'en' ? 'Note' : '笔记 note'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSection(idx, 'note')}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400"
                          title={
                            collapsedSections[idx]?.note
                              ? lang === 'en'
                                ? 'Expand note'
                                : '展开笔记'
                              : lang === 'en'
                              ? 'Collapse note'
                              : '收起笔记'
                          }
                        >
                          {collapsedSections[idx]?.note ? (
                            <ChevronDownIcon className="w-3 h-3" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {!collapsedSections[idx]?.note && (
                        <div className="border border-slate-200 rounded-lg bg-white text-xs leading-relaxed flex flex-col">
                          <div
                            className="px-3 py-2 overflow-y-auto"
                            style={{
                              height: sectionHeights[idx]?.note ?? defaultSectionHeights.note,
                            }}
                          >
                            {lang === 'en'
                              ? 'This area shows the debug note and additional instructions for this version.'
                              : '这里展示该版本的调试笔记和补充说明内容。'}
                          </div>
                          <div
                            onMouseDown={startVerticalResize(idx, 'note')}
                            className="h-2 flex items-center justify-center cursor-row-resize"
                          >
                            <div className="w-10 h-0.5 bg-slate-300 rounded-full" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-500">
                          {lang === 'en' ? 'Result' : '结果 result'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setActiveResultIndex(idx);
                              setIsModelSelectorOpen(true);
                            }}
                            className="flex items-center space-x-1 px-2 py-1 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all shadow-sm group text-[10px]"
                          >
                            <Zap className="w-3 h-3 text-yellow-400 group-hover:scale-110 transition-transform" />
                            <span className="font-medium max-w-[120px] truncate">
                              {results[idx]?.model || selectedModel.name}
                            </span>
                            <Settings className="w-3 h-3 opacity-50" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              loadingCards.includes(idx) ? cancelGeneration() : handleRunSingle(idx)
                            }
                            className={`px-2.5 py-1 rounded text-[10px] font-medium shadow-sm ${
                              loadingCards.includes(idx)
                                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {loadingCards.includes(idx)
                              ? lang === 'en'
                                ? 'Cancel'
                                : '取消生成'
                              : lang === 'en'
                              ? 'Generate'
                              : '生成回复'}
                          </button>
                        </div>
                      </div>
                      <div className="border border-slate-200 rounded-lg bg-white text-xs leading-relaxed flex flex-col">
                        <div
                          className="px-3 py-2 whitespace-pre-wrap overflow-y-auto"
                          style={{
                            height: sectionHeights[idx]?.result ?? defaultSectionHeights.result,
                          }}
                        >
                          {idx < results.length && results[idx].text
                            ? results[idx].text
                            : lang === 'en'
                            ? 'Click \"Generate\" to run this version.'
                            : '点击上方“生成回复”按钮后，会在此展示该版本的输出结果。'}
                        </div>
                        <div
                          onMouseDown={startVerticalResize(idx, 'result')}
                          className="h-2 flex items-center justify-center cursor-row-resize"
                        >
                          <div className="w-10 h-0.5 bg-slate-300 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {idx < versions.length - 1 && (
                  <div
                    onMouseDown={startResize(idx)}
                    className="w-6 mx-2 cursor-col-resize flex items-stretch"
                  >
                    <div className="mx-auto w-px bg-slate-200 hover:bg-blue-400 rounded-full h-full" />
                  </div>
                )}
              </div>
            )})}
          </div>
        </div>

        {/* Floating User Prompt Input for compare view */}
        <div className="absolute left-4 right-4 bottom-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-md px-4 pt-3 pb-2 relative">
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className={`w-full bg-transparent text-sm text-slate-800 outline-none resize-none pr-10 ${
                isUserPromptExpanded ? 'min-h-[120px]' : 'min-h-[64px]'
              } max-h-40`}
              placeholder={
                lang === 'en'
                  ? 'Type a user message to test...'
                  : '在这里输入用户提示词进行测试...'
              }
            />
            <button
              type="button"
              onClick={() => setIsUserPromptExpanded(prev => !prev)}
              className="absolute top-2 right-2 p-1.5 rounded hover:bg-slate-100 text-slate-400"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleUserPromptSend}
              disabled={isLoading}
              className="absolute bottom-2 right-2 p-2 rounded-full hover:bg-blue-50 text-blue-600 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PlusIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
      <path d="M6 2.5V9.5M2.5 6H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  if (!task) return <div className="p-8 text-center text-slate-400">{t['dash.search']}</div>;

  return (
    <div className="flex flex-col h-full bg-white relative">
      <ModelSelectorModal />
      <TaskListModal />
      <NewTaskModal />
      <SaveVersionModal />
      <VersionListModal />
      <ExportModal />
      <CompareManageModal />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shrink-0 z-10 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsNewTaskOpen(true)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              title={lang === 'en' ? 'New Task' : '新建任务'}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsTaskListOpen(true)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              title={lang === 'en' ? 'Switch Task' : '切换任务'}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {task.title}
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 border border-slate-200 font-normal">
                {task.id}
              </span>
            </h2>
          </div>
          {!isComparing && (
            <>
              <div className="h-6 w-px bg-slate-200 mx-2"></div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsVersionListOpen(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <History className="w-4 h-4 text-slate-400" />
                  <span>{versions[currentVersionIndex]?.version || 'V1'}</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
                <button
                  onClick={() => setIsSaveModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-100 transition-colors flex items-center space-x-1"
                >
                  <Save className="w-3 h-3" />
                  <span>{lang === 'en' ? 'Save' : '保存'}</span>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {lastAutoSaveAt && (
            <span className="text-xs text-slate-400">
              {lang === 'en'
                ? `Auto-saved at ${lastAutoSaveAt}`
                : `已自动保存于 ${lastAutoSaveAt}`}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-1.5 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            <span>{lang === 'en' ? 'Export' : '数据导出'}</span>
          </button>
          {/* Compare Toggle in Header */}
          <button 
            onClick={() => {
              if (isComparing) {
                setIsComparing(false);
              } else {
                setIsCompareManageOpen(true);
              }
            }}
            className={`flex items-center space-x-2 px-3 py-2 rounded text-sm font-medium transition-colors ${isComparing ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Columns className="w-4 h-4" />
            <span>{t['debug.compare']}</span>
          </button>
          {isComparing && (
            <button
              type="button"
              onClick={() => setIsCompareManageOpen(true)}
              className="px-3 py-1.5 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1"
            >
              <History className="w-3 h-3" />
              <span>{lang === 'en' ? 'Manage versions' : '管理比对的版本'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      {isComparing ? (
        <CompareView />
      ) : (
      <div ref={containerRef} className="flex flex-1 overflow-hidden">

        {/* Left: System Prompt & Vars */}
        <div
          className="flex flex-col border-r border-slate-200 h-full flex-shrink-0 transition-[flex-basis] duration-150 ease-in-out"
          style={
            isSystemPromptCollapsed
              ? { flexBasis: '16px', maxWidth: '16px' }
              : { flexBasis: `${layout.left}%`, maxWidth: `${layout.left}%` }
          }
        >
          {isSystemPromptCollapsed ? (
            <button
              onClick={() => setIsSystemPromptCollapsed(false)}
              className="flex-1 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 gap-1"
              title={lang === 'en' ? 'Expand system prompt' : '展开系统提示词'}
            >
              <ChevronRight className="w-3 h-3" />
              <span className="text-[10px]">{lang === 'en' ? 'SYS' : '系统'}</span>
            </button>
          ) : (
            <>
              <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
                    {t['debug.systemPrompt']}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setIsSystemPromptCollapsed(false);
                        setIsVariablesCollapsed(prev => !prev);
                      }}
                      className={`px-2 py-1 rounded text-[11px] border ${
                        !isVariablesCollapsed
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {lang === 'en' ? 'Variables' : '变量'}
                    </button>
                    <button
                      onClick={() => setIsUserNoteCollapsed(prev => !prev)}
                      className={`px-2 py-1 rounded text-[11px] border ${
                        !isUserNoteCollapsed
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {lang === 'en' ? 'Notes' : '笔记'}
                    </button>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setIsSystemPromptCollapsed(true)}
                    className="p-1.5 hover:bg-slate-200 rounded text-slate-500"
                    title={lang === 'en' ? 'Collapse panel' : '收起面板'}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button className="p-1.5 hover:bg-slate-200 rounded text-slate-500" title="Format JSON">
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex-1 relative">
                <textarea
                  className="w-full h-full p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed text-slate-800 bg-white"
                  value={promptContent}
                  onChange={(e) => setPromptContent(e.target.value)}
                  spellCheck={false}
                />
              </div>

              {/* Variable Section */}
              <div
                className="border-t border-slate-200 flex flex-col bg-slate-50/50 transition-[height] duration-150"
                style={isVariablesCollapsed ? { height: '32px' } : { height: '40%' }}
              >
                <div className="p-2 border-b border-slate-200 shrink-0 flex justify-between items-center">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
                      {t['debug.variables']} ({detectedVars.length})
                    </span>
                    <button
                      onClick={() => setIsVariablesCollapsed(!isVariablesCollapsed)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500"
                      title={
                        isVariablesCollapsed
                          ? lang === 'en'
                            ? 'Expand variables'
                            : '展开变量'
                          : lang === 'en'
                          ? 'Collapse variables'
                          : '收起变量'
                      }
                    >
                      {isVariablesCollapsed ? (
                        <ChevronDownIcon className="w-3 h-3" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const name = window.prompt(lang === 'en' ? 'New variable name' : '请输入新的变量名');
                        if (!name) return;
                        const trimmed = name.trim();
                        if (!trimmed) return;
                        setIsVariablesCollapsed(false);
                        setVariables(prev => ({ ...prev, [trimmed]: prev[trimmed] || '' }));
                        setDetectedVars(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
                        setPromptContent(prev => `${prev}\n{{${trimmed}}}`);
                      }}
                      className="flex items-center text-[10px] text-blue-600 hover:underline px-2"
                    >
                      <PlusIcon />
                      <span>{lang === 'en' ? 'Add variable' : '添加变量'}</span>
                    </button>
                    <button className="text-[10px] text-blue-600 hover:underline px-2">
                      {t['debug.autofill']}
                    </button>
                  </div>
                </div>
                {!isVariablesCollapsed && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {(!Array.isArray(detectedVars) || detectedVars.length === 0) ? (
                      <div className="text-xs text-slate-400 italic text-center mt-4">{t['debug.noVars']}</div>
                    ) : (
                      detectedVars.map((v, idx) => (
                        <VariableInput key={`${v}-${idx}`} name={v} />
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Resize handle between left and center */}
        <div
          className="w-2 cursor-col-resize bg-transparent hover:bg-blue-50/60 transition-colors"
          onMouseDown={handleStartResize('left')}
        />

        {/* Center: User Note */}
        <div
          className="flex flex-col border-r border-slate-200 bg-white h-full relative z-0 flex-shrink-0 transition-[flex-basis] duration-150 ease-in-out"
          style={
            isUserNoteCollapsed
              ? { flexBasis: '16px', maxWidth: '16px' }
              : { flexBasis: `${layout.center}%`, maxWidth: `${layout.center}%` }
          }
        >
          {isUserNoteCollapsed ? (
            <button
              onClick={() => setIsUserNoteCollapsed(false)}
              className="flex-1 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 gap-1"
              title={lang === 'en' ? 'Expand note' : '展开备注'}
            >
              <ChevronRight className="w-3 h-3" />
              <span className="text-[10px]">{lang === 'en' ? 'Note' : '笔记'}</span>
            </button>
          ) : (
            <>
              <div className="p-2 bg-slate-50 border-b border-slate-200 shrink-0 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
                  {t['debug.userNote']}
                </span>
                <button
                  onClick={() => setIsUserNoteCollapsed(true)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500"
                  title={lang === 'en' ? 'Collapse panel' : '收起面板'}
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1 p-4">
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 mb-4">
                  <h4 className="text-xs font-bold text-yellow-800 mb-1">Debug Note</h4>
                  <p className="text-xs text-yellow-700 leading-snug">
                    Testing Dr. Li's response to ambiguous symptoms. Ensure empathy score is high.
                  </p>
                </div>

                <label className="text-xs font-semibold text-slate-600 mb-2 block">Comparison Context</label>
                <textarea
                  className="w-full h-64 p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                  placeholder="..."
                ></textarea>
              </div>
            </>
          )}
        </div>

        {/* Resize handle between center and right */}
        <div
          className="w-2 cursor-col-resize bg-transparent hover:bg-blue-50/60 transition-colors"
          onMouseDown={handleStartResize('right')}
        />

        {/* Right: Results */}
        <div
          className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden relative"
          style={{ flexBasis: `${layout.right}%` }}
        >
          <div className="p-2 bg-slate-50 border-b border-slate-200 shrink-0 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
              {t['debug.modelResponse']} {results.length > 0 && `(${results.length})`}
            </span>
            <div className="flex items-center space-x-2">
              {/* Model Trigger Button moved here */}
              <button
                type="button"
                onClick={() => {
                  setResults(prev => [
                    ...prev,
                    {
                      modelId: selectedModel.id,
                      model: selectedModel.name,
                      text: '',
                    },
                  ]);
                }}
                className="px-3 py-1.5 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{lang === 'en' ? 'Add reply' : '添加模型回复'}</span>
              </button>
              <button 
                onClick={isLoading && generationScope === 'all' ? cancelGeneration : handleRun}
                className={`px-3 py-1.5 rounded text-xs flex items-center space-x-1 shadow-sm font-medium transition-all active:scale-95 ${
                  isLoading && generationScope === 'all'
                    ? 'bg-slate-200 text-slate-700 shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                }`}
              >
                {isLoading && generationScope === 'all' ? (
                  <>
                    <X className="w-3 h-3" />
                    <span>{lang === 'en' ? 'Cancel' : '取消生成'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    <span>{t['debug.testPrompt']}</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden pt-4 px-4 pb-28">
            {results.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <Play className="w-12 h-12 mb-4 opacity-20" />
                <span className="text-sm">{t['debug.placeholder']}</span>
              </div>
            ) : (
              <div
                className={`flex-1 flex gap-3 ${
                  expandedResultIndex !== null
                    ? 'justify-center overflow-x-auto pb-2'
                    : 'overflow-x-auto pb-2'
                }`}
              >
                {results.map((res, idx) => {
                  const hasExpanded =
                    expandedResultIndex !== null &&
                    expandedResultIndex >= 0 &&
                    expandedResultIndex < results.length;

                  const isExpanded =
                    (hasExpanded && expandedResultIndex === idx) ||
                    (!hasExpanded && expandedResultIndex === null && results.length === 1);

                  const widthStyle = isExpanded
                    ? { width: '100%' }
                    : { width: resultWidths[idx] ?? defaultResultWidth };

                  return (
                    <React.Fragment key={idx}>
                      <div
                        className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden flex-none transition-all duration-300"
                        style={widthStyle}
                      >
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <span
                          className="text-xs font-bold text-slate-700 max-w-[220px] truncate"
                          title={res.model}
                        >
                          {res.model}
                        </span>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                          {loadingCards.includes(idx) ? (
                            <>
                              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              <span>{lang === 'en' ? 'Running' : '生成中'}</span>
                            </>
                          ) : (
                            <>
                              <span>0.4s</span>
                              <span>|</span>
                              <span>145 tokens</span>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              // 第一点击放大时，如果当前只有 1 个模型回复，则自动追加第二个模型回复
                              if (results.length === 1 && expandedResultIndex === null) {
                                setResults(prev =>
                                  prev.length === 1
                                    ? [
                                        ...prev,
                                        {
                                          modelId: selectedModel.id,
                                          model: selectedModel.name,
                                          text: '',
                                        },
                                      ]
                                    : prev
                                );
                              }
                              setExpandedResultIndex(prev => (prev === idx ? null : idx));
                            }}
                            className="hover:text-slate-600"
                          >
                            {isExpanded ? (
                              <Minimize2 className="w-3 h-3" />
                            ) : (
                              <Maximize2 className="w-3 h-3" />
                            )}
                          </button>
                          <button className="hover:text-blue-600">
                            <Copy className="w-3 h-3" />
                          </button>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setResults(prev => prev.filter((_, i) => i !== idx));
                                setResultWidths(prev => prev.filter((_, i) => i !== idx));
                                if (activeResultIndex !== null && activeResultIndex >= idx) {
                                  setActiveResultIndex(prevIndex =>
                                    prevIndex === null
                                      ? null
                                      : Math.max(0, prevIndex - 1)
                                  );
                                }
                                if (expandedResultIndex !== null && expandedResultIndex >= idx) {
                                  setExpandedResultIndex(prevIndex =>
                                    prevIndex === null
                                      ? null
                                      : Math.max(0, prevIndex - 1)
                                  );
                                }
                              }}
                              className="hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() =>
                            loadingCards.includes(idx) ? cancelGeneration() : handleRunSingle(idx)
                          }
                          className={`px-3 py-1 rounded text-[11px] font-medium shadow-sm ${
                            loadingCards.includes(idx)
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {loadingCards.includes(idx)
                            ? lang === 'en'
                              ? 'Cancel'
                              : '取消生成'
                            : lang === 'en'
                            ? 'Generate reply'
                            : '生成回复'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveResultIndex(idx);
                            setIsModelSelectorOpen(true);
                          }}
                          className="flex items-center space-x-1 px-2 py-1 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all shadow-sm group text-[10px]"
                        >
                          <Zap className="w-3 h-3 text-yellow-400 group-hover:scale-110 transition-transform" />
                          <span className="font-medium max-w-[140px] truncate">
                            {res.model || selectedModel.name}
                          </span>
                          <Settings className="w-3 h-3 opacity-50" />
                        </button>
                      </div>
                      <div className="flex-1 p-4 overflow-y-auto">
                        <ResultContent text={res.text} />
                      </div>
                      </div>
                      {results.length > 1 &&
                        expandedResultIndex === null &&
                        idx < results.length - 1 && (
                      <div
                        onMouseDown={handleResultResizeStart(idx)}
                        className="w-6 cursor-col-resize flex items-stretch"
                      >
                        <div className="mx-auto w-px bg-slate-200 hover:bg-blue-400 rounded-full h-full" />
                      </div>
                        )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* Floating User Prompt Input */}
          <div
            className="absolute left-4 right-4 transition-all duration-300"
            style={{ bottom: userPromptBottom }}
          >
            <div
              className="bg-white border border-slate-200 rounded-2xl shadow-md px-4 pt-3 pb-2 relative"
            >
              {isUserPromptExpanded && (
                <button
                  type="button"
                  onMouseDown={handlePromptDragStart}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-3 rounded-full bg-slate-300 hover:bg-slate-400 cursor-row-resize shadow"
                />
              )}
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className={`w-full bg-transparent text-sm text-slate-800 outline-none resize-none pr-10 ${
                  isUserPromptExpanded ? 'min-h-[140px]' : 'min-h-[64px]'
                } max-h-40`}
                placeholder={
                  lang === 'en'
                    ? 'Type a user message to test...'
                    : '在这里输入用户提示词进行测试...'
                }
              />
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (isUserPromptExpanded) {
                    // shrink: animate back to default bottom and collapse
                    setUserPromptBottom(DEFAULT_PROMPT_BOTTOM);
                    setIsUserPromptExpanded(false);
                  } else {
                    setIsUserPromptExpanded(true);
                  }
                }}
                className="absolute top-2 right-2 p-1.5 rounded hover:bg-slate-100 text-slate-400"
              >
                {isUserPromptExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={handleUserPromptSend}
                disabled={isLoading}
                className="absolute bottom-2 right-2 p-2 rounded-full hover:bg-blue-50 text-blue-600 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
