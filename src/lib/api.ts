import { Organization, Employee, AttendanceRecord, Advance, Payroll, Department, ActivityLog, SystemNotification } from '../types';

// Helper function for making API calls
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  login: async (username: string, password: string): Promise<{ username: string; role: string; name: string }> => {
    return fetchAPI('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  dashboard: {
    getStats: async () => {
      return fetchAPI('/api/dashboard/stats');
    }
  },

  notifications: {
    getAll: async (): Promise<SystemNotification[]> => {
      return fetchAPI('/api/notifications');
    },
    getUnreadCount: async (): Promise<number> => {
      const all = await fetchAPI<SystemNotification[]>('/api/notifications');
      return all.filter(n => !n.read).length;
    },
    markAsRead: async (id: string): Promise<SystemNotification | undefined> => {
      return fetchAPI(`/api/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
      });
    },
    markAllAsRead: async (): Promise<void> => {
      return fetchAPI('/api/notifications/mark-all-read', { method: 'POST' });
    },
    create: async (data: Omit<SystemNotification, 'id'>): Promise<SystemNotification> => {
      return fetchAPI('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },

  organizations: {
    getAll: async (): Promise<Organization[]> => {
      return fetchAPI('/api/organizations');
    },
    getById: async (id: string): Promise<Organization | undefined> => {
      return fetchAPI(`/api/organizations/${id}`);
    },
    create: async (data: Omit<Organization, 'id' | 'createdAt'>): Promise<Organization> => {
      if (!data.name || !data.contactPerson || !data.email) {
        throw new Error("Validation Error: Missing required fields");
      }
      return fetchAPI('/api/organizations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<Organization>): Promise<Organization | undefined> => {
      return fetchAPI(`/api/organizations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<void> => {
      return fetchAPI(`/api/organizations/${id}`, { method: 'DELETE' });
    }
  },

  departments: {
    getAll: async (): Promise<Department[]> => {
      return fetchAPI('/api/departments');
    },
    getByOrgId: async (orgId: string): Promise<Department[]> => {
      const all = await fetchAPI<Department[]>('/api/departments');
      return all.filter(d => d.organizationId === orgId);
    },
    create: async (data: Omit<Department, 'id'>): Promise<Department> => {
      return fetchAPI('/api/departments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<Department>): Promise<Department | undefined> => {
      return fetchAPI(`/api/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<void> => {
      return fetchAPI(`/api/departments/${id}`, { method: 'DELETE' });
    }
  },

  logs: {
    getAll: async (): Promise<ActivityLog[]> => {
      return fetchAPI('/api/logs');
    },
    create: async (data: Omit<ActivityLog, 'id'>): Promise<ActivityLog> => {
      return fetchAPI('/api/logs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },

  employees: {
    getAll: async (): Promise<Employee[]> => {
      return fetchAPI('/api/employees');
    },
    getById: async (id: string): Promise<Employee | undefined> => {
      return fetchAPI(`/api/employees/${id}`);
    },
    create: async (data: Omit<Employee, 'id'>): Promise<Employee> => {
      return fetchAPI('/api/employees', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<Employee>): Promise<Employee | undefined> => {
      return fetchAPI(`/api/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<void> => {
      return fetchAPI(`/api/employees/${id}`, { method: 'DELETE' });
    }
  },

  attendance: {
    getByDateAndOrg: async (date: string, orgId: string): Promise<AttendanceRecord[]> => {
      return fetchAPI(`/api/attendance?date=${date}`);
    },
    getByEmployee: async (employeeId: string): Promise<AttendanceRecord[]> => {
      return fetchAPI(`/api/attendance?employeeId=${employeeId}`);
    },
    upsertMultiple: async (records: Omit<AttendanceRecord, 'id'>[]): Promise<void> => {
      return fetchAPI('/api/attendance/upsert', {
        method: 'POST',
        body: JSON.stringify(records),
      });
    }
  },

  advances: {
    getAll: async (): Promise<Advance[]> => {
      return fetchAPI('/api/advances');
    },
    create: async (data: Omit<Advance, 'id'>): Promise<Advance> => {
      return fetchAPI('/api/advances', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<void> => {
      return fetchAPI(`/api/advances/${id}`, { method: 'DELETE' });
    }
  },

  payrolls: {
    getAll: async (month?: string): Promise<Payroll[]> => {
      const url = month ? `/api/payrolls?month=${month}` : '/api/payrolls';
      return fetchAPI(url);
    },
    upsert: async (data: Omit<Payroll, 'id'>): Promise<Payroll> => {
      return fetchAPI('/api/payrolls', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },

  settings: {
    backup: async () => {
      return fetchAPI('/api/settings/backup');
    },
    restore: async (data: any) => {
      return fetchAPI('/api/settings/restore', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  }
};
