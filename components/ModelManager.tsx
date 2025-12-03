import React, { useState } from 'react';
import { TRANSLATIONS } from '../constants';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { Language } from '../types';

interface ModelManagerProps {
  lang: Language;
}

export const ModelManager: React.FC<ModelManagerProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang];

  const [showApiKey, setShowApiKey] = useState(false);

  const [modelName, setModelName] = useState('');
  const [modelAlias, setModelAlias] = useState('');
  const [modelDesc, setModelDesc] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [topP, setTopP] = useState('0.9');
  const [temperature, setTemperature] = useState('0.8');

  const [rows] = useState(
    Array.from({ length: 6 }).map((_, idx) => ({
      id: `01K8SQSC5Z7416DX3H6B5ZY6ZT-${idx}`,
      name: idx % 2 === 0 ? 'Qwen/Qwen2.5-7B-Instruct' : 'deepseek-ai/DeepSeek-R1-0528-Qwen-8B',
      alias: idx % 2 === 0 ? '千问' : 'deepseek 可用模型',
      baseUrl: idx % 2 === 0 ? 'https://api.siliconflow.cn/v1' : 'https://openrouter.ai/api/v1',
      source: idx % 2 === 0 ? '系统默认' : '系统默认',
      createdAt: `2025-10-1${idx} 18:3${idx}:0${idx}`,
    }))
  );

  return (
    <div className="p-8 h-full overflow-y-auto bg-transparent">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t['nav.modelManager']}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {lang === 'en'
            ? 'Register custom models and manage their endpoints.'
            : '在这里新增自定义模型，并管理模型的访问配置和列表。'}
        </p>
      </div>

      {/* New model form */}
      <section className="mb-8 bg-pm-surface/95 rounded-2xl border border-pm-border shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-pm-primary-soft/60">
          <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
          <span className="text-sm font-semibold text-slate-900">
            {lang === 'en' ? 'Add Model' : '新增模型'}
          </span>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {lang === 'en' ? 'Model Name' : '模型名称'} <span className="text-red-500">*</span>
            </label>
            <input
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              className="w-full border border-pm-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pm-primary/30 focus:border-pm-primary placeholder:text-slate-400 bg-white/90"
              placeholder={lang === 'en' ? 'e.g. gpt-3.5-turbo' : '请输入模型名称，例如：gpt-3.5-turbo'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {lang === 'en' ? 'Model Alias' : '模型别名'}
            </label>
            <input
              value={modelAlias}
              onChange={e => setModelAlias(e.target.value)}
              className="w-full border border-pm-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pm-primary/30 focus:border-pm-primary placeholder:text-slate-400 bg-white/90"
              placeholder={lang === 'en' ? 'Optional, a more friendly name' : '例如：千问、深度模型等，便于展示的别名'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {lang === 'en' ? 'Description' : '模型说明'}
            </label>
            <textarea
              value={modelDesc}
              onChange={e => setModelDesc(e.target.value)}
              className="w-full border border-pm-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pm-primary/30 focus:border-pm-primary min-h-[72px] placeholder:text-slate-400 bg-white/90"
              placeholder={
                lang === 'en'
                  ? 'You can briefly describe what this model is good at, any limitations, etc.'
                  : '可以简单描述该模型擅长的场景、注意事项等，方便团队成员统一理解。'
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Base URL <span className="text-red-500">*</span>
            </label>
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="w-full border border-pm-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pm-primary/30 focus:border-pm-primary placeholder:text-slate-400 bg-white/90"
              placeholder="https://api.example.com/v1"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              API Key <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full border border-pm-border rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-pm-primary/30 focus:border-pm-primary placeholder:text-slate-400 bg-white/90"
                placeholder={lang === 'en' ? 'sk-1234567890abcdef' : '例如：sk-1234567890abcdef'}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(v => !v)}
                className="absolute inset-y-0 right-0 px-2 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {lang === 'en' ? 'Top P' : '采样参数 (top p)'} <span className="text-red-500">*</span>
              </label>
              <input
                value={topP}
                onChange={e => setTopP(e.target.value)}
                className="w-full border border-pm-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pm-primary/30 focus:border-pm-primary bg-white/90"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {lang === 'en' ? 'Temperature' : '采样温度 (temperature)'} <span className="text-red-500">*</span>
              </label>
              <input
                value={temperature}
                onChange={e => setTemperature(e.target.value)}
                className="w-full border border-pm-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pm-primary/30 focus:border-pm-primary bg-white/90"
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-center">
          <button
            type="button"
            className="mt-2 inline-flex items-center px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-purple-500 text-white text-sm font-medium shadow-[0_10px_25px_rgba(37,99,235,0.4)] hover:from-blue-500 hover:via-blue-500 hover:to-purple-400"
          >
            <Plus className="w-4 h-4 mr-1" />
            {lang === 'en' ? 'Add Model' : '添加模型'}
          </button>
        </div>
      </section>

      {/* Model list */}
      <section className="bg-pm-surface/95 rounded-2xl border border-pm-border shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-800" />
            <span className="text-sm font-semibold text-slate-800">
              {lang === 'en' ? 'Model List' : '模型列表'}
            </span>
          </div>
          <div className="text-xs text-slate-500 space-x-4">
            <span className="text-slate-800">{lang === 'en' ? 'User models' : '用户自建'}</span>
            <button className="text-blue-600 hover:underline">
              {lang === 'en' ? 'System defaults' : '系统默认'}
            </button>
          </div>
        </div>

        <div className="px-6 py-4 overflow-x-auto">
          <table className="w-full text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="text-left py-2 px-3 font-medium">ID</th>
                <th className="text-left py-2 px-3 font-medium">
                  {lang === 'en' ? 'Model Name' : '模型名称'}
                </th>
                <th className="text-left py-2 px-3 font-medium">
                  {lang === 'en' ? 'Alias' : '模型别名'}
                </th>
                <th className="text-left py-2 px-3 font-medium">Base URL</th>
                <th className="text-left py-2 px-3 font-medium">
                  {lang === 'en' ? 'Source' : '来源'}
                </th>
                <th className="text-left py-2 px-3 font-medium">
                  {lang === 'en' ? 'Created At' : '创建时间'}
                </th>
                <th className="text-left py-2 px-3 font-medium">
                  {lang === 'en' ? 'Action' : '操作'}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="py-2 px-3 text-[11px] text-slate-500">{row.id}</td>
                  <td className="py-2 px-3 text-[11px] text-slate-700">{row.name}</td>
                  <td className="py-2 px-3 text-[11px] text-slate-700">{row.alias}</td>
                  <td className="py-2 px-3 text-[11px] text-slate-500">{row.baseUrl}</td>
                  <td className="py-2 px-3 text-[11px] text-slate-500">{row.source}</td>
                  <td className="py-2 px-3 text-[11px] text-slate-500">{row.createdAt}</td>
                  <td className="py-2 px-3 text-[11px] text-blue-600">
                    <button className="hover:underline">
                      {lang === 'en' ? 'View' : '查看'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
