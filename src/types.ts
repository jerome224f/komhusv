export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
  timestamp: string;
  read: boolean;
}

export type Role = 'Super Admin' | 'HR Executive' | 'Manager';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
}

export interface Organization {
  id: string;
  name: string;
  contactPerson: string;
  contactNumber: string;
  address: string;
  email: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export type EmploymentStatus = 'Active' | 'Resigned' | 'Terminated';
export type SalaryType = 'Daily Wage' | 'Monthly Salary';
export type Gender = 'Male' | 'Female' | 'Other';

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  description: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  headOfDepartment: string;
  description: string;
}

export interface Employee {
  id: string;
  name: string;
  mobileNumber: string;
  gender: Gender;
  dob: string;
  address: string;
  aadhaarNumber: string;
  organizationId: string;
  department: string;
  designation: string;
  joiningDate: string;
  status: EmploymentStatus;
  salaryType: SalaryType;
  dailyWageAmount: number;
  monthlySalaryAmount: number;
  overtimeRatePerHour: number;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half Day' | 'Leave' | 'Holiday' | 'Week Off';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  overtimeHours: number;
}

export interface Advance {
  id: string;
  employeeId: string;
  date: string;
  amount: number;
  remarks: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  presentDays: number;
  absentDays: number;
  halfDays: number;
  overtimeHours: number;
  grossSalary: number;
  advanceDeductions: number;
  netSalary: number;
  generatedAt: string;
}
