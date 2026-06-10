import { randomUUID } from 'crypto';

// Types mimicking database rows
export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: string;
  email: string | null;
}

export interface Organization {
  id: string;
  name: string;
  contact_person: string;
  contact_number: string | null;
  address: string | null;
  email: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  head_of_department: string | null;
  description: string | null;
}

export interface Employee {
  id: string;
  name: string;
  mobile_number: string | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  dob: string | null;
  address: string | null;
  aadhaar_number: string | null;
  organization_id: string;
  department: string | null;
  designation: string | null;
  joining_date: string | null;
  status: 'Active' | 'Resigned' | 'Terminated';
  salary_type: 'Daily Wage' | 'Monthly Salary';
  daily_wage_amount: number;
  monthly_salary_amount: number;
  overtime_rate_per_hour: number;
}

export interface Reliever {
  id: string;
  name: string;
  mobile_number: string | null;
  designation: string | null;
  organization_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: 'Present' | 'Absent' | 'Half Day' | 'Leave' | 'Holiday' | 'Week Off';
  overtime_hours: number;
  reliever_employee_id: string | null;
  reliever_id: string | null;
}

export interface Advance {
  id: string;
  employee_id: string;
  date: string;
  amount: number;
  remarks: string | null;
}

export interface Payroll {
  id: string;
  employee_id: string;
  month: string;
  present_days: number;
  absent_days: number;
  half_days: number;
  overtime_hours: number;
  gross_salary: number;
  advance_deductions: number;
  net_salary: number;
  generated_at: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  description: string | null;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string | null;
  type: 'info' | 'warning' | 'alert';
  timestamp: string;
  read: boolean;
}

// -----------------------------------------------------------------------------
// DEMO MOCK DATASET
// -----------------------------------------------------------------------------
const ORG_1_ID = 'd7b322a3-2c13-4e4f-b67f-94ad7b1df6f2';
const ORG_2_ID = 'e2c455b8-3e24-5f5f-c78a-05be8c2ea7a3';

const DEPT_1_ID = 'a1a1a1a1-1111-1111-1111-111111111111';
const DEPT_2_ID = 'b2b2b2b2-2222-2222-2222-222222222222';
const DEPT_3_ID = 'c3c3c3c3-3333-3333-3333-333333333333';

const EMP_1_ID = 'e1e1e1e1-1111-1111-1111-111111111111';
const EMP_2_ID = 'e2e2e2e2-2222-2222-2222-222222222222';
const EMP_3_ID = 'e3e3e3e3-3333-3333-3333-333333333333';
const EMP_4_ID = 'e4e4e4e4-4444-4444-4444-444444444444';
const EMP_5_ID = 'e5e5e5e5-5555-5555-5555-555555555555';

const REL_1_ID = 'd1d1d1d1-1111-1111-1111-111111111111';
const REL_2_ID = 'd2d2d2d2-2222-2222-2222-222222222222';

export const mockUsers: User[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    password: 'admin123',
    name: 'System Administrator (Demo)',
    role: 'Super Admin',
    email: 'admin@vstaff.com'
  }
];

export const mockOrganizations: Organization[] = [
  {
    id: ORG_1_ID,
    name: 'VStaff Solutions',
    contact_person: 'John Doe',
    contact_number: '+1 555 12345',
    address: '101 Innovation Way, Tech Park',
    email: 'contact@vstaff.com',
    status: 'Active',
    created_at: new Date().toISOString()
  },
  {
    id: ORG_2_ID,
    name: 'Apex Builders Ltd',
    contact_person: 'David Smith',
    contact_number: '+1 555 67890',
    address: '404 Construction Blvd',
    email: 'operations@apexbuilders.com',
    status: 'Active',
    created_at: new Date().toISOString()
  }
];

export const mockDepartments: Department[] = [
  {
    id: DEPT_1_ID,
    organization_id: ORG_1_ID,
    name: 'Engineering',
    head_of_department: 'John Doe',
    description: 'Software and Hardware development team'
  },
  {
    id: DEPT_2_ID,
    organization_id: ORG_1_ID,
    name: 'Human Resources',
    head_of_department: 'Jane Smith',
    description: 'Recruitment and personnel management'
  },
  {
    id: DEPT_3_ID,
    organization_id: ORG_2_ID,
    name: 'Operations',
    head_of_department: 'David Wilson',
    description: 'On-site execution team'
  }
];

export const mockEmployees: Employee[] = [
  {
    id: EMP_1_ID,
    name: 'Amit Kumar',
    mobile_number: '9876543210',
    gender: 'Male',
    dob: '1992-04-15',
    address: 'Flat 402, Skyline Towers, Mumbai',
    aadhaar_number: '1234-5678-9012',
    organization_id: ORG_1_ID,
    department: 'Engineering',
    designation: 'Senior Developer',
    joining_date: '2022-01-10',
    status: 'Active',
    salary_type: 'Monthly Salary',
    daily_wage_amount: 0,
    monthly_salary_amount: 85000,
    overtime_rate_per_hour: 400
  },
  {
    id: EMP_2_ID,
    name: 'Priya Sharma',
    mobile_number: '9876543211',
    gender: 'Female',
    dob: '1995-08-22',
    address: 'Sec 12, H.No 85, Noida',
    aadhaar_number: '2345-6789-0123',
    organization_id: ORG_1_ID,
    department: 'Human Resources',
    designation: 'HR Executive',
    joining_date: '2023-03-15',
    status: 'Active',
    salary_type: 'Monthly Salary',
    daily_wage_amount: 0,
    monthly_salary_amount: 55000,
    overtime_rate_per_hour: 250
  },
  {
    id: EMP_3_ID,
    name: 'Rajesh Patel',
    mobile_number: '9876543212',
    gender: 'Male',
    dob: '1988-11-05',
    address: 'Near Temple Road, Ahmedabad',
    aadhaar_number: '3456-7890-1234',
    organization_id: ORG_1_ID,
    department: 'Engineering',
    designation: 'QA Lead',
    joining_date: '2021-06-01',
    status: 'Active',
    salary_type: 'Monthly Salary',
    daily_wage_amount: 0,
    monthly_salary_amount: 70000,
    overtime_rate_per_hour: 300
  },
  {
    id: EMP_4_ID,
    name: 'Vikram Singh',
    mobile_number: '9876543213',
    gender: 'Male',
    dob: '1990-02-18',
    address: 'Civil Lines, Jaipur',
    aadhaar_number: '4567-8901-2345',
    organization_id: ORG_2_ID,
    department: 'Operations',
    designation: 'Mason Supervisor',
    joining_date: '2024-02-01',
    status: 'Active',
    salary_type: 'Daily Wage',
    daily_wage_amount: 1200,
    monthly_salary_amount: 0,
    overtime_rate_per_hour: 150
  },
  {
    id: EMP_5_ID,
    name: 'Sunita Rao',
    mobile_number: '9876543214',
    gender: 'Female',
    dob: '1993-07-30',
    address: 'Jayanagar 4th Block, Bangalore',
    aadhaar_number: '5678-9012-3456',
    organization_id: ORG_2_ID,
    department: 'Operations',
    designation: 'Safety Coordinator',
    joining_date: '2024-04-10',
    status: 'Active',
    salary_type: 'Daily Wage',
    daily_wage_amount: 1500,
    monthly_salary_amount: 0,
    overtime_rate_per_hour: 200
  }
];

export const mockRelievers: Reliever[] = [
  {
    id: REL_1_ID,
    name: 'Rahul Verma (Reliever)',
    mobile_number: '9999888877',
    designation: 'Backup QA Tester',
    organization_id: ORG_1_ID,
    notes: 'Available on short notice for QA team.',
    created_at: new Date().toISOString()
  },
  {
    id: REL_2_ID,
    name: 'Sohan Lal (Reliever)',
    mobile_number: '9999888876',
    designation: 'Backup Supervisor',
    organization_id: ORG_2_ID,
    notes: 'Handles site supervisor shifts.',
    created_at: new Date().toISOString()
  }
];

// Seed attendance records for today, yesterday, and day before
const todayStr = new Date().toISOString().split('T')[0];
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];
const dayBefore = new Date();
dayBefore.setDate(dayBefore.getDate() - 2);
const dayBeforeStr = dayBefore.toISOString().split('T')[0];

export const mockAttendance: AttendanceRecord[] = [
  // Day before yesterday
  { id: randomUUID(), employee_id: EMP_1_ID, date: dayBeforeStr, status: 'Present', overtime_hours: 2, reliever_employee_id: null, reliever_id: null },
  { id: randomUUID(), employee_id: EMP_2_ID, date: dayBeforeStr, status: 'Present', overtime_hours: 0, reliever_employee_id: null, reliever_id: null },
  { id: randomUUID(), employee_id: EMP_3_ID, date: dayBeforeStr, status: 'Leave', overtime_hours: 0, reliever_employee_id: null, reliever_id: null },
  { id: randomUUID(), employee_id: EMP_4_ID, date: dayBeforeStr, status: 'Present', overtime_hours: 1, reliever_employee_id: null, reliever_id: null },
  { id: randomUUID(), employee_id: EMP_5_ID, date: dayBeforeStr, status: 'Present', overtime_hours: 0, reliever_employee_id: null, reliever_id: null },

  // Yesterday
  { id: randomUUID(), employee_id: EMP_1_ID, date: yesterdayStr, status: 'Present', overtime_hours: 0, reliever_employee_id: null, reliever_id: null },
  { id: randomUUID(), employee_id: EMP_2_ID, date: yesterdayStr, status: 'Present', overtime_hours: 0, reliever_employee_id: null, reliever_id: null },
  { id: randomUUID(), employee_id: EMP_3_ID, date: yesterdayStr, status: 'Present', overtime_hours: 1, reliever_employee_id: null, reliever_id: null },
  { id: randomUUID(), employee_id: EMP_4_ID, date: yesterdayStr, status: 'Absent', overtime_hours: 0, reliever_employee_id: null, reliever_id: REL_2_ID },
  { id: randomUUID(), employee_id: EMP_5_ID, date: yesterdayStr, status: 'Present', overtime_hours: 2, reliever_employee_id: null, reliever_id: null },

  // Today
  { id: randomUUID(), employee_id: EMP_1_ID, date: todayStr, status: 'Present', overtime_hours: 1, reliever_employee_id: null, reliever_id: null },
  { id: randomUUID(), employee_id: EMP_2_ID, date: todayStr, status: 'Present', overtime_hours: 0, reliever_employee_id: null, reliever_id: null },
  { id: randomUUID(), employee_id: EMP_3_ID, date: todayStr, status: 'Absent', overtime_hours: 0, reliever_employee_id: EMP_2_ID, reliever_id: null },
  { id: randomUUID(), employee_id: EMP_4_ID, date: todayStr, status: 'Present', overtime_hours: 0, reliever_employee_id: null, reliever_id: null },
  { id: randomUUID(), employee_id: EMP_5_ID, date: todayStr, status: 'Present', overtime_hours: 0, reliever_employee_id: null, reliever_id: null }
];

export const mockAdvances: Advance[] = [
  { id: randomUUID(), employee_id: EMP_1_ID, date: yesterdayStr, amount: 5000, remarks: 'Salary advance for medical expenses' },
  { id: randomUUID(), employee_id: EMP_4_ID, date: dayBeforeStr, amount: 2000, remarks: 'Personal festival advance' }
];

const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
export const mockPayrolls: Payroll[] = [
  {
    id: randomUUID(),
    employee_id: EMP_1_ID,
    month: currentMonth,
    present_days: 2.5,
    absent_days: 0,
    half_days: 0,
    overtime_hours: 3,
    gross_salary: 86200,
    advance_deductions: 5000,
    net_salary: 81200,
    generated_at: new Date().toISOString()
  },
  {
    id: randomUUID(),
    employee_id: EMP_4_ID,
    month: currentMonth,
    present_days: 2,
    absent_days: 1,
    half_days: 0,
    overtime_hours: 1,
    gross_salary: 2550,
    advance_deductions: 2000,
    net_salary: 550,
    generated_at: new Date().toISOString()
  }
];

export const mockLogs: ActivityLog[] = [
  { id: randomUUID(), timestamp: new Date(Date.now() - 3600000).toISOString(), action: 'LOGIN', description: 'User admin logged in to workforce management portal' },
  { id: randomUUID(), timestamp: new Date(Date.now() - 7200000).toISOString(), action: 'SEED_DATA', description: 'Initialized in-memory fallback database with demo mock records' }
];

export const mockNotifications: SystemNotification[] = [
  { id: randomUUID(), title: 'Demo Database Initialized', message: 'The V-Staff HRMS is running in Demo Mock fallback mode.', type: 'info', timestamp: new Date().toISOString(), read: false },
  { id: randomUUID(), title: 'Absent Employee Today', message: 'Employee Amit Kumar is marked Absent for today.', type: 'warning', timestamp: new Date().toISOString(), read: false }
];

// -----------------------------------------------------------------------------
// IN-MEMORY DATABASE ENGINE
// -----------------------------------------------------------------------------
class InMemoryDB {
  users = [...mockUsers];
  organizations = [...mockOrganizations];
  departments = [...mockDepartments];
  employees = [...mockEmployees];
  relievers = [...mockRelievers];
  attendance = [...mockAttendance];
  advances = [...mockAdvances];
  payrolls = [...mockPayrolls];
  logs = [...mockLogs];
  notifications = [...mockNotifications];

  // Reset database with clean demo mocks
  reset() {
    this.users = [...mockUsers];
    this.organizations = [...mockOrganizations];
    this.departments = [...mockDepartments];
    this.employees = [...mockEmployees];
    this.relievers = [...mockRelievers];
    this.attendance = [...mockAttendance];
    this.advances = [...mockAdvances];
    this.payrolls = [...mockPayrolls];
    this.logs = [...mockLogs];
    this.notifications = [...mockNotifications];
  }
}

export const mockDb = new InMemoryDB();
