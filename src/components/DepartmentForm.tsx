import React from 'react';
import { Department, Organization } from '../types';
import { Loader2 } from 'lucide-react';

interface DepartmentFormProps {
  initialData?: Department | null;
  organizations: Organization[];
  onSubmit: (data: Omit<Department, 'id'>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function DepartmentForm({ initialData, organizations, onSubmit, onCancel, isSaving }: DepartmentFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await onSubmit({
      name: formData.get('name') as string,
      organizationId: formData.get('organizationId') as string,
      headOfDepartment: formData.get('headOfDepartment') as string,
      description: formData.get('description') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Organization *</label>
        <select 
          name="organizationId" 
          defaultValue={initialData?.organizationId || ''} 
          required
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors"
        >
          <option value="" disabled>Select Organization</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
        <input 
          name="name" 
          defaultValue={initialData?.name} 
          required 
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors" 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Head of Department</label>
        <input 
          name="headOfDepartment" 
          defaultValue={initialData?.headOfDepartment || ''} 
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors" 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea 
          name="description" 
          defaultValue={initialData?.description || ''} 
          rows={3}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 focus:bg-white transition-colors resize-none" 
        />
      </div>

      <div className="flex gap-3 justify-end pt-4 mt-6 border-t border-gray-100">
        <button 
          type="button" 
          onClick={onCancel} 
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center min-w-[100px]"
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Profile'}
        </button>
      </div>
    </form>
  );
}
