import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, MapPin, Building2, Phone, Briefcase, IndianRupee, Loader2 } from 'lucide-react';
import { Employee, Organization, AttendanceRecord } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { api } from '../lib/api';

interface EmployeeProfileModalProps {
  employee: Employee;
  organization: Organization;
  onClose: () => void;
}

export function EmployeeProfileModal({ employee, organization, onClose }: EmployeeProfileModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadAttendance = async () => {
      setIsLoading(true);
      try {
        const data = await api.attendance.getByEmployeeAndMonth(employee.id, selectedMonth);
        setAllAttendance(data);
      } catch (err) {
        console.error('Failed to load attendance:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAttendance();
  }, [employee.id, selectedMonth]);

  const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const monthAttendance = allAttendance.filter(a => a.date.startsWith(selectedMonth));

  const getDayStatus = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return monthAttendance.find(a => a.date === formattedDate)?.status || null;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-700 border-green-200';
      case 'Absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'Half Day': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Leave': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Holiday': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Week Off': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-400 border-gray-100 border-dashed';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'Present': return 'P';
      case 'Absent': return 'A';
      case 'Half Day': return 'HD';
      case 'Leave': return 'L';
      case 'Holiday': return 'H';
      case 'Week Off': return 'WO';
      default: return '-';
    }
  };

  const stats = monthAttendance.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{employee.name}</h2>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {employee.designation}</span>
                <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {organization.name}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8">
          {/* Details Sidebar */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Contact Details</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                  <span>{employee.mobileNumber || 'No mobile provided'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                  <span>{employee.address || 'No address provided'}</span>
                </li>
              </ul>
            </div>

            <div className="h-px bg-gray-100" />

            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Employment Information</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex justify-between items-center">
                  <span className="text-gray-500">Department</span>
                  <span className="font-medium text-gray-900">{employee.department || 'N/A'}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-500">Joining Date</span>
                  <span className="font-medium text-gray-900">
                    {employee.joiningDate ? format(parseISO(employee.joiningDate), 'dd MMM yyyy') : 'N/A'}
                  </span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${employee.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {employee.status}
                  </span>
                </li>
              </ul>
            </div>

            <div className="h-px bg-gray-100" />

            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Compensation Details</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex justify-between items-center">
                  <span className="text-gray-500">Salary Type</span>
                  <span className="font-medium text-gray-900">{employee.salaryType}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-500">Base Pay</span>
                  <span className="font-medium text-gray-900 inline-flex items-center gap-0.5">
                    <IndianRupee className="w-3 h-3" />
                    {employee.salaryType === 'Monthly Salary'
                      ? `${Number(employee.monthlySalaryAmount).toLocaleString()} /mo`
                      : `${Number(employee.dailyWageAmount).toLocaleString()} /day`}
                  </span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-500">Overtime Rate</span>
                  <span className="font-medium text-gray-900 inline-flex items-center gap-0.5">
                    <IndianRupee className="w-3 h-3" />
                    {Number(employee.overtimeRatePerHour).toLocaleString()} /hr
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Calendar Area */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-500" />
                Monthly Attendance
              </h3>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded-sm"></div> <span className="font-medium text-gray-600">Present (P)</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded-sm"></div> <span className="font-medium text-gray-600">Absent (A)</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded-sm"></div> <span className="font-medium text-gray-600">Half Day (HD)</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded-sm"></div> <span className="font-medium text-gray-600">Leave (L)</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded-sm"></div> <span className="font-medium text-gray-600">Holiday (H)</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded-sm"></div> <span className="font-medium text-gray-600">Week Off (WO)</span></div>
            </div>

            {/* Calendar Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500 mb-3">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-1 uppercase tracking-wider">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-14 rounded-lg bg-transparent" />
                  ))}
                  {daysInMonth.map((date) => {
                    const status = getDayStatus(date);
                    const isFuture = date > new Date();
                    return (
                      <div
                        key={date.toISOString()}
                        className={`h-14 flex flex-col justify-center items-center rounded-lg border relative ${status ? getStatusColor(status) : 'bg-gray-50 border-gray-100'} ${isFuture ? 'opacity-40' : ''}`}
                        title={format(date, 'MMM do') + (status ? ` - ${status}` : '')}
                      >
                        <span className={`text-xs font-medium mb-1 ${status ? 'text-gray-900 opacity-80' : 'text-gray-500'}`}>{format(date, 'd')}</span>
                        <span className="text-xs font-bold leading-none">{getStatusLabel(status)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly Summary */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { key: 'Present', label: 'Present', bg: 'bg-green-50 border-green-100', text: 'text-green-700', subtext: 'text-green-600' },
                { key: 'Absent', label: 'Absent', bg: 'bg-red-50 border-red-100', text: 'text-red-700', subtext: 'text-red-600' },
                { key: 'Half Day', label: 'Half Day', bg: 'bg-orange-50 border-orange-100', text: 'text-orange-700', subtext: 'text-orange-600' },
                { key: 'Leave', label: 'Leave', bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', subtext: 'text-blue-600' },
                { key: 'Holiday', label: 'Holiday', bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700', subtext: 'text-purple-600' },
                { key: 'Week Off', label: 'Week Off', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', subtext: 'text-gray-500' },
              ].map(({ key, label, bg, text, subtext }) => (
                <div key={key} className={`${bg} border p-3 rounded-xl text-center`}>
                  <div className={`text-2xl font-bold ${text}`}>{stats[key] || 0}</div>
                  <div className={`text-[10px] uppercase font-bold ${subtext} mt-1 tracking-wider`}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
