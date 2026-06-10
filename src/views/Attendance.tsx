import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Employee, AttendanceStatus, AttendanceRecord } from '../types';
import { 
  Search, Save, Calendar as CalendarIcon, Check, Loader2, Download, 
  User, Grid, Info, RefreshCw, Users, X, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export function Attendance() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'daily' | 'register' | 'individual' | 'relievers'>('daily');

  // Shared Data
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  // Syncing indicator state
  const [isSyncing, setIsSyncing] = useState(false);

  // ---------------------------------------------------------------------------
  // TAB 1: DAILY MARKING STATES
  // ---------------------------------------------------------------------------
  const [dailyDate, setDailyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dailyEmployees, setDailyEmployees] = useState<Employee[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<Record<string, { status: AttendanceStatus; otHours: number; relieverId: string }>>({});
  const [dailySearch, setDailySearch] = useState('');
  const [dailySelectedEmpIds, setDailySelectedEmpIds] = useState<Set<string>>(new Set());
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);
  const [isSavingDaily, setIsSavingDaily] = useState(false);

  // ---------------------------------------------------------------------------
  // TAB 2: MONTHLY REGISTER STATES
  // ---------------------------------------------------------------------------
  const [registerMonth, setRegisterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [registerEmployees, setRegisterEmployees] = useState<Employee[]>([]);
  const [registerRecords, setRegisterRecords] = useState<AttendanceRecord[]>([]);
  const [registerSearch, setRegisterSearch] = useState('');
  const [isLoadingRegister, setIsLoadingRegister] = useState(false);
  // Inline edit state
  const [editingCell, setEditingCell] = useState<{ employeeId: string; date: string; employeeName: string } | null>(null);
  const [editCellStatus, setEditCellStatus] = useState<AttendanceStatus>('Present');
  const [editCellOT, setEditCellOT] = useState<number>(0);
  const [editCellReliever, setEditCellReliever] = useState<string>('');
  const [isSavingCell, setIsSavingCell] = useState(false);

  // ---------------------------------------------------------------------------
  // TAB 3: INDIVIDUAL SUMMARY STATES
  // ---------------------------------------------------------------------------
  const [individualEmpId, setIndividualEmpId] = useState('');
  const [individualMonth, setIndividualMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [individualRecords, setIndividualRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingIndividual, setIsLoadingIndividual] = useState(false);
  // Calendar editing state
  const [editingDay, setEditingDay] = useState<{ date: string } | null>(null);
  const [editDayStatus, setEditDayStatus] = useState<AttendanceStatus>('Present');
  const [editDayOT, setEditDayOT] = useState<number>(0);
  const [editDayReliever, setEditDayReliever] = useState<string>('');
  const [isSavingDay, setIsSavingDay] = useState(false);

  // ---------------------------------------------------------------------------
  // TAB 4: RELIEVERS LIST STATES
  // ---------------------------------------------------------------------------
  const [relieversMonth, setRelieversMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [relieversOrgId, setRelieversOrgId] = useState('');
  const [relieverRecords, setRelieverRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingRelievers, setIsLoadingRelievers] = useState(false);

  // Status mapping colors & labels
  const statusOptions: AttendanceStatus[] = ['Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Week Off'];
  
  const statusColors: Record<AttendanceStatus, string> = {
    'Present': 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
    'Absent': 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
    'Half Day': 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200',
    'Leave': 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200',
    'Holiday': 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200',
    'Week Off': 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200',
  };

  const statusAbbr: Record<AttendanceStatus, string> = {
    'Present': 'P',
    'Absent': 'A',
    'Half Day': 'HD',
    'Leave': 'L',
    'Holiday': 'H',
    'Week Off': 'WO',
  };

  // ---------------------------------------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadOrganizationsAndEmployees();
  }, []);

  async function loadOrganizationsAndEmployees() {
    setIsLoadingOrgs(true);
    try {
      const [orgs, emps] = await Promise.all([
        api.organizations.getAll(),
        api.employees.getAll()
      ]);
      const activeOrgs = orgs.filter(o => o.status === 'Active');
      setOrganizations(activeOrgs);
      setAllEmployees(emps.filter(e => e.status === 'Active'));

      if (activeOrgs.length > 0) {
        setSelectedOrgId(activeOrgs[0].id);
        setRelieversOrgId(activeOrgs[0].id);
      }
    } catch (error) {
      console.error('Failed to load initial orgs/employees:', error);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  // ---------------------------------------------------------------------------
  // TAB 1: DAILY ATTENDANCE MARKING LOGIC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (selectedOrgId && dailyDate && activeTab === 'daily') {
      loadDailyAttendance();
    }
  }, [selectedOrgId, dailyDate, activeTab]);

  async function loadDailyAttendance() {
    setIsLoadingDaily(true);
    try {
      const [allEmps, dateRecords] = await Promise.all([
        api.employees.getAll(),
        api.attendance.getByDateAndOrg(dailyDate, selectedOrgId)
      ]);
      
      const empsInOrg = allEmps.filter(e => e.organizationId === selectedOrgId && e.status === 'Active');
      setDailyEmployees(empsInOrg);
      
      const newMap: Record<string, { status: AttendanceStatus; otHours: number; relieverId: string }> = {};
      empsInOrg.forEach(emp => {
        const record = dateRecords.find(r => r.employeeId === emp.id);
        if (record) {
          newMap[emp.id] = {
            status: record.status as AttendanceStatus,
            otHours: record.overtimeHours,
            relieverId: record.relieverEmployeeId || ''
          };
        } else {
          newMap[emp.id] = { status: 'Present', otHours: 0, relieverId: '' };
        }
      });
      setDailyAttendance(newMap);
      setDailySelectedEmpIds(new Set());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingDaily(false);
    }
  };

  const handleDailyStatus = (empId: string, status: AttendanceStatus) => {
    setDailyAttendance(prev => {
      const current = prev[empId] || { status: 'Present', otHours: 0, relieverId: '' };
      return {
        ...prev,
        [empId]: { ...current, status, relieverId: status !== 'Absent' ? '' : current.relieverId }
      };
    });
  };

  const handleDailyOT = (empId: string, otHours: number) => {
    setDailyAttendance(prev => {
      const current = prev[empId] || { status: 'Present', otHours: 0, relieverId: '' };
      return {
        ...prev,
        [empId]: { ...current, otHours }
      };
    });
  };

  const handleDailyReliever = (empId: string, relieverId: string) => {
    setDailyAttendance(prev => {
      const current = prev[empId] || { status: 'Present', otHours: 0, relieverId: '' };
      return {
        ...prev,
        [empId]: { ...current, relieverId }
      };
    });
  };

  const handleSelectDailyRow = (empId: string) => {
    const newSet = new Set(dailySelectedEmpIds);
    if (newSet.has(empId)) {
      newSet.delete(empId);
    } else {
      newSet.add(empId);
    }
    setDailySelectedEmpIds(newSet);
  };

  const handleSelectAllDaily = () => {
    const filtered = dailyEmployees.filter(emp => 
      emp.name.toLowerCase().includes(dailySearch.toLowerCase()) || 
      emp.mobileNumber.includes(dailySearch)
    );
    if (dailySelectedEmpIds.size === filtered.length && filtered.length > 0) {
      setDailySelectedEmpIds(new Set());
    } else {
      setDailySelectedEmpIds(new Set(filtered.map(emp => emp.id)));
    }
  };

  const markAllDaily = (status: AttendanceStatus) => {
    const newMap = { ...dailyAttendance };
    if (dailySelectedEmpIds.size > 0) {
      dailySelectedEmpIds.forEach(empId => {
        const current = newMap[empId] || { status: 'Present', otHours: 0, relieverId: '' };
        newMap[empId] = { ...current, status, relieverId: status !== 'Absent' ? '' : current.relieverId };
      });
      setDailyAttendance(newMap);
      setDailySelectedEmpIds(new Set());
    } else {
      const filtered = dailyEmployees.filter(emp => 
        emp.name.toLowerCase().includes(dailySearch.toLowerCase()) || 
        emp.mobileNumber.includes(dailySearch)
      );
      filtered.forEach(emp => {
        const current = newMap[emp.id] || { status: 'Present', otHours: 0, relieverId: '' };
        newMap[emp.id] = { ...current, status, relieverId: status !== 'Absent' ? '' : current.relieverId };
      });
      setDailyAttendance(newMap);
    }
  };

  const handleSaveDaily = async () => {
    setIsSavingDaily(true);
    setIsSyncing(true);
    try {
      const recordsToSave = dailyEmployees.map(emp => {
        const stateData = dailyAttendance[emp.id] || { status: 'Present', otHours: 0, relieverId: '' };
        return {
          employeeId: emp.id,
          date: dailyDate,
          status: stateData.status,
          overtimeHours: stateData.otHours,
          relieverEmployeeId: stateData.status === 'Absent' && stateData.relieverId ? stateData.relieverId : null
        };
      });

      await api.attendance.upsertMultiple(recordsToSave);
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save attendance.');
    } finally {
      setIsSavingDaily(false);
      setIsSyncing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // TAB 2: MONTHLY REGISTER LOGIC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (selectedOrgId && registerMonth && activeTab === 'register') {
      loadMonthlyRegister();
    }
  }, [selectedOrgId, registerMonth, activeTab]);

  async function loadMonthlyRegister() {
    setIsLoadingRegister(true);
    try {
      const [allEmps, monthRecords] = await Promise.all([
        api.employees.getAll(),
        api.attendance.getByDateAndOrg(registerMonth, selectedOrgId)
      ]);
      const orgEmps = allEmps.filter(e => e.organizationId === selectedOrgId && e.status === 'Active');
      setRegisterEmployees(orgEmps);
      setRegisterRecords(monthRecords);
    } catch (error) {
      console.error('Failed to load monthly register:', error);
    } finally {
      setIsLoadingRegister(false);
    }
  };

  // Generate days array for the selected register month
  const getRegisterDays = () => {
    if (!registerMonth) return [];
    const [yearStr, monthStr] = registerMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const numDays = new Date(year, month, 0).getDate();
    return Array.from({ length: numDays }, (_, i) => {
      const day = i + 1;
      return `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`;
    });
  };

  const registerDays = getRegisterDays();

  // Calculations for Monthly Register KPIs
  const getRegisterKPIs = () => {
    if (registerRecords.length === 0) return { presentRate: 0, totalOt: 0, presentCount: 0, totalRecords: 0 };
    const present = registerRecords.filter(r => r.status === 'Present').length;
    const halfDay = registerRecords.filter(r => r.status === 'Half Day').length;
    const totalRecords = registerRecords.length;
    const totalOt = registerRecords.reduce((sum, r) => sum + Number(r.overtimeHours || 0), 0);
    
    // Present rate weighting Present as 100% and Half Day as 50%
    const presentWeight = present + (halfDay * 0.5);
    const presentRate = totalRecords > 0 ? (presentWeight / totalRecords) * 100 : 0;
    return {
      presentRate: Math.round(presentRate),
      totalOt: Math.round(totalOt * 10) / 10,
      presentCount: present,
      totalRecords
    };
  };

  const registerKPIs = getRegisterKPIs();

  // Get daily attendance count for the register month graph
  const getDailyAttendanceGraphData = () => {
    return registerDays.map(dayStr => {
      const dayNum = parseInt(dayStr.split('-')[2]);
      const recordsForDay = registerRecords.filter(r => r.date === dayStr);
      const present = recordsForDay.filter(r => r.status === 'Present').length;
      const halfDay = recordsForDay.filter(r => r.status === 'Half Day').length;
      const count = present + (halfDay * 0.5);
      return { day: dayNum, count };
    });
  };

  const dailyGraphData = getDailyAttendanceGraphData();
  const maxDailyPresent = Math.max(...dailyGraphData.map(d => d.count), 4);

  const handleCellClick = async (empId: string, dayStr: string) => {
    const existing = registerRecords.find(r => r.employeeId === empId && r.date === dayStr);
    const nextStatus: AttendanceStatus = existing ? (existing.status === 'Present' ? 'Absent' : 'Present') : 'Present';
    const existingOt = existing ? existing.overtimeHours : 0;

    setIsSyncing(true);
    try {
      const payload = [{
        employeeId: empId,
        date: dayStr,
        status: nextStatus,
        overtimeHours: existingOt,
        relieverEmployeeId: null
      }];
      await api.attendance.upsertMultiple(payload);

      setRegisterRecords(prev => {
        const index = prev.findIndex(r => r.employeeId === empId && r.date === dayStr);
        const updatedRecord = {
          id: prev[index]?.id || '',
          employeeId: empId,
          date: dayStr,
          status: nextStatus,
          overtimeHours: existingOt,
          relieverEmployeeId: null
        };
        if (index > -1) {
          const next = [...prev];
          next[index] = updatedRecord;
          return next;
        } else {
          return [...prev, updatedRecord];
        }
      });
    } catch (error) {
      console.error('Failed to quick-toggle status:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Edit single cell logic
  const handleOpenEditCell = (employeeId: string, date: string, employeeName: string) => {
    const existing = registerRecords.find(r => r.employeeId === employeeId && r.date === date);
    setEditingCell({ employeeId, date, employeeName });
    setEditCellStatus(existing ? (existing.status as AttendanceStatus) : 'Present');
    setEditCellOT(existing ? existing.overtimeHours : 0);
    setEditCellReliever(existing?.relieverEmployeeId || '');
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;
    setIsSavingCell(true);
    setIsSyncing(true);
    try {
      const payload = [{
        employeeId: editingCell.employeeId,
        date: editingCell.date,
        status: editCellStatus,
        overtimeHours: editCellOT,
        relieverEmployeeId: editCellStatus === 'Absent' && editCellReliever ? editCellReliever : null
      }];
      await api.attendance.upsertMultiple(payload);

      // Local state update
      setRegisterRecords(prev => {
        const index = prev.findIndex(r => r.employeeId === editingCell.employeeId && r.date === editingCell.date);
        const updatedRecord = {
          id: prev[index]?.id || '',
          employeeId: editingCell.employeeId,
          date: editingCell.date,
          status: editCellStatus,
          overtimeHours: editCellOT,
          relieverEmployeeId: editCellStatus === 'Absent' && editCellReliever ? editCellReliever : null
        };
        if (index > -1) {
          const next = [...prev];
          next[index] = updatedRecord;
          return next;
        } else {
          return [...prev, updatedRecord];
        }
      });

      setEditingCell(null);
    } catch (error) {
      console.error('Failed to update cell:', error);
      alert('Failed to update attendance cell.');
    } finally {
      setIsSavingCell(false);
      setIsSyncing(false);
    }
  };

  // Excel export for Monthly Register
  const handleExportRegisterExcel = () => {
    if (registerEmployees.length === 0) return alert('No employee records to export');
    
    const data = registerEmployees.map((emp, index) => {
      const row: any = {
        'S.No': index + 1,
        'Employee ID': emp.id.slice(0, 8).toUpperCase(),
        'Employee Name': emp.name,
        'Mobile Number': emp.mobileNumber,
        'Department': emp.department || 'N/A',
        'Designation': emp.designation || 'N/A',
      };

      let present = 0, absent = 0, halfDay = 0, leave = 0, holiday = 0, weekOff = 0, ot = 0;

      registerDays.forEach(dayStr => {
        const dayNum = parseInt(dayStr.split('-')[2]);
        const rec = registerRecords.find(r => r.employeeId === emp.id && r.date === dayStr);
        row[`Day ${dayNum}`] = rec ? statusAbbr[rec.status as AttendanceStatus] || '-' : '-';
        if (rec) {
          if (rec.status === 'Present') present++;
          else if (rec.status === 'Absent') absent++;
          else if (rec.status === 'Half Day') halfDay++;
          else if (rec.status === 'Leave') leave++;
          else if (rec.status === 'Holiday') holiday++;
          else if (rec.status === 'Week Off') weekOff++;
          ot += Number(rec.overtimeHours || 0);
        }
      });

      row['Present (P)'] = present;
      row['Absent (A)'] = absent;
      row['Half Day (HD)'] = halfDay;
      row['Leave (L)'] = leave;
      row['Holiday (H)'] = holiday;
      row['Week Off (WO)'] = weekOff;
      row['Overtime Hours'] = ot;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Attendance Register');
    
    // Add columns widths
    const maxCols = 6 + registerDays.length + 7;
    worksheet['!cols'] = Array(maxCols).fill({ wch: 10 });
    worksheet['!cols'][2] = { wch: 22 }; // Name column width
    worksheet['!cols'][4] = { wch: 15 }; // Dept width
    worksheet['!cols'][5] = { wch: 15 }; // Desig width

    XLSX.writeFile(workbook, `Attendance_Register_${selectedOrgId.slice(0,4)}_${registerMonth}.xlsx`);
  };

  // ---------------------------------------------------------------------------
  // TAB 3: INDIVIDUAL SUMMARY LOGIC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab === 'individual' && allEmployees.length > 0 && !individualEmpId) {
      setIndividualEmpId(allEmployees[0].id);
    }
  }, [activeTab, allEmployees]);

  useEffect(() => {
    if (individualEmpId && individualMonth && activeTab === 'individual') {
      loadIndividualAttendance();
    }
  }, [individualEmpId, individualMonth, activeTab]);

  async function loadIndividualAttendance() {
    setIsLoadingIndividual(true);
    try {
      const records = await api.attendance.getByEmployeeAndMonth(individualEmpId, individualMonth);
      setIndividualRecords(records);
    } catch (error) {
      console.error('Failed to load individual records:', error);
    } finally {
      setIsLoadingIndividual(false);
    }
  };

  const getIndividualDays = () => {
    if (!individualMonth) return [];
    const [yearStr, monthStr] = individualMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const numDays = new Date(year, month, 0).getDate();
    return Array.from({ length: numDays }, (_, i) => {
      const day = i + 1;
      return `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`;
    });
  };

  const individualDays = getIndividualDays();

  // Individual monthly statistics
  const getIndividualStats = () => {
    const stats = {
      Present: 0,
      Absent: 0,
      'Half Day': 0,
      Leave: 0,
      Holiday: 0,
      'Week Off': 0,
      Unmarked: 0,
      TotalOt: 0,
      PresentRate: 0,
      TotalDays: individualDays.length
    };

    individualDays.forEach(dayStr => {
      const rec = individualRecords.find(r => r.date === dayStr);
      if (rec) {
        const status = rec.status as AttendanceStatus;
        if (stats[status] !== undefined) {
          stats[status]++;
        }
        stats.TotalOt += Number(rec.overtimeHours || 0);
      } else {
        stats.Unmarked++;
      }
    });

    const markedCount = stats.Present + stats.Absent + stats['Half Day'] + stats.Leave + stats.Holiday + stats['Week Off'];
    const presentWeight = stats.Present + (stats['Half Day'] * 0.5);
    stats.PresentRate = markedCount > 0 ? Math.round((presentWeight / markedCount) * 100) : 0;
    stats.TotalOt = Math.round(stats.TotalOt * 10) / 10;

    return stats;
  };

  const individualStats = getIndividualStats();
  const selectedEmployee = allEmployees.find(e => e.id === individualEmpId);

  const handleDayClick = async (dayStr: string) => {
    const existing = individualRecords.find(r => r.date === dayStr);
    const nextStatus: AttendanceStatus = existing ? (existing.status === 'Present' ? 'Absent' : 'Present') : 'Present';
    const existingOt = existing ? existing.overtimeHours : 0;

    setIsSyncing(true);
    try {
      const payload = [{
        employeeId: individualEmpId,
        date: dayStr,
        status: nextStatus,
        overtimeHours: existingOt,
        relieverEmployeeId: null
      }];
      await api.attendance.upsertMultiple(payload);

      setIndividualRecords(prev => {
        const index = prev.findIndex(r => r.date === dayStr);
        const updated = {
          id: prev[index]?.id || '',
          employeeId: individualEmpId,
          date: dayStr,
          status: nextStatus,
          overtimeHours: existingOt,
          relieverEmployeeId: null
        };
        if (index > -1) {
          const next = [...prev];
          next[index] = updated;
          return next;
        } else {
          return [...prev, updated];
        }
      });
    } catch (error) {
      console.error('Failed to quick-toggle status:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Edit individual calendar cell
  const handleOpenEditDay = (date: string) => {
    const existing = individualRecords.find(r => r.date === date);
    setEditingDay({ date });
    setEditDayStatus(existing ? (existing.status as AttendanceStatus) : 'Present');
    setEditDayOT(existing ? existing.overtimeHours : 0);
    setEditDayReliever(existing?.relieverEmployeeId || '');
  };

  const handleSaveDay = async () => {
    if (!editingDay) return;
    setIsSavingDay(true);
    setIsSyncing(true);
    try {
      const payload = [{
        employeeId: individualEmpId,
        date: editingDay.date,
        status: editDayStatus,
        overtimeHours: editDayOT,
        relieverEmployeeId: editDayStatus === 'Absent' && editDayReliever ? editDayReliever : null
      }];
      await api.attendance.upsertMultiple(payload);

      // Local state update
      setIndividualRecords(prev => {
        const index = prev.findIndex(r => r.date === editingDay.date);
        const updated = {
          id: prev[index]?.id || '',
          employeeId: individualEmpId,
          date: editingDay.date,
          status: editDayStatus,
          overtimeHours: editDayOT,
          relieverEmployeeId: editDayStatus === 'Absent' && editDayReliever ? editDayReliever : null
        };
        if (index > -1) {
          const next = [...prev];
          next[index] = updated;
          return next;
        } else {
          return [...prev, updated];
        }
      });

      setEditingDay(null);
    } catch (error) {
      console.error(error);
      alert('Failed to update calendar date.');
    } finally {
      setIsSavingDay(false);
      setIsSyncing(false);
    }
  };

  // Excel export for Individual Attendance
  const handleExportIndividualExcel = () => {
    if (!selectedEmployee) return;

    const data = individualDays.map((dayStr, index) => {
      const rec = individualRecords.find(r => r.date === dayStr);
      const parsedDate = new Date(dayStr + 'T00:00:00');
      const reliever = rec?.relieverEmployeeId ? allEmployees.find(e => e.id === rec.relieverEmployeeId) : null;
      return {
        'S.No': index + 1,
        'Date': dayStr,
        'Day': format(parsedDate, 'EEEE'),
        'Attendance Status': rec ? rec.status : 'Not Marked',
        'Overtime Hours': rec ? rec.overtimeHours : 0,
        'Reliever': reliever ? reliever.name : '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    // Add summary cards metadata at the bottom
    const summaryStartRow = data.length + 3;
    XLSX.utils.sheet_add_aoa(worksheet, [
      [],
      ['Summary Statistics', '', '', ''],
      ['Present Days', individualStats.Present, 'Total Overtime', `${individualStats.TotalOt} Hrs`],
      ['Absent Days', individualStats.Absent, 'Present Percentage', `${individualStats.PresentRate}%`],
      ['Half Days', individualStats['Half Day'], 'Leaves taken', individualStats.Leave],
      ['Holidays', individualStats.Holiday, 'Week Offs', individualStats['Week Off']],
    ], { origin: `A${summaryStartRow}` });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Summary');
    
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
      { wch: 16 },
      { wch: 20 }
    ];

    XLSX.writeFile(workbook, `${selectedEmployee.name.replace(/\s+/g, '_')}_Attendance_${individualMonth}.xlsx`);
  };

  // ---------------------------------------------------------------------------
  // TAB 4: RELIEVERS LIST LOGIC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab === 'relievers') {
      loadRelieverRecords();
    }
  }, [activeTab, relieversMonth, relieversOrgId]);

  async function loadRelieverRecords() {
    setIsLoadingRelievers(true);
    try {
      const records = await api.attendance.getRelievers(relieversMonth);
      // Filter by org if needed
      if (relieversOrgId) {
        const orgEmpIds = allEmployees
          .filter(e => e.organizationId === relieversOrgId)
          .map(e => e.id);
        setRelieverRecords(records.filter(r => orgEmpIds.includes(r.employeeId)));
      } else {
        setRelieverRecords(records);
      }
    } catch (error) {
      console.error('Failed to load reliver records:', error);
    } finally {
      setIsLoadingRelievers(false);
    }
  };

  // Filters for lists
  const filteredDailyEmployees = dailyEmployees.filter(emp => 
    emp.name.toLowerCase().includes(dailySearch.toLowerCase()) || 
    emp.mobileNumber.includes(dailySearch)
  );

  const filteredRegisterEmployees = registerEmployees.filter(emp => 
    emp.name.toLowerCase().includes(registerSearch.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER SECTION WITH NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
            Attendance Hub
            {isSyncing && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 text-blue-700 bg-blue-50 border border-blue-100 rounded-full animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Syncing...
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 font-medium">Manage, view register matrix, and download Excel reports.</p>
        </div>

        {/* Beautiful tabs */}
        <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/50 self-start md:self-auto flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'daily'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            <Check className="w-4 h-4" />
            Daily Marking
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            <Grid className="w-4 h-4" />
            Monthly Register
          </button>
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'individual'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            <User className="w-4 h-4" />
            Individual Overview
          </button>
          <button
            onClick={() => setActiveTab('relievers')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'relievers'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-600 hover:text-orange-600'
            }`}
          >
            <Users className="w-4 h-4" />
            Relievers
          </button>
        </div>
      </div>

      {/* TOP FILTERS CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 shrink-0">
        <div className="flex flex-col md:flex-row gap-5 items-end">
          
          {/* Org Filter (Needed for Tab 1, 2 & 4) */}
          {activeTab !== 'individual' && (
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Organization</label>
              <div className="relative">
                <select 
                  value={activeTab === 'relievers' ? relieversOrgId : selectedOrgId} 
                  onChange={e => activeTab === 'relievers' ? setRelieversOrgId(e.target.value) : setSelectedOrgId(e.target.value)}
                  disabled={isLoadingOrgs}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold text-gray-700 disabled:opacity-70 appearance-none transition-all"
                >
                  <option value="">All Organizations</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                {isLoadingOrgs && <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
              </div>
            </div>
          )}

          {/* Date Filter for Daily Marking */}
          {activeTab === 'daily' && (
            <div className="w-full md:w-56">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Selected Date</label>
              <div className="relative">
                <input 
                  type="date"
                  value={dailyDate}
                  onChange={e => setDailyDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold text-gray-700 transition-all"
                />
                <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Month Filter for Register */}
          {activeTab === 'register' && (
            <div className="w-full md:w-56">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Month</label>
              <div className="relative">
                <input 
                  type="month"
                  value={registerMonth}
                  onChange={e => setRegisterMonth(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold text-gray-700 transition-all"
                />
                <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Month Filter for Relievers */}
          {activeTab === 'relievers' && (
            <div className="w-full md:w-56">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Month</label>
              <div className="relative">
                <input 
                  type="month"
                  value={relieversMonth}
                  onChange={e => setRelieversMonth(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold text-gray-700 transition-all"
                />
                <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Individual employee & month select */}
          {activeTab === 'individual' && (
            <>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Employee</label>
                <select
                  value={individualEmpId}
                  onChange={e => setIndividualEmpId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold text-gray-700 transition-all"
                >
                  <option value="">Select Employee</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.designation || 'No Designation'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-56">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Month</label>
                <div className="relative">
                  <input
                    type="month"
                    value={individualMonth}
                    onChange={e => setIndividualMonth(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-semibold text-gray-700 transition-all"
                  />
                  <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          TAB 1: DAILY MARKING CONTENT
          ----------------------------------------------------------------------- */}
      {activeTab === 'daily' && selectedOrgId && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/70 shrink-0">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={dailySearch}
                onChange={e => setDailySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            {!isLoadingDaily && dailyEmployees.length > 0 && (
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar items-center">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap mr-2">
                  {dailySelectedEmpIds.size > 0 ? `Mark Selected (${dailySelectedEmpIds.size}):` : 'Quick Mark All:'}
                </span>
                {statusOptions.slice(0, 4).map((status) => (
                   <button 
                    key={status}
                    onClick={() => markAllDaily(status)}
                    className={`px-3 py-1.5 text-xs font-bold border rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer
                      ${statusColors[status].replace('hover:', 'hover:ring-2 hover:ring-offset-1 hover:')}
                    `}
                   >
                     {status}
                   </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto flex-1 relative max-h-[600px]">
            {isLoadingDaily && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-white/80 z-20">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                <p className="font-semibold text-sm">Loading records...</p>
              </div>
            )}
            
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm border-b border-gray-200 z-10">
                <tr className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAllDaily}
                      checked={filteredDailyEmployees.length > 0 && dailySelectedEmpIds.size === filteredDailyEmployees.length}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-4 font-black">Employee</th>
                  <th className="p-4 font-black text-center min-w-[320px]">Attendance Status</th>
                  <th className="p-4 font-black w-28">OT Hours</th>
                  <th className="p-4 font-black min-w-[160px]">Reliever (if Absent)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDailyEmployees.length === 0 && !isLoadingDaily ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-gray-400 font-medium">
                      {dailySearch ? 'No employees match your search.' : 'No active employees found in this organization.'}
                    </td>
                  </tr>
                ) : (
                  filteredDailyEmployees.map(emp => {
                    const currentStatus = dailyAttendance[emp.id]?.status || 'Present';
                    const otHours = dailyAttendance[emp.id]?.otHours || 0;
                    const relieverId = dailyAttendance[emp.id]?.relieverId || '';
                    const isAbsent = currentStatus === 'Absent';
                    
                    return (
                      <tr key={emp.id} className={`hover:bg-gray-50/40 transition-colors ${dailySelectedEmpIds.has(emp.id) ? 'bg-blue-50/20' : ''} ${isAbsent ? 'bg-rose-50/30' : ''}`}>
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            onChange={() => handleSelectDailyRow(emp.id)}
                            checked={dailySelectedEmpIds.has(emp.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-400 font-semibold mt-0.5">
                            <span>{emp.designation || 'Staff'}</span>
                            {emp.department && <span className="opacity-75"> • {emp.department}</span>}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                            <span className="opacity-75">{emp.mobileNumber}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1.5 justify-center flex-wrap">
                            {statusOptions.map(status => {
                              const isActive = currentStatus === status;
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => handleDailyStatus(emp.id, status)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 min-w-[75px] cursor-pointer
                                    ${isActive 
                                      ? statusColors[status] + ' border-transparent ring-2 ring-offset-1 ' + (status === 'Present' ? 'ring-green-500' : status === 'Absent' ? 'ring-red-500' : 'ring-gray-300')
                                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                                >
                                  {isActive && <Check className="w-3.5 h-3.5" />}
                                  <span>{status}</span>
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
                            onChange={(e) => handleDailyOT(emp.id, Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-center transition-shadow"
                          />
                        </td>
                        <td className="p-4">
                          {isAbsent ? (
                            <select
                              value={relieverId}
                              onChange={e => handleDailyReliever(emp.id, e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-orange-200 bg-orange-50 rounded-lg focus:ring-2 focus:ring-orange-400 font-semibold text-gray-700 transition-all"
                            >
                              <option value="">— No Reliever —</option>
                              {dailyEmployees
                                .filter(e => e.id !== emp.id)
                                .map(e => (
                                  <option key={e.id} value={e.id}>{e.name}</option>
                                ))
                              }
                            </select>
                          ) : (
                            <span className="text-xs text-gray-300 font-semibold">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50/70 flex justify-between items-center shrink-0">
            <div className="text-xs text-gray-400 font-semibold">
              {filteredDailyEmployees.filter(e => dailyAttendance[e.id]?.status === 'Absent').length > 0 && (
                <span className="flex items-center gap-1.5 text-orange-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {filteredDailyEmployees.filter(e => dailyAttendance[e.id]?.status === 'Absent').length} absent — assign relievers above
                </span>
              )}
            </div>
             <button 
              onClick={handleSaveDaily}
              disabled={isSavingDaily || isLoadingDaily || dailyEmployees.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/15 hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
             >
               {isSavingDaily ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
               {isSavingDaily ? 'Saving...' : 'Save Attendance'}
             </button>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          TAB 2: MONTHLY REGISTER CONTENT
          ----------------------------------------------------------------------- */}
      {activeTab === 'register' && selectedOrgId && (
        <div className="space-y-6">
          
          {/* STATS & SVG PAGE GRAPH PANEL */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* KPI summaries */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Month Attendance Health</h3>
                <div className="flex items-center gap-6">
                  {/* Circular progress SVG */}
                  <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <path
                        className="text-gray-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-blue-600 transition-all duration-1000 ease-out"
                        strokeWidth="3.5"
                        strokeDasharray={`${registerKPIs.presentRate}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-xl font-black text-gray-900 tracking-tighter leading-none">{registerKPIs.presentRate}%</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Present</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-2xl font-black text-gray-900 tracking-tight">{registerKPIs.presentCount}</span>
                      <span className="text-xs font-semibold text-gray-400 ml-1">Present Marks</span>
                    </div>
                    <div className="text-xs font-semibold text-gray-500 leading-relaxed">
                      Across <span className="text-gray-900 font-bold">{registerKPIs.totalRecords}</span> total logged statuses for the month.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Overtime card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Monthly Overtime</h3>
                <p className="text-xs text-gray-400 font-semibold mb-3">Total overtime logged in selected month</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-blue-600 tracking-tight">{registerKPIs.totalOt}</span>
                  <span className="text-sm font-black text-gray-400 uppercase">Hours</span>
                </div>
              </div>
              <div className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 mt-4 pt-4 border-t border-gray-50">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Syncs automatically when updates are saved.</span>
              </div>
            </div>

            {/* Daily Present Count Bar Graph (SVG Page Graph) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Daily Presence Trend</span>
                <span className="text-[10px] text-gray-400 normal-case font-semibold">Days 1 - {registerDays.length}</span>
              </h3>
              
              {/* SVG Bar Chart */}
              <div className="h-28 w-full flex items-end">
                {registerRecords.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-semibold">
                    No data to display graph
                  </div>
                ) : (
                  <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
                      </linearGradient>
                    </defs>
                    {dailyGraphData.map((data, i) => {
                      const barWidth = 300 / dailyGraphData.length - 2;
                      const barHeight = (data.count / maxDailyPresent) * 60;
                      const x = i * (300 / dailyGraphData.length);
                      const y = 70 - barHeight;
                      
                      return (
                        <g key={i}>
                          <rect
                            x={x}
                            y={y}
                            width={Math.max(barWidth, 1)}
                            height={Math.max(barHeight, 2)}
                            fill="url(#barGrad)"
                            rx="1"
                            className="transition-all duration-300 hover:fill-blue-700 cursor-pointer"
                          >
                            <title>{`Day ${data.day}: ${data.count} present`}</title>
                          </rect>
                        </g>
                      );
                    })}
                    {/* Baseline */}
                    <line x1="0" y1="71" x2="300" y2="71" stroke="#e5e7eb" strokeWidth="1" />
                  </svg>
                )}
              </div>
              <div className="flex justify-between text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-wider">
                <span>Day 1</span>
                <span>Day {registerDays.length}</span>
              </div>
            </div>

          </div>

          {/* REGISTER MATRIX GRID CARD */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/70 shrink-0">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search employees..." 
                  value={registerSearch}
                  onChange={e => setRegisterSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto items-center justify-end">
                <button
                  onClick={handleExportRegisterExcel}
                  disabled={isLoadingRegister || registerEmployees.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/10 transition disabled:opacity-60 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Export to Excel
                </button>
              </div>
            </div>

            <div className="overflow-auto flex-1 relative max-h-[550px] scrollbar-thin">
              {isLoadingRegister && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-white/80 z-20">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                  <p className="font-semibold text-sm">Loading register matrix...</p>
                </div>
              )}

              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-white shadow-sm border-b border-gray-200 z-10">
                  <tr className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="p-3 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-20 min-w-[150px] font-black border-r border-gray-100">Employee</th>
                    {registerDays.map(dayStr => {
                      const dayNum = dayStr.split('-')[2];
                      return (
                        <th key={dayStr} className="p-2 text-center min-w-[32px] font-black">{dayNum}</th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                  {filteredRegisterEmployees.length === 0 && !isLoadingRegister ? (
                    <tr>
                      <td colSpan={registerDays.length + 1} className="p-10 text-center text-gray-400 font-medium">
                        No employees found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredRegisterEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50/30 transition-colors">
                        {/* Sticky Employee Name Column */}
                        <td className="p-3 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10 border-r border-gray-100 font-bold text-gray-900 min-w-[150px]">
                          <div>{emp.name}</div>
                          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{emp.designation || 'Staff'}</div>
                        </td>

                        {/* Attendance cells */}
                        {registerDays.map(dayStr => {
                          const record = registerRecords.find(r => r.employeeId === emp.id && r.date === dayStr);
                          const status = record ? (record.status as AttendanceStatus) : null;
                          const ot = record ? record.overtimeHours : 0;
                          const hasReliever = !!(record?.relieverEmployeeId);
                          
                          let cellContent = '-';
                          let cellClass = 'bg-gray-50 text-gray-400 border border-gray-100 border-dashed hover:bg-gray-100';

                          if (status) {
                            cellContent = statusAbbr[status];
                            if (status === 'Present') cellClass = 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200';
                            else if (status === 'Absent') cellClass = 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-200';
                            else if (status === 'Half Day') cellClass = 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200';
                            else if (status === 'Leave') cellClass = 'bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-200';
                            else if (status === 'Holiday') cellClass = 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-200';
                            else if (status === 'Week Off') cellClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200';
                          }

                          const relieverEmp = hasReliever ? allEmployees.find(e => e.id === record?.relieverEmployeeId) : null;

                          return (
                            <td key={dayStr} className="p-1 text-center">
                              <button
                                onClick={() => handleCellClick(emp.id, dayStr)}
                                onDoubleClick={() => handleOpenEditCell(emp.id, dayStr, emp.name)}
                                title={`${emp.name} on ${dayStr}${hasReliever ? ` | Reliever: ${relieverEmp?.name || 'Assigned'}` : ''} (Double click for details)${ot > 0 ? ` (OT: ${ot}h)` : ''}`}
                                className={`w-8 h-8 rounded-lg text-[10px] font-black flex items-center justify-center mx-auto transition-all cursor-pointer relative ${cellClass}`}
                              >
                                {cellContent}
                                {ot > 0 && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-600 border border-white rounded-full" title={`OT: ${ot} hours`} />
                                )}
                                {hasReliever && (
                                  <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 bg-orange-500 border border-white rounded-full" title={`Reliever: ${relieverEmp?.name}`} />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Helpful footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/70 text-xs font-semibold text-gray-400 flex flex-wrap gap-4 items-center shrink-0">
              <span className="uppercase tracking-wider">Legend:</span>
              <span className="flex items-center gap-1"><span className="w-5 h-5 bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[9px] rounded flex items-center justify-center">P</span> Present</span>
              <span className="flex items-center gap-1"><span className="w-5 h-5 bg-rose-100 border border-rose-200 text-rose-800 font-bold text-[9px] rounded flex items-center justify-center">A</span> Absent</span>
              <span className="flex items-center gap-1"><span className="w-5 h-5 bg-amber-100 border border-amber-200 text-amber-800 font-bold text-[9px] rounded flex items-center justify-center">HD</span> Half Day</span>
              <span className="flex items-center gap-1"><span className="w-5 h-5 bg-orange-100 border border-orange-200 text-orange-800 font-bold text-[9px] rounded flex items-center justify-center">L</span> Leave</span>
              <span className="flex items-center gap-1"><span className="w-5 h-5 bg-indigo-100 border border-indigo-200 text-indigo-800 font-bold text-[9px] rounded flex items-center justify-center">H</span> Holiday</span>
              <span className="flex items-center gap-1"><span className="w-5 h-5 bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[9px] rounded flex items-center justify-center">WO</span> Week Off</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span> OT logged</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span> Reliever assigned</span>
              <span className="ml-auto text-[10px] text-blue-600">💡 Single click to toggle Present/Absent. Double click for detailed edit.</span>
            </div>
          </div>

          {/* FLOATING POPUP EDIT PANEL FOR REGISTER GRID */}
          {editingCell && (
            <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100 p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">Update Attendance</h3>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">{editingCell.employeeName} on {format(new Date(editingCell.date + 'T00:00:00'), 'dd MMM yyyy')}</p>
                  </div>
                  <button 
                    onClick={() => setEditingCell(null)}
                    className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 leading-none rounded-lg hover:bg-gray-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Status</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {statusOptions.map(status => {
                        const isSel = editCellStatus === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setEditCellStatus(status)}
                            className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              isSel 
                                ? statusColors[status] + ' border-transparent ring-2 ring-offset-1 ring-blue-500'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Overtime Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editCellOT}
                      onChange={e => setEditCellOT(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-blue-500/30 text-center"
                    />
                  </div>

                  {editCellStatus === 'Absent' && (
                    <div>
                      <label className="block text-[10px] font-bold text-orange-500 uppercase mb-1.5">Assign Reliever</label>
                      <select
                        value={editCellReliever}
                        onChange={e => setEditCellReliever(e.target.value)}
                        className="w-full px-3 py-2 border border-orange-200 bg-orange-50 rounded-xl font-semibold focus:ring-2 focus:ring-orange-400/30 text-gray-700 text-sm"
                      >
                        <option value="">— No Reliever —</option>
                        {allEmployees
                          .filter(e => e.id !== editingCell.employeeId)
                          .map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.designation || 'Staff'})</option>
                          ))
                        }
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditingCell(null)}
                    className="flex-1 py-2 text-xs font-bold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCell}
                    disabled={isSavingCell}
                    className="flex-1 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {isSavingCell ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Change
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* -----------------------------------------------------------------------
          TAB 3: INDIVIDUAL SUMMARY CONTENT
          ----------------------------------------------------------------------- */}
      {activeTab === 'individual' && individualEmpId && (
        <div className="space-y-6">

          {/* OVERVIEW PANEL WITH GRAPHS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* INDIVIDUAL SUMMARY CARD & KPI */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Staff Summary</h3>
                {selectedEmployee && (
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center font-bold text-blue-700 text-lg">
                      {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-none">{selectedEmployee.name}</h4>
                      <p className="text-xs text-gray-400 font-semibold mt-1">{selectedEmployee.designation || 'Staff'} • {selectedEmployee.department || 'N/A'}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">Attendance Health</span>
                    <span className="text-2xl font-black text-emerald-600">{individualStats.PresentRate}%</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">Overtime logged</span>
                    <span className="text-2xl font-black text-blue-600">{individualStats.TotalOt} <span className="text-xs font-bold text-gray-400">Hrs</span></span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleExportIndividualExcel}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/10 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download Excel Report
                </button>
              </div>
            </div>

            {/* STATUS DONUT GRAPH (SVG Donut Chart) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Status Distribution</h3>
              
              <div className="flex-1 flex items-center justify-center gap-6">
                {/* SVG Donut Chart */}
                {individualRecords.length === 0 ? (
                  <div className="text-xs text-gray-400 font-semibold">No data logged</div>
                ) : (
                  <>
                    <div className="relative w-24 h-24">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* Circular track */}
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                        
                        {/* Render Segments dynamically */}
                        {(() => {
                          const total = individualStats.TotalDays - individualStats.Unmarked;
                          if (total === 0) return null;
                          
                          let accumPercentage = 0;
                          const categories = [
                            { name: 'Present', count: individualStats.Present, color: '#10b981' },
                            { name: 'Absent', count: individualStats.Absent, color: '#f43f5e' },
                            { name: 'Half Day', count: individualStats['Half Day'], color: '#f59e0b' },
                            { name: 'Leave', count: individualStats.Leave, color: '#f97316' },
                            { name: 'Holiday', count: individualStats.Holiday, color: '#6366f1' },
                            { name: 'Week Off', count: individualStats['Week Off'], color: '#94a3b8' },
                          ].filter(c => c.count > 0);

                          const circum = 2 * Math.PI * 40; // 251.32

                          return categories.map((cat, i) => {
                            const pct = cat.count / total;
                            const dashArray = `${pct * circum} ${circum}`;
                            const dashOffset = -accumPercentage * circum;
                            accumPercentage += pct;
                            return (
                              <circle
                                key={i}
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke={cat.color}
                                strokeWidth="12"
                                strokeDasharray={dashArray}
                                strokeDashoffset={dashOffset}
                                transform="rotate(-90 50 50)"
                              />
                            );
                          });
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-xs font-black text-gray-400 uppercase">Logged</span>
                        <span className="text-lg font-black text-gray-900 leading-none mt-0.5">
                          {individualStats.TotalDays - individualStats.Unmarked}
                        </span>
                        <span className="text-[8px] text-gray-400 font-bold uppercase">Days</span>
                      </div>
                    </div>

                    <div className="text-[10px] font-bold text-gray-500 space-y-1.5 flex-1">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Present: {individualStats.Present}d</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> Absent: {individualStats.Absent}d</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> Half Day: {individualStats['Half Day']}d</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-orange-500" /> Leaves: {individualStats.Leave}d</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* OVERTIME TREND GRAPH (SVG Area/Line Chart) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Overtime Trend</h3>
              
              {/* SVG Area Chart */}
              <div className="h-28 w-full flex items-end">
                {individualRecords.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-semibold">
                    No records found
                  </div>
                ) : (
                  (() => {
                    const daysOt = individualDays.map(dayStr => {
                      const rec = individualRecords.find(r => r.date === dayStr);
                      return rec ? rec.overtimeHours : 0;
                    });
                    const maxOtVal = Math.max(...daysOt, 2);

                    const points = daysOt.map((ot, i) => {
                      const x = (i / (daysOt.length - 1)) * 260 + 20;
                      const y = 70 - (ot / maxOtVal) * 50;
                      return `${x},${y}`;
                    }).join(' ');

                    const fillPoints = `20,70 ${points} 280,70`;

                    return (
                      <svg className="w-full h-full" viewBox="0 0 300 80">
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Area Fill */}
                        <polygon points={fillPoints} fill="url(#areaGrad)" />
                        {/* Line */}
                        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Axis */}
                        <line x1="20" y1="70" x2="280" y2="70" stroke="#e5e7eb" strokeWidth="1" />
                        {/* Markers */}
                        {daysOt.map((ot, i) => {
                          if (ot === 0) return null;
                          const x = (i / (daysOt.length - 1)) * 260 + 20;
                          const y = 70 - (ot / maxOtVal) * 50;
                          return (
                            <circle key={i} cx={x} cy={y} r="3" fill="#2563eb" stroke="#ffffff" strokeWidth="1" />
                          );
                        })}
                      </svg>
                    );
                  })()
                )}
              </div>
              <div className="flex justify-between text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-wider">
                <span>Day 1</span>
                <span>Day {individualDays.length}</span>
              </div>
            </div>

          </div>

          {/* INDIVIDUAL CALENDAR & LIST */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Detailed Stats Cards */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Month Statistics Breakdown</h3>
              
              <div className="space-y-2.5">
                {[
                  { name: 'Present Days', value: `${individualStats.Present} Days`, color: 'bg-emerald-500' },
                  { name: 'Absent Days', value: `${individualStats.Absent} Days`, color: 'bg-rose-500' },
                  { name: 'Half Days', value: `${individualStats['Half Day']} Days`, color: 'bg-amber-500' },
                  { name: 'Leaves Approved', value: `${individualStats.Leave} Days`, color: 'bg-orange-500' },
                  { name: 'Paid Holidays', value: `${individualStats.Holiday} Days`, color: 'bg-indigo-500' },
                  { name: 'Week Offs', value: `${individualStats['Week Off']} Days`, color: 'bg-slate-400' },
                  { name: 'Total Unmarked', value: `${individualStats.Unmarked} Days`, color: 'bg-gray-300' },
                ].map((stat, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50/50 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${stat.color}`} />
                      <span className="text-xs font-semibold text-gray-600">{stat.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-900">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Calendar view (2 cols width on medium up) */}
            <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Attendance Calendar</h3>
                  <span className="text-xs font-bold text-blue-600 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">{format(new Date(individualMonth + '-01T00:00:00'), 'MMMM yyyy')}</span>
                </div>

                {isLoadingIndividual ? (
                  <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                    <p className="font-semibold text-xs">Loading employee calendar...</p>
                  </div>
                ) : (
                  <div>
                    {/* Calendar grid headers */}
                    <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    
                    {/* Calendar grid body */}
                    <div className="grid grid-cols-7 gap-2">
                      {/* Empty cells before start of month */}
                      {(() => {
                        if (individualDays.length === 0) return null;
                        const startDayOfWeek = new Date(individualDays[0] + 'T00:00:00').getDay();
                        return Array.from({ length: startDayOfWeek }).map((_, i) => (
                          <div key={`empty-${i}`} className="aspect-square bg-gray-50/20 border border-transparent rounded-xl" />
                        ));
                      })()}

                      {/* Day cells */}
                      {individualDays.map(dayStr => {
                        const dayNum = parseInt(dayStr.split('-')[2]);
                        const record = individualRecords.find(r => r.date === dayStr);
                        const status = record ? (record.status as AttendanceStatus) : null;
                        const ot = record ? record.overtimeHours : 0;
                        const hasReliever = !!(record?.relieverEmployeeId);
                        
                        let badgeClass = 'bg-gray-50 text-gray-400 border border-gray-100 border-dashed hover:bg-gray-100';
                        if (status) {
                          if (status === 'Present') badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100';
                          else if (status === 'Absent') badgeClass = 'bg-rose-50 text-rose-800 border-rose-100 hover:bg-rose-100';
                          else if (status === 'Half Day') badgeClass = 'bg-amber-50 text-amber-800 border-amber-100 hover:bg-amber-100';
                          else if (status === 'Leave') badgeClass = 'bg-orange-50 text-orange-800 border-orange-100 hover:bg-orange-100';
                          else if (status === 'Holiday') badgeClass = 'bg-indigo-50 text-indigo-800 border-indigo-100 hover:bg-indigo-100';
                          else if (status === 'Week Off') badgeClass = 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100';
                        }

                        return (
                          <button
                            key={dayStr}
                            onClick={() => handleDayClick(dayStr)}
                            onDoubleClick={() => handleOpenEditDay(dayStr)}
                            title={`Day ${dayNum} (Double click for details)${hasReliever ? ' | Has Reliever' : ''}`}
                            className={`aspect-square p-1.5 flex flex-col justify-between items-start border rounded-xl transition-all cursor-pointer relative ${badgeClass}`}
                          >
                            <span className="text-[11px] font-bold leading-none">{dayNum}</span>
                            {status && (
                              <span className="text-[8px] font-black tracking-tight leading-none uppercase self-end">
                                {statusAbbr[status]}
                              </span>
                            )}
                            {ot > 0 && (
                              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                            )}
                            {hasReliever && (
                              <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 text-[10px] font-semibold text-gray-400 flex items-center gap-1.5 pt-4 border-t border-gray-50 flex-wrap gap-y-1">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Single click to toggle Present/Absent. Double click for detailed edit.</span>
                <span className="flex items-center gap-1 ml-2"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full inline-block" /> Reliever assigned</span>
              </div>
            </div>

          </div>

          {/* FLOATING POPUP EDIT DAY FOR INDIVIDUAL CALENDAR */}
          {editingDay && (
            <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100 p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">Edit Date Record</h3>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">Date: {format(new Date(editingDay.date + 'T00:00:00'), 'EEEE, dd MMM yyyy')}</p>
                  </div>
                  <button 
                    onClick={() => setEditingDay(null)}
                    className="text-gray-400 hover:text-gray-600 p-1 leading-none rounded-lg hover:bg-gray-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Status</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {statusOptions.map(status => {
                        const isSel = editDayStatus === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setEditDayStatus(status)}
                            className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              isSel 
                                ? statusColors[status] + ' border-transparent ring-2 ring-offset-1 ring-blue-500'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Overtime Hours</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editDayOT}
                      onChange={e => setEditDayOT(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-blue-500/30 text-center"
                    />
                  </div>

                  {editDayStatus === 'Absent' && (
                    <div>
                      <label className="block text-[10px] font-bold text-orange-500 uppercase mb-1.5">Assign Reliever</label>
                      <select
                        value={editDayReliever}
                        onChange={e => setEditDayReliever(e.target.value)}
                        className="w-full px-3 py-2 border border-orange-200 bg-orange-50 rounded-xl font-semibold focus:ring-2 focus:ring-orange-400/30 text-gray-700 text-sm"
                      >
                        <option value="">— No Reliever —</option>
                        {allEmployees
                          .filter(e => e.id !== individualEmpId)
                          .map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.designation || 'Staff'})</option>
                          ))
                        }
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditingDay(null)}
                    className="flex-1 py-2 text-xs font-bold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDay}
                    disabled={isSavingDay}
                    className="flex-1 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {isSavingDay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Change
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* -----------------------------------------------------------------------
          TAB 4: RELIEVERS LIST CONTENT
          ----------------------------------------------------------------------- */}
      {activeTab === 'relievers' && (
        <div className="space-y-6">

          {/* Header summary card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Reliever Assignments
              </h2>
              <span className="text-xs font-bold px-3 py-1 bg-orange-50 text-orange-600 border border-orange-100 rounded-full">
                {relieverRecords.length} Record{relieverRecords.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-semibold">
              Showing all absent employees with assigned relievers for {format(new Date(relieversMonth + '-01T00:00:00'), 'MMMM yyyy')}.
            </p>
          </div>

          {/* Reliever Table */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {isLoadingRelievers ? (
              <div className="flex flex-col items-center justify-center p-16 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-orange-500" />
                <p className="font-semibold text-sm">Loading reliever records...</p>
              </div>
            ) : relieverRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-gray-400">
                <Users className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-bold text-sm">No Reliever Records Found</p>
                <p className="text-xs mt-1">No absent employees have been assigned a reliever for this month.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-gray-50/80 border-b border-gray-200">
                    <tr className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                      <th className="p-4 font-black">#</th>
                      <th className="p-4 font-black">Date</th>
                      <th className="p-4 font-black">Absent Employee</th>
                      <th className="p-4 font-black">Dept / Designation</th>
                      <th className="p-4 font-black">Reliever Assigned</th>
                      <th className="p-4 font-black">Reliever Dept</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {relieverRecords.map((rec, index) => {
                      const absentEmp = allEmployees.find(e => e.id === rec.employeeId);
                      const relieverEmp = rec.relieverEmployeeId ? allEmployees.find(e => e.id === rec.relieverEmployeeId) : null;
                      
                      return (
                        <tr key={rec.id || index} className="hover:bg-gray-50/40 transition-colors">
                          <td className="p-4 text-xs text-gray-400 font-bold">{index + 1}</td>
                          <td className="p-4">
                            <div className="font-bold text-gray-700">
                              {format(new Date(rec.date + 'T00:00:00'), 'dd MMM yyyy')}
                            </div>
                            <div className="text-[10px] text-gray-400 font-semibold">
                              {format(new Date(rec.date + 'T00:00:00'), 'EEEE')}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                                {absentEmp ? absentEmp.name.split(' ').map(n => n[0]).join('').slice(0,2) : 'A'}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 text-sm">{absentEmp?.name || 'Unknown Employee'}</div>
                                <div className="text-[10px] text-gray-400 font-semibold">{absentEmp?.mobileNumber || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-xs font-semibold text-gray-700">{absentEmp?.designation || 'Staff'}</div>
                            <div className="text-[10px] text-gray-400 font-semibold">{absentEmp?.department || 'N/A'}</div>
                          </td>
                          <td className="p-4">
                            {relieverEmp ? (
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                                  {relieverEmp.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 text-sm">{relieverEmp.name}</div>
                                  <div className="text-[10px] text-gray-400 font-semibold">{relieverEmp.mobileNumber}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300 font-semibold italic">Not Assigned</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="text-xs font-semibold text-gray-700">{relieverEmp?.designation || '—'}</div>
                            <div className="text-[10px] text-gray-400 font-semibold">{relieverEmp?.department || '—'}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
