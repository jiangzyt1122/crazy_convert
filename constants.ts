import { Task, ModelConfig, PromptVersion, Language } from './types';

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    'nav.taskCenter': 'Task Center',
    'nav.promptDebug': 'Prompt Debug',
    'nav.batchSynthesis': 'Batch Synthesis',
    'nav.modelManager': 'Model Manager',
    'nav.dataProcessing': 'Data Processing',
    'nav.settings': 'Settings',
    
    'dash.title': 'Task Center',
    'dash.subtitle': 'Manage and organize your prompt engineering tasks.',
    'dash.newTask': 'New Task',
    'dash.search': 'Search tasks...',
    'dash.allStatus': 'All Status',
    'dash.active': 'Active',
    'dash.archived': 'Archived',
    'dash.sortDate': 'Sort by Date',
    'dash.sortName': 'Sort by Name',
    
    'debug.systemPrompt': 'SYSTEM PROMPT',
    'debug.userNote': 'USER NOTE / CONTEXT',
    'debug.variables': 'VARIABLES',
    'debug.modelResponse': 'MODEL RESPONSE',
    'debug.compare': 'Version Compare',
    'debug.testPrompt': 'Test Prompt',
    'debug.config': 'Config',
    'debug.save': 'Save',
    'debug.generating': 'Generating response...',
    'debug.placeholder': 'Click "Test Prompt" to generate results',
    'debug.noVars': 'No variables detected. Use {{variable}} syntax.',
    'debug.autofill': 'Auto-fill',
    
    'model.selector.title': 'Model Selection',
    'model.settings.title': 'Model Settings',
    'model.custom': 'Custom Model',
    'model.temp': 'Temperature',
    'model.topP': 'Top P',
    
    'batch.title': 'Batch Synthesis',
    'batch.upload': 'Upload CSV or JSONL',
    'batch.dragDrop': 'Drag and drop files here',
    'batch.recent': 'Recent Batches',
  },
  zh: {
    'nav.taskCenter': '任务中心',
    'nav.promptDebug': 'Prompt 调试',
    'nav.batchSynthesis': '批量合成',
    'nav.modelManager': '模型管理',
    'nav.dataProcessing': '数据处理',
    'nav.settings': '设置1',

    'dash.title': '任务中心',
    'dash.subtitle': '管理和组织您的 Prompt 工程任务。',
    'dash.newTask': '新建任务',
    'dash.search': '搜索任务...',
    'dash.allStatus': '所有状态',
    'dash.active': '进行中',
    'dash.archived': '已归档',
    'dash.sortDate': '按日期排序',
    'dash.sortName': '按名称排序',

    'debug.systemPrompt': '系统提示词 (Sys Prompt)',
    'debug.userNote': '用户笔记 / 上下文',
    'debug.variables': '变量',
    'debug.modelResponse': '模型回答',
    'debug.compare': '版本对比',
    'debug.testPrompt': '运行测试',
    'debug.config': '配置',
    'debug.save': '保存',
    'debug.generating': '正在生成回答...',
    'debug.placeholder': '点击 "运行测试" 生成结果',
    'debug.noVars': '未检测到变量。请使用 {{variable}} 语法。',
    'debug.autofill': '自动填充',

    'model.selector.title': '模型选择',
    'model.settings.title': '模型设置',
    'model.custom': '自定义模型',
    'model.temp': '随机性 (Temperature)',
    'model.topP': '核采样 (Top P)',

    'batch.title': '批量合成',
    'batch.upload': '上传 CSV 或 JSONL',
    'batch.dragDrop': '拖拽文件到此处',
    'batch.recent': '最近批次',
  }
};

export const MOCK_TASKS: Task[] = [
  {
    id: 't-1',
    title: 'Medical Diagnosis Assistant (Dr. Li)',
    description: 'A persona-based prompt for summarizing medical records and suggesting diagnosis.',
    updatedAt: '2023-10-27 10:30:28',
    author: 'Alex Chen',
    status: 'active',
    tags: ['Healthcare', 'Summarization']
  },
  {
    id: 't-2',
    title: 'Customer Support Empathy Bot',
    description: 'Handling angry customer emails with high empathy and solution-oriented language.',
    updatedAt: '2023-10-26 14:15:00',
    author: 'Sarah Jones',
    status: 'active',
    tags: ['Support', 'Email']
  },
  {
    id: 't-3',
    title: 'Code Refactoring Engine',
    description: 'Translating legacy Python 2 code to Python 3 with type hints.',
    updatedAt: '2023-10-25 09:00:12',
    author: 'Mike Ross',
    status: 'archived',
    tags: ['Coding', 'Python']
  }
];

export const MOCK_MODELS: ModelConfig[] = [
  { id: 'm-1', name: 'doubao-1.5-thinking-vision-pro-32k-250428', provider: 'Doubao', temperature: 1.0, topP: 0.7, maxTokens: 4096, description: 'doubao-1.5-thinking-vision-pro-32k-250428' },
  { id: 'm-2', name: 'doubao-1.5-pro-32k-character-250228', provider: 'Doubao', temperature: 0.8, topP: 0.9, maxTokens: 4096, description: 'doubao-1.5-pro-32k-character-250228' },
  { id: 'm-3', name: 'doubao-1.5-thinking-pro-32k-250415', provider: 'Doubao', temperature: 0.6, topP: 0.9, maxTokens: 8192, description: 'doubao-1.5-thinking-pro-32k-250415' },
  { id: 'm-4', name: 'doubao-1.5-vision-pro-32k-250328', provider: 'Doubao', temperature: 0.7, topP: 0.8, maxTokens: 4096, description: 'doubao-1.5-vision-pro-32k-250328' },
  { id: 'm-5', name: 'doubao-seed-1.6-thinking-250715', provider: 'Doubao', temperature: 0.5, topP: 0.85, maxTokens: 2048, description: 'doubao-seed-1.6-thinking-250715' },
];

export const INITIAL_PROMPT_CONTENT = `Your role is to act as {{persona_name}}, a senior specialist in {{field}}.
You are known for being {{trait_1}} and {{trait_2}}.

Please analyze the following user input and provide a professional response.

Context: {{context}}
`;

export const MOCK_VERSIONS: PromptVersion[] = [
  {
    id: 'v2',
    version: 'V2 (Current)',
    timestamp: '2023-10-27 10:30',
    content: INITIAL_PROMPT_CONTENT,
    variables: {
      persona_name: 'Dr. Li',
      field: 'Cardiology',
      trait_1: 'empathetic',
      trait_2: 'highly analytical',
      context: 'Patient reports chest pain after exercise.'
    }
  },
  {
    id: 'v1',
    version: 'V1',
    timestamp: '2023-10-25 14:20',
    content: `Act as a doctor named {{name}}. Answer the patient's question.`,
    variables: {
      name: 'Dr. Smith'
    }
  },
  {
    id: 'v3',
    version: 'V3',
    timestamp: '2023-10-24 18:10',
    content: INITIAL_PROMPT_CONTENT.replace('a senior specialist', 'a seasoned expert'),
    variables: {
      persona_name: 'Dr. Li',
      field: 'Cardiology',
      trait_1: 'patient',
      trait_2: 'detail-oriented',
      context: 'Patient reports chest tightness when climbing stairs.'
    }
  },
  {
    id: 'v4',
    version: 'V4',
    timestamp: '2023-10-23 09:45',
    content: INITIAL_PROMPT_CONTENT.replace('professional response', 'concise and actionable response'),
    variables: {
      persona_name: 'Dr. Li',
      field: 'Internal Medicine',
      trait_1: 'calm',
      trait_2: 'systematic',
      context: 'Patient has intermittent dizziness and fatigue.'
    }
  },
  {
    id: 'v5',
    version: 'V5',
    timestamp: '2023-10-22 16:05',
    content: INITIAL_PROMPT_CONTENT.replace('Please analyze', 'Please carefully analyze'),
    variables: {
      persona_name: 'Dr. Li',
      field: 'Emergency Medicine',
      trait_1: 'decisive',
      trait_2: 'compassionate',
      context: 'Patient reports sudden shortness of breath during rest.'
    }
  }
];
