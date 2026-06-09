import React, { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle, Save, Database, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

export function Settings() {
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await api.settings.backup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vstaff_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setImportMessage({ type: 'error', text: 'Failed to export database.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setIsImporting(true);
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (data.organizations && data.employees) {
          await api.settings.restore(data);
          setImportMessage({ type: 'success', text: 'Database restored successfully from backup! Data has been updated.' });
        } else {
          setImportMessage({ type: 'error', text: 'Invalid backup file format. Make sure you are using a V-Staff backup file.' });
        }
      } catch (err) {
        console.error('Import failed:', err);
        setImportMessage({ type: 'error', text: 'Failed to restore database from backup file.' });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings &amp; Data Management</h1>
        <p className="text-gray-500">Manage your system database, backups, and preferences.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <Database className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Database Backup &amp; Restore</h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Export Data</h3>
            <p className="text-sm text-gray-500 mb-4">
              Download a complete backup of your V-Staff data as a JSON file. Store this securely to prevent data loss.
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg transition font-medium text-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? 'Exporting...' : 'Export Backup'}
            </button>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Import Data</h3>
            <p className="text-sm text-gray-500 mb-4">
              Restore your V-Staff data from a previously downloaded JSON backup file. This will <strong>OVERWRITE</strong> current data.
            </p>

            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg transition font-medium text-sm disabled:opacity-50"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isImporting ? 'Restoring...' : 'Import Backup'}
            </button>

            {importMessage && (
              <div className={`mt-4 p-3 rounded-lg text-sm flex items-start gap-2 ${importMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {importMessage.type === 'error' ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : <Save className="w-4 h-4 mt-0.5 shrink-0" />}
                <span>{importMessage.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
