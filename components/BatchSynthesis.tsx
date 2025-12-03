import React from 'react';
import { UploadCloud, FileText, CheckCircle, Clock } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface BatchSynthesisProps {
  lang: Language;
}

export const BatchSynthesis: React.FC<BatchSynthesisProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="p-8 h-full overflow-y-auto bg-transparent">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t['batch.title']}</h1>
      
      {/* Upload Area */}
      <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-10 bg-white/90 mb-8 text-center hover:bg-pm-primary-soft/80 transition-colors cursor-pointer group shadow-sm">
         <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform bg-gradient-to-tr from-blue-500/10 via-blue-500/5 to-purple-500/15">
           <UploadCloud className="w-8 h-8 text-blue-600" />
         </div>
         <h3 className="text-lg font-medium text-slate-900">{t['batch.upload']}</h3>
         <p className="text-slate-500 text-sm mt-1">{t['batch.dragDrop']}</p>
      </div>

      <div className="bg-pm-surface/95 rounded-2xl border border-pm-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-pm-primary-soft/60">
          <h3 className="font-bold text-slate-800">{t['batch.recent']}</h3>
          <button className="text-xs text-pm-primary font-medium hover:text-pm-accent">View All History</button>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Batch ID</th>
              <th className="px-6 py-3">File Name</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Progress</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-6 py-4 font-mono text-slate-600">#BATCH-2931</td>
              <td className="px-6 py-4 flex items-center text-slate-900 font-medium">
                <FileText className="w-4 h-4 mr-2 text-slate-400" />
                medical_cases_v2.csv
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" /> Completed
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-green-500 w-full"></div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">500/500</span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">Download Results</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
