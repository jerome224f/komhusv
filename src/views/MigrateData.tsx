import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { AlertTriangle, CheckCircle2, Database, Loader2, Upload, Trash2, Info } from 'lucide-react';

const DB_KEY = 'hrms_data';

interface MigrationResult {
  table: string;
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export function MigrateData() {
  const [localData, setLocalData] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [results, setResults] = useState<MigrationResult[]>([]);
  const [done, setDone] = useState(false);

  const checkLocalData = () => {
    setIsChecking(true);
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setLocalData(parsed);
      } else {
        setLocalData(null);
      }
    } catch (_e) {
      setLocalData(null);
    } finally {
      setIsChecking(false);
    }
  };

  const getCounts = () => {
    if (!localData) return [];
    return [
      { key: 'organizations', label: 'Organizations', count: localData.organizations?.length ?? 0 },
      { key: 'departments',   label: 'Departments',   count: localData.departments?.length ?? 0 },
      { key: 'employees',     label: 'Employees',     count: localData.employees?.length ?? 0 },
      { key: 'attendance',    label: 'Attendance Records', count: localData.attendance?.length ?? 0 },
      { key: 'advances',      label: 'Advances',      count: localData.advances?.length ?? 0 },
      { key: 'payrolls',      label: 'Payrolls',      count: localData.payrolls?.length ?? 0 },
    ].filter(t => t.count > 0);
  };

  const totalRecords = getCounts().reduce((s, t) => s + t.count, 0);

  useEffect(() => {
    checkLocalData();
  }, []);

  const handleMigrate = async () => {
    if (!localData) return;
    setIsMigrating(true);
    setResults([]);
    
    try {
      await api.settings.restore(localData);
      
      const allResults: MigrationResult[] = [
        { table: 'Organizations', total: localData.organizations?.length ?? 0, success: localData.organizations?.length ?? 0, failed: 0, errors: [] },
        { table: 'Departments', total: localData.departments?.length ?? 0, success: localData.departments?.length ?? 0, failed: 0, errors: [] },
        { table: 'Employees', total: localData.employees?.length ?? 0, success: localData.employees?.length ?? 0, failed: 0, errors: [] },
        { table: 'Attendance Records', total: localData.attendance?.length ?? 0, success: localData.attendance?.length ?? 0, failed: 0, errors: [] },
        { table: 'Advances', total: localData.advances?.length ?? 0, success: localData.advances?.length ?? 0, failed: 0, errors: [] },
        { table: 'Payrolls', total: localData.payrolls?.length ?? 0, success: localData.payrolls?.length ?? 0, failed: 0, errors: [] },
      ].filter(t => t.total > 0);

      setResults(allResults);
      setDone(true);
    } catch (e: any) {
      console.error(e);
      alert(`Migration failed: ${e.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearLocalData = () => {
    if (!confirm('Are you sure? This will permanently delete all data stored in your browser\'s local storage. Only do this AFTER successful migration to Supabase.')) return;
    localStorage.removeItem(DB_KEY);
    setLocalData(null);
    setResults([]);
    setDone(false);
    alert('Local data cleared successfully.');
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" />
          Migrate Local Data to Supabase
        </h1>
        <p className="text-gray-500 text-sm">
          Your old data was saved in browser local storage. Use this tool to migrate it to the Supabase cloud database so it appears on all devices and deployments.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">How this works:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>This page reads your old data from <code className="bg-blue-100 px-1 rounded">localStorage</code> (browser storage)</li>
            <li>It uploads each record to Supabase via the API</li>
            <li>After migration, you can safely clear the old local data</li>
          </ol>
        </div>
      </div>

      {/* Local Data Summary */}
      {!localData || totalRecords === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-gray-900">No local data found</p>
          <p className="text-sm text-gray-500 mt-1">Either there was no old data, or it has already been migrated and cleared.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                Found {totalRecords} records in browser storage
              </h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {getCounts().map(t => (
                <li key={t.key} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium text-gray-700">{t.label}</span>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-0.5 rounded-full">{t.count} records</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Before migrating:</p>
              <p className="text-amber-700 mt-1">Make sure organizations exist in Supabase first (they are created as new entries). Employee records depend on organization IDs matching — if you've already added some data in Supabase, there may be duplicates.</p>
            </div>
          </div>

          {/* Migrate Button */}
          {!done && (
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              {isMigrating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Migrating data, please wait...</>
              ) : (
                <><Upload className="w-5 h-5" /> Start Migration to Supabase</>
              )}
            </button>
          )}
        </>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Migration Progress</h2>
          {results.map((res, i) => (
            <div key={i} className={`rounded-xl border p-4 ${res.failed > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {res.failed === 0
                    ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                    : <AlertTriangle className="w-5 h-5 text-red-600" />}
                  <span className="font-semibold text-gray-800">{res.table}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-700 font-bold">✓ {res.success}</span>
                  {res.failed > 0 && <span className="text-red-700 font-bold">✗ {res.failed}</span>}
                  <span className="text-gray-500">/ {res.total}</span>
                </div>
              </div>
              {res.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {res.errors.slice(0, 3).map((err, j) => (
                    <p key={j} className="text-xs text-red-600 bg-red-100 rounded px-2 py-1">{err}</p>
                  ))}
                  {res.errors.length > 3 && <p className="text-xs text-red-500">...and {res.errors.length - 3} more errors</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Done State */}
      {done && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
          <p className="font-bold text-green-900 text-lg">Migration Complete!</p>
          <p className="text-sm text-green-700">All your data has been uploaded to Supabase. You can now safely clear the old local browser storage.</p>
          <button
            onClick={handleClearLocalData}
            className="inline-flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear Old Local Storage Data
          </button>
        </div>
      )}
    </div>
  );
}
