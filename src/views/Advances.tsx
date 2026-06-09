import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Advance, Employee } from '../types';
import { Plus, Search, Trash2, Banknote, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function Advances() {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [advData, empData] = await Promise.all([
        api.advances.getAll(),
        api.employees.getAll(),
      ]);
      const sorted = advData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAdvances(sorted);
      setEmployees(empData.filter(e => e.status === 'Active'));
    } catch (err) {
      console.error('Failed to load advances:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      employeeId: formData.get('employeeId') as string,
      date: formData.get('date') as string,
      amount: Number(formData.get('amount')),
      remarks: formData.get('remarks') as string,
    };

    setIsSaving(true);
    try {
      await api.advances.create(data);
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save advance:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this advance record?')) {
      setIsLoading(true);
      try {
        await api.advances.delete(id);
        await loadData();
      } catch (err) {
        console.error('Failed to delete advance:', err);
        setIsLoading(false);
      }
    }
  };

  const filteredAdvances = searchTerm
    ? advances.filter(adv => {
        const emp = employees.find(e => e.id === adv.employeeId);
        return emp?.name.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : advances;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by employee name..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" /> Grant Advance
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Employee</th>
                <th className="p-4 font-medium">Amount (₹)</th>
                <th className="p-4 font-medium">Remarks</th>
                <th className="p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading advances...
                  </td>
                </tr>
              ) : filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No advances found.</td>
                </tr>
              ) : (
                filteredAdvances.map((adv) => {
                  const emp = employees.find(e => e.id === adv.employeeId);
                  return (
                    <tr key={adv.id} className="hover:bg-gray-50">
                      <td className="p-4 text-sm text-gray-600">{adv.date}</td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{emp?.name || 'Unknown Employee'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 font-semibold text-red-600">
                          <Banknote className="w-4 h-4" /> ₹{Number(adv.amount).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-500 max-w-xs truncate">{adv.remarks}</td>
                      <td className="p-4">
                        <button onClick={() => handleDelete(adv.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Grant Advance</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="p-6">
              <form id="adv-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <select name="employeeId" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Employee</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input name="date" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input name="amount" type="number" required min="1" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea name="remarks" rows={2} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
              <button type="submit" form="adv-form" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Grant Advance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
