import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { ActivityLog as ActivityLogEntry } from '../types';
import { Search, History, Loader2, Calendar } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

export function ActivityLogView() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.logs.getAll();
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (log.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Activity Log</h1>
        <p className="text-gray-500">Track critical actions and system events.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search logs by action or description..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
         {isLoading ? (
           <div className="p-12 text-center text-gray-500">
             <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
             Loading activity logs...
           </div>
         ) : filteredLogs.length === 0 ? (
           <div className="p-12 text-center text-gray-500">
             <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
             No logs found matching your search.
           </div>
         ) : (
           <div className="divide-y divide-gray-100">
             {filteredLogs.map(log => (
               <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
                 <div className="mt-1 w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
                    <History className="w-5 h-5 text-indigo-600" />
                 </div>
                 <div className="flex-1">
                   <div className="flex justify-between items-start">
                     <h3 className="font-semibold text-gray-900">{log.action}</h3>
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {log.timestamp && isValid(parseISO(log.timestamp))
                          ? format(parseISO(log.timestamp), 'MMM dd, yyyy HH:mm')
                          : 'N/A'}
                      </span>
                   </div>
                   <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>
    </div>
  );
}
