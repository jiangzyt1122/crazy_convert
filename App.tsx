import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PromptDebugger } from './components/PromptDebugger';
import { BatchSynthesis } from './components/BatchSynthesis';
import { ModelManager } from './components/ModelManager';
import { PageView, Task, Language } from './types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TRANSLATIONS } from './constants';

// Error Boundary to catch "unexpected errors"
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">
          <div className="text-center">
             <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
             <button onClick={() => window.location.reload()} className="text-blue-600 hover:underline">Reload Page</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AnalyticsView = ({ lang }: { lang: Language }) => {
  const data = [
    { name: 'Mon', calls: 4000, cost: 240 },
    { name: 'Tue', calls: 3000, cost: 139 },
    { name: 'Wed', calls: 2000, cost: 980 },
    { name: 'Thu', calls: 2780, cost: 390 },
    { name: 'Fri', calls: 1890, cost: 480 },
    { name: 'Sat', calls: 2390, cost: 380 },
    { name: 'Sun', calls: 3490, cost: 430 },
  ];

  return (
    <div className="p-8 h-full bg-slate-50/50 overflow-y-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{TRANSLATIONS[lang]['nav.dataProcessing']}</h1>
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96">
        <h3 className="font-bold text-slate-700 mb-4">API Usage & Cost</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
            <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            <Legend />
            <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} name="API Calls" />
            <Bar dataKey="cost" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Cost ($)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<PageView>(PageView.DASHBOARD);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [language, setLanguage] = useState<Language>('zh'); // Default to Chinese as per request
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setCurrentView(PageView.DEBUG);
  };

  const renderContent = () => {
    switch (currentView) {
      case PageView.DASHBOARD:
        return <Dashboard lang={language} onSelectTask={handleTaskSelect} />;
      case PageView.DEBUG:
        return <PromptDebugger lang={language} task={selectedTask} />;
      case PageView.BATCH:
        return <BatchSynthesis lang={language} />;
      case PageView.MODELS:
        return <ModelManager lang={language} />;
      case PageView.ANALYTICS:
        return <AnalyticsView lang={language} />;
      default:
        return <Dashboard lang={language} onSelectTask={handleTaskSelect} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-transparent text-slate-900">
        <Sidebar 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          lang={language}
          setLang={setLanguage}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        <main className="flex-1 h-full overflow-hidden relative">
          {renderContent()}
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
