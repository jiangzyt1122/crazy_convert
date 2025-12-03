import React, { useState } from 'react';
import { Search, Plus, MoreVertical, Clock, User, Tag, X } from 'lucide-react';
import { Task, Language } from '../types';
import { MOCK_TASKS, TRANSLATIONS } from '../constants';

interface DashboardProps {
  onSelectTask: (task: Task) => void;
  lang: Language;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectTask, lang }) => {
  const t = TRANSLATIONS[lang];
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  const openNewTaskModal = () => {
    setNewTaskName('');
    setIsNewTaskModalOpen(true);
  };

  const handleCreateTask = () => {
    const name = newTaskName.trim();
    if (!name) return;
    const task: Task = {
      id: `t-new-${Date.now()}`,
      title: name,
      description: '',
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      author: 'You',
      status: 'active',
      tags: [],
    };
    setIsNewTaskModalOpen(false);
    onSelectTask(task);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-transparent">
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[420px] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {lang === 'en' ? 'New Task' : '新建任务'}
              </h2>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {lang === 'en' ? 'Task Name' : '任务名称'} <span className="text-red-500">*</span>
              </label>
              <input
                value={newTaskName}
                onChange={e => setNewTaskName(e.target.value)}
                maxLength={64}
                placeholder={lang === 'en' ? 'Up to 64 characters' : '不超过64个字符'}
                className="w-full border border-pm-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pm-primary/40 focus:border-pm-primary"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
              >
                {lang === 'en' ? 'Close' : '关闭'}
              </button>
              <button
                onClick={handleCreateTask}
                className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-purple-500 text-white text-xs font-medium hover:from-blue-500 hover:via-blue-500 hover:to-purple-400 shadow-[0_10px_25px_rgba(37,99,235,0.35)]"
              >
                {lang === 'en' ? 'Create' : '确认创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t['dash.title']}</h1>
          <p className="text-slate-500 text-sm mt-1">{t['dash.subtitle']}</p>
        </div>
        <button
          onClick={openNewTaskModal}
          className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-500 hover:from-blue-500 hover:via-blue-500 hover:to-purple-400 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 shadow-[0_12px_30px_rgba(37,99,235,0.45)] transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>{t['dash.newTask']}</span>
        </button>
      </div>

      <div className="bg-pm-surface/90 backdrop-blur-sm p-4 rounded-2xl border border-pm-border shadow-sm mb-6 flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pm-muted w-5 h-5" />
          <input
            type="text"
            placeholder={t['dash.search']}
            className="w-full pl-10 pr-4 py-2 border border-pm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pm-primary/50 focus:border-pm-primary transition-all text-sm bg-white/80"
          />
        </div>
        <div className="flex space-x-2">
          <select className="px-4 py-2 border border-pm-border rounded-lg text-sm bg-white/90 text-slate-700 focus:outline-none focus:border-pm-primary">
            <option>{t['dash.allStatus']}</option>
            <option>{t['dash.active']}</option>
            <option>{t['dash.archived']}</option>
          </select>
          <select className="px-4 py-2 border border-pm-border rounded-lg text-sm bg-white/90 text-slate-700 focus:outline-none focus:border-pm-primary">
            <option>{t['dash.sortDate']}</option>
            <option>{t['dash.sortName']}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {MOCK_TASKS.map((task) => (
          <div
            key={task.id}
            onClick={() => onSelectTask(task)}
            className="bg-pm-surface/95 rounded-2xl border border-pm-border/80 p-6 hover:shadow-xl hover:border-pm-primary/60 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                task.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {task.status === 'active' ? t['dash.active'] : t['dash.archived']}
              </span>
              <button className="text-slate-400 hover:text-slate-600 p-1">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-pm-primary transition-colors">
              {task.title}
            </h3>
            <p className="text-slate-500 text-sm mb-6 line-clamp-2 min-h-[40px]">
              {task.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {task.tags.map(tag => (
                <span key={tag} className="flex items-center text-xs bg-pm-accent-soft/60 text-slate-700 px-2 py-1 rounded-full border border-pm-accent/20">
                  <Tag className="w-3 h-3 mr-1 opacity-50" />
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-4">
              <div className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>{task.author}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{task.updatedAt.split(' ')[0]}</span>
              </div>
            </div>
          </div>
        ))}
        
        {/* New Task Placeholder */}
        <button
          onClick={openNewTaskModal}
          className="border-2 border-dashed border-indigo-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-pm-primary hover:text-pm-primary transition-all bg-pm-primary-soft/40"
        >
          <div className="w-12 h-12 rounded-full bg-white border border-pm-border flex items-center justify-center mb-3 shadow-sm">
            <Plus className="w-6 h-6 text-pm-primary" />
          </div>
          <span className="font-medium text-sm">{t['dash.newTask']}</span>
        </button>
      </div>
    </div>
  );
};
