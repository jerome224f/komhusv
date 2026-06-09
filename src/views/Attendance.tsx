import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Employee, AttendanceStatus } from '../types';
import { Search, Save, Calendar as CalendarIcon, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function Attendance() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendance, setAttendance] = useState<Record<string, { status: AttendanceStatus, otHours: number }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());
  
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      const orgs = await api.organizations.getAll();
      setOrganizations(orgs.filter(o => o.status === 'Active'));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  useEffect(() => {
    if (selectedOrgId && selectedDate) {
      loadAttendanceData();
    } else {
      setEmployees([]);
      setAttendance({});
      setSelectedEmpIds(new Set());
    }
  }, [selectedOrgId, selectedDate]);

  const loadAttendanceData = async () => {
    setIsLoadingData(true);
    try {
      const [allEmps, dateRecords] = await Promise.all([
        api.employees.getAll(),
        api.attendance.getByDateAndOrg(selectedDate, selectedOrgId)
      ]);
      
      const empsInOrg = allEmps.filter(e => e.organizationId === selectedOrgId && e.status === 'Active');
      setEmployees(empsInOrg);
      
      const newMap: Record<string, { status: AttendanceStatus, otHours: number }> = {};
      empsInOrg.forEach(emp => {
        const record = dateRecords.find(r => r.employeeId === emp.id);
        if (record) {
          newMap[emp.id] = { status: record.status, otHours: record.overtimeHours };
        } else {
          newMap[emp.id] = { status: 'Present', otHours: 0 }; // Default
        }
      });
      setAttendance(newMap);
      setSelectedEmpIds(new Set());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleUpdateStatus = (empId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [empId]: { ...prev[empId], status }
    }));
  };

  const handleUpdateOT = (empId: string, otHours: number) => {
    setAttendance(prev => ({
      ...prev,
      [empId]: { ...prev[empId], otHours }
    }));
  };

  const handleSelectRow = (empId: string) => {
    const newSet = new Set(selectedEmpIds);
    if (newSet.has(empId)) {
      newSet.delete(empId);
    } else {
      newSet.add(empId);
    }
    setSelectedEmpIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedEmpIds.size === filteredEmps.length && filteredEmps.length > 0) {
      setSelectedEmpIds(new Set());
    } else {
      setSelectedEmpIds(new Set(filteredEmps.map(emp => emp.id)));
    }
  };

  const markAll = (status: AttendanceStatus) => {
    if (selectedEmpIds.size > 0) {
      const newMap = { ...attendance };
      selectedEmpIds.forEach(empId => {
        newMap[empId] = { ...newMap[empId], status };
      });
      setAttendance(newMap);
      setSelectedEmpIds(new Set());
    } else {
      const newMap = { ...attendance };
      filteredEmps.forEach(emp => {
        newMap[emp.id] = { ...newMap[emp.id], status };
      });
      setAttendance(newMap);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const recordsToSave = employees.map(emp => {
        const stateData = attendance[emp.id];
        return {
          employeeId: emp.id,
          date: selectedDate,
          status: stateData.status,
          overtimeHours: stateData.otHours
        };
      });

      await api.attendance.upsertMultiple(recordsToSave);
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save attendance.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEmps = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.mobileNumber.includes(searchTerm)
  );

  const quickButtons: { label: string, status: AttendanceStatus, shortcut: string }[] = [
    { label: 'Present', status: 'Present', shortcut: 'P' },
    { label: 'Absent', status: 'Absent', shortcut: 'A' },
    { label: 'Half Day', status: 'Half Day', shortcut: 'HD' },
    { label: 'Leave', status: 'Leave', shortcut: 'L' },
  ];

  const statusOptions: AttendanceStatus[] = ['Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Week Off'];
  const statusColors: Record<AttendanceStatus, string> = {
    'Present': 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
    'Absent': 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
    'Half Day': 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200',
    'Leave': 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200',
    'Holiday': 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200',
    'Week Off': 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 shrink-0">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <div className="relative">
              <select 
                value={selectedOrgId} 
                onChange={e => setSelectedOrgId(e.target.value)}
                disabled={isLoadingOrgs}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 disabled:opacity-70 appearance-none"
              >
                <option value="">Select Organization</option>
                {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              {isLoadingOrgs && <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
            </div>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="relative">
              <input 
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {selectedOrgId && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50 shrink-0">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {!isLoadingData && employees.length > 0 && (
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar items-center">
                <span className="text-sm text-gray-500 font-medium whitespace-nowrap mr-2">
                  {selectedEmpIds.size > 0 ? `Mark Selected (${selectedEmpIds.size}):` : 'Quick Mark All:'}
                </span>
                {quickButtons.map(({ label, status, shortcut }) => (
                   <button 
                    key={status}
                    onClick={() => markAll(status)}
                    title={selectedEmpIds.size > 0 ? `Mark ${selectedEmpIds.size} selected as ${label}` : `Mark all as ${label}`}
                    className={`px-3 py-1.5 text-xs font-semibold border rounded-lg shadow-sm transition-all whitespace-nowrap
                      ${statusColors[status].replace('hover:', 'hover:ring-2 hover:ring-offset-1 hover:')}
                    `}
                   >
                     {label}
                   </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-y-auto flex-1 relative">
            {isLoadingData ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-white/80 z-10">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                <p>Loading records...</p>
              </div>
            ) : null}
            
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm ring-1 ring-gray-100 z-10">
                <tr className="text-xs text-gray-600 uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={filteredEmps.length > 0 && selectedEmpIds.size === filteredEmps.length}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-4 font-semibold">Employee</th>
                  <th className="p-4 font-semibold text-center min-w-[320px]">Attendance Status</th>
                  <th className="p-4 font-semibold w-32">OT Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!isLoadingData && filteredEmps.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      {searchTerm ? 'No employees match your search.' : 'No active employees found in this organization.'}
                    </td>
                  </tr>
                ) : (
                  filteredEmps.map(emp => {
                    const currentStatus = attendance[emp.id]?.status || 'Present';
                    const otHours = attendance[emp.id]?.otHours || 0;
                    
                    return (
                      <tr key={emp.id} className={`hover:bg-gray-50/50 ${selectedEmpIds.has(emp.id) ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            onChange={() => handleSelectRow(emp.id)}
                            checked={selectedEmpIds.has(emp.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            <span className="font-medium">{emp.designation || 'No Designation'}</span>
                            {emp.department && <span className="opacity-75"> • {emp.department}</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            <span className="opacity-75">{emp.mobileNumber}</span>
                            <span className="opacity-75"> • ID: {emp.id.slice(0,6).toUpperCase()}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1.5 justify-center flex-wrap">
                            {statusOptions.map(status => {
                              const isActive = currentStatus === status;
                              const isQuickButton = quickButtons.some(qb => qb.status === status);
                              
                              return (
                                <button
                                  key={status}
                                  onClick={() => handleUpdateStatus(emp.id, status)}
                                  title={status}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1 min-w-[48px] sm:min-w-[70px]
                                    ${isActive 
                                      ? statusColors[status] + ' border-transparent ring-2 ring-offset-1 ' + (status === 'Present' ? 'ring-green-500' : status === 'Absent' ? 'ring-red-500' : 'ring-gray-300')
                                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                                >
                                  {isActive && <Check className="w-3 h-3 hidden sm:block" />}
                                  {isQuickButton 
                                    ? <span className="sm:hidden">{quickButtons.find(qb => qb.status === status)?.shortcut}</span>
                                    : <span className="sm:hidden">{status.slice(0, 2).toUpperCase()}</span>
                                  }
                                  <span className="hidden sm:inline-block">
                                    {status.replace('Half Day', 'Half')}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </td>
                        <td className="p-4">
                          <input 
                            type="number"
                            min="0"
                            step="0.5"
                            value={otHours}
                            onChange={(e) => handleUpdateOT(emp.id, Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent hide-arrows bg-white transition-shadow"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
             <button 
              onClick={handleSave}
              disabled={isSaving || isLoadingData || employees.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
             >
               {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
               {isSaving ? 'Saving...' : 'Save Attendance'}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
