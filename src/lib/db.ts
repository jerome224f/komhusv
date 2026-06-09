import { Organization, Employee, AttendanceRecord, Advance, Payroll, Department, ActivityLog, SystemNotification } from '../types';

const DB_KEY = 'hrms_data';

interface Database {
  organizations: Organization[];
  departments: Department[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  advances: Advance[];
  payrolls: Payroll[];
  logs: ActivityLog[];
  notifications: SystemNotification[];
}

const defaultDB: Database = {
  organizations: [],
  departments: [],
  employees: [],
  attendance: [],
  advances: [],
  payrolls: [],
  logs: [],
  notifications: [],
};

export const getDB = (): Database => {
  try {
    const data = localStorage.getItem(DB_KEY);
    if (!data) return defaultDB;
    const parsed = JSON.parse(data);
    return {
      ...defaultDB,
      ...parsed,
    };
  } catch {
    return defaultDB;
  }
};

export const saveDB = (db: Database) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

// Generic CRUD
export const table = <T extends { id: string }>(tableName: keyof Database) => {
  return {
    getAll: (): T[] => getDB()[tableName] as unknown as T[],
    getById: (id: string): T | undefined => {
      const all = getDB()[tableName] as unknown as T[];
      return all.find((item) => item.id === id);
    },
    insert: (item: Omit<T, 'id'>): T => {
      const db = getDB();
      const newItem = { ...item, id: crypto.randomUUID() } as T;
      (db[tableName] as unknown as T[]).push(newItem);
      saveDB(db);
      return newItem;
    },
    update: (id: string, item: Partial<T>): T | undefined => {
      const db = getDB();
      const list = db[tableName] as unknown as T[];
      const index = list.findIndex((i) => i.id === id);
      if (index === -1) return undefined;
      const updatedItem = { ...list[index], ...item };
      list[index] = updatedItem;
      saveDB(db);
      return updatedItem;
    },
    delete: (id: string) => {
      const db = getDB();
      db[tableName] = (db[tableName] as unknown as T[]).filter((i) => i.id !== id) as any;
      saveDB(db);
    },
  };
};

export const db = {
  organizations: table<Organization>('organizations'),
  departments: table<Department>('departments'),
  employees: table<Employee>('employees'),
  attendance: table<AttendanceRecord>('attendance'),
  advances: table<Advance>('advances'),
  payrolls: table<Payroll>('payrolls'),
  logs: table<ActivityLog>('logs'),
  notifications: table<SystemNotification>('notifications'),
};
