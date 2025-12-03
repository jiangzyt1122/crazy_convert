import React from 'react';
import { LayoutDashboard, Terminal, Cpu, Settings, FileText, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageView, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface SidebarProps {
  currentView: PageView;
  onChangeView: (view: PageView) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  lang,
  setLang,
  isCollapsed,
  setIsCollapsed,
}) => {
  const t = TRANSLATIONS[lang];

  const menuItems = [
    { id: PageView.DASHBOARD, label: t['nav.taskCenter'], icon: LayoutDashboard },
    { id: PageView.DEBUG, label: t['nav.promptDebug'], icon: Terminal },
    { id: PageView.MODELS, label: t['nav.modelManager'], icon: Cpu },
  ];

  return (
    <div
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-200 flex flex-col h-full border-r border-slate-800/80 shrink-0 transition-all duration-300 shadow-xl`}
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-tr from-blue-500 via-sky-500 to-purple-500 shadow-lg shadow-blue-900/40">
            <FileText className="text-white w-5 h-5" />
          </div>
          {!isCollapsed && (
            <span className="text-white font-bold text-lg tracking-tight truncate">
              PromptMaster
            </span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-2 w-7 h-7 rounded-full border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors bg-slate-900/60"
          title={isCollapsed ? (lang === 'en' ? 'Expand sidebar' : '展开侧边栏') : (lang === 'en' ? 'Collapse sidebar' : '收起侧边栏')}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-purple-500 text-white shadow-lg shadow-blue-900/60 ring-1 ring-blue-400/60'
                  : 'hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
         {/* Language Toggle */}
         <button 
           onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
           className="flex items-center space-x-3 text-slate-400 hover:text-white transition-colors w-full px-4 py-2 mb-2"
         >
           <Globe className="w-5 h-5" />
           {!isCollapsed && (
             <span className="text-sm">{lang === 'en' ? '中文' : 'English'}</span>
           )}
         </button>

        <button className="flex items-center space-x-3 text-slate-400 hover:text-white transition-colors w-full px-4 py-2">
          <Settings className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm">{t['nav.settings']}</span>}
        </button>
        {!isCollapsed && (
          <div className="mt-4 flex items-center space-x-3 px-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-md shadow-blue-900/40"></div>
            <div>
              <div className="text-xs text-white font-medium">Demo Admin</div>
              <div className="text-[10px] text-slate-500">admin@company.com</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
