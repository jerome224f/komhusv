import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization } from '../types';
import { Plus, Search, Building2, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { OrganizationForm } from '../components/OrganizationForm';

export function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
      const data = await api.organizations.getAll();
      setOrganizations(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data: Omit<Organization, 'id' | 'createdAt'>) => {
    setIsSaving(true);
    try {
      if (editingId) {
        await api.organizations.update(editingId, data);
      } else {
        await api.organizations.create(data);
      }
      setIsModalOpen(false);
      setEditingId(null);
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this organization?')) {
      setIsLoading(true);
      try {
        await api.organizations.delete(id);
        await loadData();
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    }
  };

  const openEdit = (org: Organization) => {
    setEditingId(org.id);
    setIsModalOpen(true);
  };

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search organizations..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" /> Add Organization
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                <th className="p-4 font-medium">Organization</th>
                <th className="p-4 font-medium">Contact Person</th>
                <th className="p-4 font-medium">Contact Info</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading organizations...
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{org.name}</div>
                          <div className="text-xs text-gray-500">ID: {org.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700">{org.contactPerson}</td>
                    <td className="p-4">
                      <div className="text-sm text-gray-900">{org.contactNumber}</div>
                      <div className="text-xs text-gray-500">{org.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        org.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(org)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(org.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
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
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex flex-col justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-semibold">{editingId ? 'Edit Organization' : 'Add Organization'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <OrganizationForm
                initialData={editingId ? organizations.find(o => o.id === editingId) : null}
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
