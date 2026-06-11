import { supabase } from './supabase';
import {
  Organization, Employee, AttendanceRecord, Advance,
  Payroll, Department, ActivityLog, SystemNotification, Reliever, User
} from '../types';

// Utility to convert camelCase to snake_case
const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// Utility to convert snake_case to camelCase
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

// Recursively convert object keys
const convertKeys = (obj: any, converter: (s: string) => string): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => convertKeys(v, converter));
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((result, key) => {
      result[converter(key)] = convertKeys(obj[key], converter);
      return result;
    }, {} as any);
  }
  return obj;
};

const toDB = (item: any) => {
  const snakeCased = convertKeys(item, toSnakeCase);
  const sanitize = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
      return Object.keys(obj).reduce((res, key) => {
        const val = obj[key];
        if (typeof val === 'string') {
          const trimmed = val.trim();
          const lower = trimmed.toLowerCase();
          if (trimmed === '' || lower === 'dd-mm-yyyy' || lower === 'invalid date') {
            res[key] = null;
          } else {
            // Auto-convert standard DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD
            const matchDash = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
            const matchSlash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (matchDash) {
              res[key] = `${matchDash[3]}-${matchDash[2].padStart(2, '0')}-${matchDash[1].padStart(2, '0')}`;
            } else if (matchSlash) {
              res[key] = `${matchSlash[3]}-${matchSlash[2].padStart(2, '0')}-${matchSlash[1].padStart(2, '0')}`;
            } else {
              res[key] = trimmed;
            }
          }
        } else {
          res[key] = sanitize(val);
        }
        return res;
      }, {} as any);
    }
    return obj;
  };
  return sanitize(snakeCased);
};

const fromDB = (item: any) => convertKeys(item, toCamelCase);

const createApiTable = <T extends { id: string }>(tableName: string) => {
  return {
    getAll: async (): Promise<T[]> => {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) { console.error(`Error fetching ${tableName}:`, error); return []; }
      return data ? data.map(fromDB) : [];
    },
    getById: async (id: string): Promise<T | undefined> => {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) { console.error(`Error fetching ${tableName} by id:`, error); return undefined; }
      return data ? fromDB(data) : undefined;
    },
    insert: async (item: Omit<T, 'id'>): Promise<T> => {
      const { data, error } = await supabase.from(tableName).insert(toDB(item)).select().single();
      if (error) { console.error(`Error inserting into ${tableName}:`, error); throw error; }
      return fromDB(data);
    },
    create: async (item: Omit<T, 'id'>): Promise<T> => {
      const { data, error } = await supabase.from(tableName).insert(toDB(item)).select().single();
      if (error) { console.error(`Error creating in ${tableName}:`, error); throw error; }
      return fromDB(data);
    },
    update: async (id: string, item: Partial<T>): Promise<T | undefined> => {
      const { data, error } = await supabase.from(tableName).update(toDB(item)).eq('id', id).select().single();
      if (error) { console.error(`Error updating ${tableName}:`, error); return undefined; }
      return data ? fromDB(data) : undefined;
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) { console.error(`Error deleting from ${tableName}:`, error); throw error; }
    },
  };
};

// ─── Payroll ────────────────────────────────────────────────────────────────
const payrollsTable = {
  ...createApiTable<Payroll>('payrolls'),
  getAll: async (month?: string): Promise<Payroll[]> => {
    let query = supabase.from('payrolls').select('*');
    if (month) query = query.eq('month', month);
    const { data, error } = await query;
    if (error) { console.error('Error fetching payrolls:', error); return []; }
    return data ? data.map(fromDB) : [];
  },
  upsert: async (item: Partial<Payroll>): Promise<Payroll> => {
    let finalItem = { ...item };
    if (!finalItem.id && finalItem.employeeId && finalItem.month) {
      const { data } = await supabase
        .from('payrolls')
        .select('id')
        .eq('employee_id', finalItem.employeeId)
        .eq('month', finalItem.month)
        .single();
      if (data) {
        finalItem.id = data.id;
      }
    }
    const { data, error } = await supabase
      .from('payrolls')
      .upsert(toDB(finalItem))
      .select().single();
    if (error) throw error;
    return fromDB(data);
  },
};

// ─── Attendance ──────────────────────────────────────────────────────────────
const attendanceTable = {
  ...createApiTable<AttendanceRecord>('attendance_records'),
  getByDateAndOrg: async (datePrefix: string, orgId: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance_records').select('*, emp:employees!attendance_records_employee_id_fkey!inner(organization_id)');
    if (datePrefix.length === 10) {
      query = query.eq('date', datePrefix);
    } else {
      const nextMonth = new Date(datePrefix + '-01');
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const endOfMonthStr = new Date(nextMonth.getTime() - 86400000).toISOString().split('T')[0];
      query = query.gte('date', `${datePrefix}-01`).lte('date', endOfMonthStr);
    }
    if (orgId) {
      query = query.eq('emp.organization_id', orgId);
    }
    const { data, error } = await query;
    if (error) { console.error('Error fetching attendance by date/org:', error); return []; }
    
    if (!data) return [];
    
    // Deduplicate in case multiple records exist for the same employee+date
    const map = new Map<string, any>();
    for (const row of data) {
      const d = typeof row.date === 'string' ? row.date.split('T')[0] : row.date;
      map.set(`${row.employee_id}_${d}`, row);
    }
    return Array.from(map.values()).map(fromDB);
  },
  upsertMultiple: async (records: Partial<AttendanceRecord>[]): Promise<void> => {
    if (!records.length) return;

    // Fetch existing records to inject their IDs and avoid relying on a custom unique constraint
    const employeeIds = [...new Set(records.map(r => r.employeeId).filter(Boolean))];
    const dates = [...new Set(records.map(r => r.date).filter(Boolean))];

    if (employeeIds.length > 0 && dates.length > 0) {
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id, employee_id, date')
        .in('employee_id', employeeIds)
        .in('date', dates);

      if (existing) {
        const existingMap = new Map(
          existing.map(e => {
            const dateStr = typeof e.date === 'string' ? e.date.split('T')[0] : e.date;
            return [`${e.employee_id}_${dateStr}`, e.id];
          })
        );
        records.forEach(r => {
          if (!r.id) {
            const rDateStr = typeof r.date === 'string' ? r.date.split('T')[0] : r.date;
            // Handle both camelCase and snake_case in case record wasn't fully converted
            const empId = r.employeeId || (r as any).employee_id;
            const key = `${empId}_${rDateStr}`;
            if (existingMap.has(key)) {
              r.id = existingMap.get(key);
            }
          }
        });
      }
    }

    // Crucial fix: Supabase/PostgREST requires all objects in an array to have the exact same keys.
    // If some objects have an 'id' and others don't, it will either throw an error or ignore the 'id's.
    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    records.forEach(r => {
      if (!r.id) {
        r.id = generateUUID();
      }
    });

    const { error } = await supabase
      .from('attendance_records')
      .upsert(records.map(toDB));
    if (error) throw error;
  },
  getByEmployeeAndMonth: async (empId: string, month: string): Promise<AttendanceRecord[]> => {
    const nextMonth = new Date(month + '-01');
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endOfMonthStr = new Date(nextMonth.getTime() - 86400000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance_records').select('*')
      .eq('employee_id', empId)
      .gte('date', `${month}-01`)
      .lte('date', endOfMonthStr);
    if (error) return [];
    
    if (!data) return [];
    
    // Deduplicate
    const map = new Map<string, any>();
    for (const row of data) {
      const d = typeof row.date === 'string' ? row.date.split('T')[0] : row.date;
      map.set(`${row.employee_id}_${d}`, row);
    }
    return Array.from(map.values()).map(fromDB);
  },
  getRelievers: async (month: string): Promise<AttendanceRecord[]> => {
    const nextMonth = new Date(month + '-01');
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endOfMonthStr = new Date(nextMonth.getTime() - 86400000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance_records').select('*')
      .or('reliever_id.not.is.null,reliever_employee_id.not.is.null')
      .gte('date', `${month}-01`)
      .lte('date', endOfMonthStr);
    if (error) return [];
    
    if (!data) return [];
    
    // Deduplicate
    const map = new Map<string, any>();
    for (const row of data) {
      const d = typeof row.date === 'string' ? row.date.split('T')[0] : row.date;
      map.set(`${row.employee_id}_${d}`, row);
    }
    return Array.from(map.values()).map(fromDB);
  },
};

// ─── Notifications ────────────────────────────────────────────────────────────
const notificationsTable = {
  ...createApiTable<SystemNotification>('system_notifications'),
  markAsRead: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('system_notifications').update({ read: true }).eq('id', id);
    if (error) console.error('Error marking notification as read:', error);
  },
  markAllAsRead: async (): Promise<void> => {
    const { error } = await supabase
      .from('system_notifications').update({ read: true }).eq('read', false);
    if (error) console.error('Error marking all notifications as read:', error);
  },
};

// ─── Settings ────────────────────────────────────────────────────────────────
const settingsTable = {
  backup: async (): Promise<any> => {
    const [orgs, depts, emps, atts, advs, pays] = await Promise.all([
      supabase.from('organizations').select('*'),
      supabase.from('departments').select('*'),
      supabase.from('employees').select('*'),
      supabase.from('attendance_records').select('*'),
      supabase.from('advances').select('*'),
      supabase.from('payrolls').select('*'),
    ]);
    return {
      organizations: orgs.data || [],
      departments: depts.data || [],
      employees: emps.data || [],
      attendance: atts.data || [],
      advances: advs.data || [],
      payrolls: pays.data || [],
      timestamp: new Date().toISOString(),
    };
  },
  restore: async (data: any): Promise<void> => {
    if (!data) return;
    if (data.organizations && data.organizations.length > 0) {
      const { error } = await supabase.from('organizations').upsert(data.organizations.map(toDB));
      if (error) throw error;
    }
    if (data.departments && data.departments.length > 0) {
      const { error } = await supabase.from('departments').upsert(data.departments.map(toDB));
      if (error) throw error;
    }
    if (data.employees && data.employees.length > 0) {
      const { error } = await supabase.from('employees').upsert(data.employees.map(toDB));
      if (error) throw error;
    }
    const attendanceRecords = data.attendance || data.attendanceRecords || [];
    if (attendanceRecords.length > 0) {
      const { error } = await supabase.from('attendance_records').upsert(attendanceRecords.map(toDB));
      if (error) throw error;
    }
    if (data.advances && data.advances.length > 0) {
      const { error } = await supabase.from('advances').upsert(data.advances.map(toDB));
      if (error) throw error;
    }
    if (data.payrolls && data.payrolls.length > 0) {
      const { error } = await supabase.from('payrolls').upsert(data.payrolls.map(toDB));
      if (error) throw error;
    }
  },
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
const dashboardTable = {
  getStats: async (): Promise<any> => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0, 7); // YYYY-MM
    
    const nextMonthDt = new Date(thisMonth + '-01');
    nextMonthDt.setMonth(nextMonthDt.getMonth() + 1);
    const endOfMonthStr = new Date(nextMonthDt.getTime() - 86400000).toISOString().split('T')[0];

    const [
      { count: totalOrganizations },
      { count: totalEmployees },
      { count: presentToday },
      { count: absentTodayCount },
      { count: leaveToday },
      { count: totalRelievers },
      { data: relieversRaw },
      { data: absentRaw },
      { data: orgsRaw },
      { data: empsRaw },
      { data: payrollsRaw },
      { data: heatmapRaw },
    ] = await Promise.all([
      supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'Present'),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'Absent'),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'Leave'),
      supabase.from('relievers').select('*', { count: 'exact', head: true }),
      supabase.from('attendance_records').select('reliever_id').eq('date', today).not('reliever_id', 'is', null),
      supabase.from('attendance_records').select('employee_id, reliever_id, reliever_employee_id').eq('date', today).eq('status', 'Absent'),
      supabase.from('organizations').select('id, name').eq('status', 'Active'),
      supabase.from('employees').select('id, name, mobile_number, organization_id, status').eq('status', 'Active'),
      supabase.from('payrolls').select('net_salary').eq('month', thisMonth),
      supabase.from('attendance_records').select('date, employee_id, status').gte('date', `${thisMonth}-01`).lte('date', endOfMonthStr),
    ]);

    // Build absent employees list
    const orgsMap: Record<string, any> = {};
    (orgsRaw || []).forEach((o: any) => { orgsMap[o.id] = o; });
    const empsMap: Record<string, any> = {};
    (empsRaw || []).forEach((e: any) => { empsMap[e.id] = e; });

    const absentEmployeesToday = (absentRaw || []).map((a: any) => {
      const emp = empsMap[a.employee_id];
      if (!emp) return null;
      const org = orgsMap[emp.organization_id];
      let reliever = null;
      if (a.reliever_employee_id && empsMap[a.reliever_employee_id]) {
        const rel = empsMap[a.reliever_employee_id];
        reliever = { name: rel.name, type: 'Internal', mobileNumber: rel.mobile_number };
      }
      return emp && org ? {
        employee: fromDB(emp),
        org: fromDB(org),
        reliever,
      } : null;
    }).filter(Boolean);

    // Payroll cost this month
    const payrollCost = (payrollsRaw || []).reduce((sum: number, p: any) => sum + (Number(p.net_salary) || 0), 0);

    // Heatmap: group attendance by date
    const dayMap: Record<string, { present: number; total: number }> = {};
    const activeEmpCount = totalEmployees || 0;
    (heatmapRaw || []).forEach((r: any) => {
      if (!dayMap[r.date]) dayMap[r.date] = { present: 0, total: 0 };
      dayMap[r.date].total++;
      if (r.status === 'Present' || r.status === 'Half Day') dayMap[r.date].present++;
    });

    const year = parseInt(thisMonth.split('-')[0]);
    const month = parseInt(thisMonth.split('-')[1]) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = new Date();

    const heatmapData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      const date = `${thisMonth}-${day}`;
      const isPast = new Date(date) <= todayDate;
      const dayData = dayMap[date];
      const percentage = isPast && activeEmpCount > 0 && dayData
        ? (dayData.present / activeEmpCount) * 100
        : isPast && activeEmpCount > 0 ? 0 : null;
      return {
        date,
        percentage: percentage !== null ? Math.min(100, percentage) : null,
        label: isPast ? (percentage !== null ? `${Math.round(percentage)}% present` : 'No data') : 'Future',
      };
    });

    return {
      totalOrganizations: totalOrganizations || 0,
      totalEmployees: totalEmployees || 0,
      presentToday: presentToday || 0,
      absentToday: absentTodayCount || 0,
      leaveToday: leaveToday || 0,
      payrollCost,
      totalRelievers: totalRelievers || 0,
      relieversToday: (relieversRaw || []).length,
      absentEmployeesToday,
      heatmapData,
    };
  },
};

// ─── Exports ─────────────────────────────────────────────────────────────────
export const api = {
  organizations: createApiTable<Organization>('organizations'),
  departments: createApiTable<Department>('departments'),
  employees: createApiTable<Employee>('employees'),
  attendance: attendanceTable,
  advances: createApiTable<Advance>('advances'),
  payrolls: payrollsTable,
  logs: createApiTable<ActivityLog>('activity_logs'),
  notifications: notificationsTable,
  relievers: createApiTable<Reliever>('relievers'),
  users: createApiTable<User>('users'),
  settings: settingsTable,
  dashboard: dashboardTable,
  login: async (username: string, password: string): Promise<any> => {
    const { data, error } = await supabase
      .from('users').select('*')
      .eq('username', username).eq('password', password).single();
    if (error || !data) throw new Error('Invalid credentials');
    return fromDB(data);
  },
};
