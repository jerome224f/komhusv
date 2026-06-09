import React, { useState } from 'react';
import { Organization } from '../types';
import { AlertCircle, Loader2 } from 'lucide-react';

interface OrganizationFormProps {
  initialData?: Organization | null;
  onSubmit: (data: Omit<Organization, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function OrganizationForm({ initialData, onSubmit, onCancel, isSaving }: OrganizationFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: (formData.get('name') as string).trim(),
      contactPerson: (formData.get('contactPerson') as string).trim(),
      contactNumber: (formData.get('contactNumber') as string).trim(),
      address: (formData.get('address') as string).trim(),
      email: (formData.get('email') as string).trim(),
      status: formData.get('status') as 'Active' | 'Inactive',
    };

    if (!data.name || !data.contactPerson || !data.contactNumber || !data.email || !data.address) {
      setFormError('All fields are required.');
      return;
    }
    
    if (!/^\S+@\S+\.\S+$/.test(data.email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (!/^\+?[\d\s-]{10,}$/.test(data.contactNumber)) {
      setFormError('Please enter a valid contact number.');
      return;
    }

    try {
      await onSubmit(data);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving.');
    }
  };

  return (
    <form id="org-form" onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{formError}</span>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name <span className="text-red-500">*</span></label>
        <input 
          name="name" 
          defaultValue={initialData?.name} 
          required 
          placeholder="e.g. Acme Corp"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" 
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person <span className="text-red-500">*</span></label>
          <input 
            name="contactPerson" 
            defaultValue={initialData?.contactPerson} 
            required 
            placeholder="John Doe"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
          <input 
            name="contactNumber" 
            defaultValue={initialData?.contactNumber} 
            required 
            placeholder="+1 234 567 8900"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
          <input 
            name="email" 
            type="email" 
            defaultValue={initialData?.email} 
            required 
            placeholder="contact@acmecorp.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select 
            name="status" 
            defaultValue={initialData?.status || 'Active'} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
        <textarea 
          name="address" 
          defaultValue={initialData?.address} 
          required 
          rows={3} 
          placeholder="123 Business Avenue, Suite 100..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-y" 
        />
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
          {isSaving ? 'Saving...' : (initialData ? 'Update Organization' : 'Create Organization')}
        </button>
      </div>
    </form>
  );
}
