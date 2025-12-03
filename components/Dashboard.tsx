import React from 'react';
import { Search, Plus, MoreVertical, Clock, User, Tag } from 'lucide-react';
import { Task, Language } from '../types';
import { MOCK_TASKS, TRANSLATIONS } from '../constants';

interface DashboardProps {
  onSelectTask: (task: Task) => void;
  lang: Language;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectTask, lang }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50/50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t['dash.title']}</h1>
          <p className="text-slate-500 text-sm mt-1">{t['dash.subtitle']}</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all text-sm font-medium">
          <Plus className="w-4 h-4" />
          <span>{t['dash.newTask']}</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t['dash.search']}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
          />
        </div>
        <div className="flex space-x-2">
          <select className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-600 focus:outline-none focus:border-blue-500">
            <option>{t['dash.allStatus']}</option>
            <option>{t['dash.active']}</option>
            <option>{t['dash.archived']}</option>
          </select>
          <select className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-600 focus:outline-none focus:border-blue-500">
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
            className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                task.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {task.status === 'active' ? t['dash.active'] : t['dash.archived']}
              </span>
              <button className="text-slate-400 hover:text-slate-600 p-1">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
              {task.title}
            </h3>
            <p className="text-slate-500 text-sm mb-6 line-clamp-2 min-h-[40px]">
              {task.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {task.tags.map(tag => (
                <span key={tag} className="flex items-center text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100">
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
        <button className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all bg-slate-50/30">
          <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-sm">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium text-sm">{t['dash.newTask']}</span>
        </button>
      </div>
    </div>
  );
};
