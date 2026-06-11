import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Department } from '../types';
import { Plus, Search, Layers, Pencil, Trash2, Loader2 } from 'lucide-react';
import { DepartmentForm } from '../components/DepartmentForm';

export function DepartmentsView() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [deps, orgs] = await Promise.all([
        api.departments.getAll(),
        api.organizations.getAll()
      ]);
      setDepartments(deps);
      setOrganizations(orgs);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data: Omit<Department, 'id'>) => {
    setIsSaving(true);
    try {
      if (editingId) {
        await api.departments.update(editingId, data);
      } else {
        await api.departments.create(data);
      }
      setIsModalOpen(false);
      setEditingId(null);
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      setIsLoading(true);
      try {
        await api.departments.delete(id);
        await loadData();
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    }
  };

  const openEdit = (dep: Department) => {
    setEditingId(dep.id);
    setIsModalOpen(true);
  };

  const filteredDepts = departments.filter(dep => {
    const matchesSearch = dep.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (dep.headOfDepartment || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrg = selectedOrgId === 'all' || dep.organizationId === selectedOrgId;
    return matchesSearch && matchesOrg;
  });

  const getOrgName = (orgId: string) => organizations.find(o => o.id === orgId)?.name || 'Unknown';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Departments</h1>
        <p className="text-gray-500">Manage departments across organizations.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-1 gap-4 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search departments..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
          >
            <option value="all">All Organizations</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" /> Add Department
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                <th className="p-4 font-medium">Department Name</th>
                <th className="p-4 font-medium">Organization</th>
                <th className="p-4 font-medium">Head of Department</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading departments...
                  </td>
                </tr>
              ) : filteredDepts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No departments found.
                  </td>
                </tr>
              ) : (
                filteredDepts.map((dep) => (
                  <tr key={dep.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div className="font-medium text-gray-900">{dep.name}</div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700">{getOrgName(dep.organizationId)}</td>
                    <td className="p-4 text-gray-700">{dep.headOfDepartment || 'N/A'}</td>
                    <td className="p-4 text-gray-500 text-sm max-w-xs truncate" title={dep.description}>{dep.description || 'N/A'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(dep)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(dep.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-semibold">{editingId ? 'Edit Department' : 'Add Department'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <DepartmentForm
                initialData={editingId ? (departments.find(d => d.id === editingId) ?? null) : null}
                organizations={organizations}
                onSubmit={handleSave}
                onCancel={() => setIsModalOpen(false)}
                isSaving={isSaving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
