export enum PageView {
  DASHBOARD = 'DASHBOARD',
  DEBUG = 'DEBUG',
  BATCH = 'BATCH',
  MODELS = 'MODELS',
  ANALYTICS = 'ANALYTICS'
}

export type Language = 'en' | 'zh';

export interface Variable {
  name: string;
  value: string;
}

export interface PromptVersion {
  id: string;
  version: string;
  timestamp: string;
  content: string;
  variables: Record<string, string>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
  author: string;
  status: 'active' | 'archived';
  tags: string[];
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Google' | 'Anthropic' | 'Local' | 'Doubao';
  temperature: number;
  topP: number;
  maxTokens: number;
  icon?: string;
  description?: string;
}