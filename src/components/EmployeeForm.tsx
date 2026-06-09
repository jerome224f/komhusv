import React, { useState } from 'react';
import { Employee, Organization, Department } from '../types';
import { AlertCircle, Loader2 } from 'lucide-react';

interface EmployeeFormProps {
  initialData?: Employee | null;
  organizations: Organization[];
  departments: Department[];
  onSubmit: (data: Omit<Employee, 'id'>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function EmployeeForm({ initialData, organizations, departments, onSubmit, onCancel, isSaving }: EmployeeFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [salaryType, setSalaryType] = useState(initialData?.salaryType || 'Monthly Salary');
  const [selectedOrgId, setSelectedOrgId] = useState(initialData?.organizationId || '');

  const availableDepts = departments.filter(d => d.organizationId === selectedOrgId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: (formData.get('name') as string).trim(),
      mobileNumber: (formData.get('mobileNumber') as string).trim(),
      gender: formData.get('gender') as any,
      dob: formData.get('dob') as string,
      address: (formData.get('address') as string).trim(),
      aadhaarNumber: (formData.get('aadhaarNumber') as string).trim(),
      organizationId: formData.get('organizationId') as string,
      department: (formData.get('department') as string).trim(),
      designation: (formData.get('designation') as string).trim(),
      joiningDate: formData.get('joiningDate') as string,
      status: formData.get('status') as any,
      salaryType: formData.get('salaryType') as any,
      dailyWageAmount: Number(formData.get('dailyWageAmount')) || 0,
      monthlySalaryAmount: Number(formData.get('monthlySalaryAmount')) || 0,
      overtimeRatePerHour: Number(formData.get('overtimeRatePerHour')) || 0,
    };

    if (!data.name || !data.organizationId) {
      setFormError('Please fill in Name and Organization.');
      return;
    }

    try {
      await onSubmit(data);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving.');
    }
  };

  return (
    <form id="emp-form" onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{formError}</span>
        </div>
      )}
      
      <div>
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-4">Personal Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input name="name" defaultValue={initialData?.name} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number <span className="text-gray-400 font-normal">(Optional)</span></label>
            <input name="mobileNumber" defaultValue={initialData?.mobileNumber} placeholder="10 digits" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
            <select name="gender" defaultValue={initialData?.gender || 'Male'} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth <span className="text-gray-400 font-normal">(Optional)</span></label>
            <input name="dob" type="date" defaultValue={initialData?.dob} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Aadhaar Number <span className="text-gray-400 font-normal">(Optional)</span></label>
            <input name="aadhaarNumber" defaultValue={initialData?.aadhaarNumber} placeholder="12 digits" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Address <span className="text-gray-400 font-normal">(Optional)</span></label>
            <textarea name="address" defaultValue={initialData?.address} rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors resize-y" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-4">Employment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Organization <span className="text-red-500">*</span></label>
            <select 
              name="organizationId" 
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              required 
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors"
            >
              <option value="">Select Organization</option>
              {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select name="status" defaultValue={initialData?.status || 'Active'} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors">
              <option value="Active">Active</option>
              <option value="Resigned">Resigned</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
            <select 
              name="department" 
              defaultValue={initialData?.department || ''} 
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors"
            >
              <option value="">No Department</option>
              {availableDepts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Designation</label>
            <input name="designation" defaultValue={initialData?.designation} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Joining Date <span className="text-gray-400 font-normal">(Optional)</span></label>
            <input name="joiningDate" type="date" defaultValue={initialData?.joiningDate} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-4">Salary Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Salary Type <span className="text-red-500">*</span></label>
            <select 
              name="salaryType" 
              value={salaryType} 
              onChange={(e) => setSalaryType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors"
            >
              <option value="Monthly Salary">Monthly Salary</option>
              <option value="Daily Wage">Daily Wage</option>
            </select>
          </div>
          {salaryType === 'Monthly Salary' ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monthly Salary (₹)</label>
              <input name="monthlySalaryAmount" type="number" defaultValue={initialData?.monthlySalaryAmount} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors" />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Daily Wage (₹)</label>
              <input name="dailyWageAmount" type="number" defaultValue={initialData?.dailyWageAmount} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">OT Rate per hour (₹)</label>
            <input name="overtimeRatePerHour" type="number" defaultValue={initialData?.overtimeRatePerHour} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors" />
          </div>
        </div>
      </div>
      
      <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
        <button 
          type="button" 
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? 'Saving...' : (initialData ? 'Update Employee' : 'Create Employee')}
        </button>
      </div>
    </form>
  );
}
