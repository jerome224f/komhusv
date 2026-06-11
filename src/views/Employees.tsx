import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Employee, Organization, Department } from '../types';
import { Plus, Search, User, Pencil, Trash2, ArrowRightLeft, Loader2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { EmployeeForm } from '../components/EmployeeForm';
import { EmployeeProfileModal } from '../components/EmployeeProfileModal';
import { BulkImportModal } from '../components/BulkImportModal';

export function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrg, setFilterOrg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<{ employee: Employee, org: Organization } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empsData, orgsData, deptsData] = await Promise.all([
        api.employees.getAll(),
        api.organizations.getAll(),
        api.departments.getAll()
      ]);
      setEmployees(empsData);
      setOrganizations(orgsData.filter(o => o.status === 'Active'));
      setDepartments(deptsData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data: Omit<Employee, 'id'>) => {
    setIsSaving(true);
    try {
      if (editingId) {
        await api.employees.update(editingId, data);
      } else {
        await api.employees.create(data);
      }
      setIsModalOpen(false);
      setEditingId(null);
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transferringId) return;
    setTransferError(null);
    setIsSaving(true);
    
    const formData = new FormData(e.currentTarget);
    const newOrganizationId = formData.get('newOrganizationId') as string;
    
    try {
      const emp = employees.find(e => e.id === transferringId);
      const newOrg = organizations.find(o => o.id === newOrganizationId);
      
      await api.employees.update(transferringId, { organizationId: newOrganizationId });
      
      await api.logs.create({
        timestamp: new Date().toISOString(),
        action: 'Employee Transfer',
        description: `Transferred ${emp?.name} to organization ${newOrg?.name}`
      });

      setIsTransferModalOpen(false);
      setTransferringId(null);
      await loadData();
    } catch(err: any) {
      setTransferError(err.message || 'Error transferring employee');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      setIsLoading(true);
      try {
        await api.employees.delete(id);
        await loadData();
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    }
  };

  const filteredEmps = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || (emp.mobileNumber || '').includes(searchTerm);
    const matchesOrg = filterOrg ? emp.organizationId === filterOrg : true;
    return matchesSearch && matchesOrg;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search employees..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={filterOrg} 
            onChange={(e) => setFilterOrg(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Organizations</option>
            {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <button 
            onClick={() => setIsBulkImportOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition hover:border-gray-300"
          >
            <FileSpreadsheet className="w-5 h-5 text-green-600" /> Bulk Import
          </button>
          <button 
            onClick={() => { setEditingId(null); setIsModalOpen(true); }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" /> Add Employee
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                <th className="p-4 font-medium">Employee</th>
                <th className="p-4 font-medium">Organization</th>
                <th className="p-4 font-medium">Designation</th>
                <th className="p-4 font-medium">Salary Info</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No employees found.
                  </td>
                </tr>
              ) : (
                filteredEmps.map((emp) => {
                  const org = organizations.find(o => o.id === emp.organizationId) || { id: '', name: 'Unknown', contactPerson: '', contactNumber: '', address: '', email: '', status: 'Active' as const, createdAt: '' };
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{emp.name}</div>
                            <div className="text-xs text-gray-500">{emp.mobileNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-700">
                        {org.name}
                        <div className="text-xs text-gray-500">{emp.department}</div>
                      </td>
                      <td className="p-4 text-gray-700">{emp.designation}</td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900">
                          {emp.salaryType === 'Monthly Salary' ? `₹${emp.monthlySalaryAmount} /mo` : `₹${emp.dailyWageAmount} /day`}
                        </div>
                        <div className="text-xs text-gray-500">{emp.salaryType}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          emp.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button 
                            title="View Profile"
                            onClick={() => setViewingEmployee({ employee: emp, org })} 
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                          >
                            <User className="w-4 h-4" />
                          </button>
                          <button 
                            title="Transfer"
                            onClick={() => { setTransferError(null); setTransferringId(emp.id); setIsTransferModalOpen(true); }} 
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button 
                            title="Edit"
                            onClick={() => { setEditingId(emp.id); setIsModalOpen(true); }} 
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            title="Delete"
                            onClick={() => handleDelete(emp.id)} 
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex flex-col justify-center items-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Transfer Employee</h2>
             </div>
             <div className="p-6">
                {transferError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span className="text-sm">{transferError}</span>
                  </div>
                )}
                <form id="transfer-form" onSubmit={handleTransfer} className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">New Organization</label>
                     <select name="newOrganizationId" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Organization</option>
                        {organizations.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                     </select>
                   </div>
                </form>
             </div>
             <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} disabled={isSaving} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50">Cancel</button>
                <button type="submit" form="transfer-form" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Transfer
                </button>
             </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-start pt-10 sm:items-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-semibold">{editingId ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <EmployeeForm 
                initialData={editingId ? (employees.find(e => e.id === editingId) ?? null) : null}
                organizations={organizations}
                departments={departments}
                onSubmit={handleSave}
                onCancel={() => setIsModalOpen(false)}
                isSaving={isSaving}
              />
            </div>
          </div>
        </div>
      )}

      {viewingEmployee && (
        <EmployeeProfileModal 
          employee={viewingEmployee.employee}
          organization={viewingEmployee.org}
          onClose={() => setViewingEmployee(null)}
        />
      )}

      {isBulkImportOpen && (
        <BulkImportModal 
          organizations={organizations}
          onClose={() => setIsBulkImportOpen(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
