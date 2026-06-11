import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Employee, Payroll } from '../types';
import { Calculator, Download, Printer, Loader2 } from 'lucide-react';
import { getDaysInMonth, format } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { SalarySlip } from '../components/SalarySlip';

export function PayrollView() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [printPayroll, setPrintPayroll] = useState<{ payroll: Payroll; emp: Employee; org: Organization } | null>(null);

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        const orgs = await api.organizations.getAll();
        setOrganizations(orgs.filter(o => o.status === 'Active'));
      } catch (err) {
        console.error('Failed to load organizations:', err);
      }
    };
    loadOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrgId && selectedMonth) {
      loadExisting();
    }
  }, [selectedOrgId, selectedMonth]);

  const loadExisting = async () => {
    try {
      const [empData, payrollData] = await Promise.all([
        api.employees.getAll(),
        api.payrolls.getAll(selectedMonth),
      ]);
      const orgEmps = empData.filter(e => e.organizationId === selectedOrgId);
      setEmployees(empData);
      const empIds = new Set(orgEmps.map(e => e.id));
      setPayrolls(payrollData.filter(p => empIds.has(p.employeeId)));
    } catch (err) {
      console.error('Failed to load existing payroll:', err);
    }
  };

  const generatePayroll = async () => {
    if (!selectedOrgId || !selectedMonth) return alert('Select Organization and Month');
    setIsLoading(true);

    try {
      const [empData, attendanceData, advancesData] = await Promise.all([
        api.employees.getAll(),
        api.attendance.getByDateAndOrg(selectedMonth, selectedOrgId),
        api.advances.getAll(),
      ]);

      const year = parseInt(selectedMonth.split('-')[0]);
      const month = parseInt(selectedMonth.split('-')[1]) - 1;
      const totalDaysInMonth = getDaysInMonth(new Date(year, month, 1));

      const orgEmployees = empData.filter(e => e.organizationId === selectedOrgId && e.status === 'Active');
      const monthAttendance = attendanceData.filter(a => a.date.startsWith(selectedMonth));
      const monthAdvances = advancesData.filter(a => a.date.startsWith(selectedMonth));

      const generated: Payroll[] = [];

      for (const emp of orgEmployees) {
        const empAtt = monthAttendance.filter(a => a.employeeId === emp.id);
        const empAdv = monthAdvances.filter(a => a.employeeId === emp.id).reduce((sum, a) => sum + Number(a.amount), 0);

        let presentCount = 0, absentCount = 0, halfDayCount = 0, otHours = 0;
        empAtt.forEach(a => {
          if (a.status === 'Present') presentCount++;
          if (a.status === 'Absent') absentCount++;
          if (a.status === 'Half Day') halfDayCount++;
          otHours += Number(a.overtimeHours);
        });

        const otAmount = otHours * (Number(emp.overtimeRatePerHour) || 0);
        let grossSalary = 0;

        if (emp.salaryType === 'Daily Wage') {
          const dailyWage = Number(emp.dailyWageAmount) || 0;
          grossSalary = (presentCount * dailyWage) + (halfDayCount * (dailyWage / 2));
        } else {
          const monthlyRaw = Number(emp.monthlySalaryAmount) || 0;
          const payableDays = totalDaysInMonth - absentCount - (halfDayCount * 0.5);
          grossSalary = (monthlyRaw / totalDaysInMonth) * payableDays;
        }

        grossSalary += otAmount;
        const netSalary = Math.max(0, grossSalary - empAdv);

        const plData: Omit<Payroll, 'id'> = {
          employeeId: emp.id,
          month: selectedMonth,
          presentDays: presentCount,
          absentDays: absentCount,
          halfDays: halfDayCount,
          overtimeHours: otHours,
          grossSalary: parseInt(grossSalary.toFixed(0)),
          advanceDeductions: empAdv,
          netSalary: parseInt(netSalary.toFixed(0)),
          generatedAt: new Date().toISOString(),
        };

        const saved = await api.payrolls.upsert(plData);
        generated.push(saved);
      }

      const org = organizations.find(o => o.id === selectedOrgId);
      await api.logs.create({
        timestamp: new Date().toISOString(),
        action: 'Payroll Generation',
        description: `Generated payroll for ${generated.length} employees in ${org?.name || 'Organization'} for ${selectedMonth}`,
      });

      setEmployees(empData);
      setPayrolls(generated);
    } catch (err) {
      console.error('Payroll generation failed:', err);
      alert('Payroll generation failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = (payroll: Payroll) => {
    const emp = employees.find(e => e.id === payroll.employeeId);
    const org = organizations.find(o => o.id === selectedOrgId);
    if (!emp || !org) return;
    setPrintPayroll({ payroll, emp, org });
    setTimeout(() => window.print(), 150);
  };

  const generateSalarySlip = (payroll: Payroll) => {
    const emp = employees.find(e => e.id === payroll.employeeId);
    const org = organizations.find(o => o.id === selectedOrgId);
    if (!emp || !org) return;

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(org.name, 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(org.address, 105, 28, { align: 'center' });
    doc.text(`Salary Slip - ${selectedMonth}`, 105, 36, { align: 'center' });
    doc.line(14, 45, 196, 45);

    doc.setFontSize(11);
    doc.text(`Employee Name: ${emp.name}`, 14, 55);
    doc.text(`Employee ID: ${emp.id.slice(0, 8).toUpperCase()}`, 14, 62);
    doc.text(`Designation: ${emp.designation}`, 14, 69);
    doc.text(`Department: ${emp.department || 'N/A'}`, 14, 76);
    doc.line(14, 85, 196, 85);

    doc.text(`Present: ${payroll.presentDays}`, 14, 95);
    doc.text(`Absent: ${payroll.absentDays}`, 70, 95);
    doc.text(`Half Days: ${payroll.halfDays}`, 120, 95);
    doc.text(`OT Hours: ${payroll.overtimeHours}`, 160, 95);

    const otRate = Number(emp.overtimeRatePerHour) || 0;
    (doc as any).autoTable({
      startY: 105,
      head: [['Earnings', 'Amount (₹)', 'Deductions', 'Amount (₹)']],
      body: [
        ['Basic Earnings', payroll.grossSalary - (payroll.overtimeHours * otRate), 'Advances', payroll.advanceDeductions],
        ['Overtime Allowance', payroll.overtimeHours * otRate, '', ''],
      ],
      foot: [['Gross Salary', payroll.grossSalary, 'Total Deductions', payroll.advanceDeductions]],
      theme: 'grid',
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Net Pay: ₹${payroll.netSalary}`, 14, finalY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a computer generated document and requires no signature.', 105, 280, { align: 'center' });
    doc.save(`SalarySlip_${emp.name.replace(/\s+/g, '_')}_${selectedMonth}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <select
              value={selectedOrgId}
              onChange={e => setSelectedOrgId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
            >
              <option value="">Select Organization</option>
              {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-full md:w-auto">
            <button
              onClick={generatePayroll}
              disabled={isLoading || !selectedOrgId || !selectedMonth}
              className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Calculating...</> : <><Calculator className="w-5 h-5" /> Generate</>}
            </button>
          </div>
        </div>
      </div>

      {payrolls.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Payroll Register - {selectedMonth}</h3>
            <span className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              Total Payout: ₹{payrolls.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="p-4 font-semibold">Employee</th>
                  <th className="p-4 font-semibold">P / A / HD</th>
                  <th className="p-4 font-semibold">OT Hrs</th>
                  <th className="p-4 font-semibold">Gross (₹)</th>
                  <th className="p-4 font-semibold text-red-600">Advance (₹)</th>
                  <th className="p-4 font-semibold text-green-700">Net Salary (₹)</th>
                  <th className="p-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrolls.map(p => {
                  const emp = employees.find(e => e.id === p.employeeId);
                  if (!emp) return null;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-xs text-gray-500">{emp.designation}</div>
                      </td>
                      <td className="p-4 text-sm whitespace-nowrap">
                        <span className="text-green-600 font-medium">{p.presentDays}</span> /
                        <span className="text-red-500 font-medium ml-1">{p.absentDays}</span> /
                        <span className="text-yellow-600 font-medium ml-1">{p.halfDays}</span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{p.overtimeHours}</td>
                      <td className="p-4 text-sm font-medium text-gray-800">₹{Number(p.grossSalary).toLocaleString()}</td>
                      <td className="p-4 text-sm font-medium text-red-600">₹{Number(p.advanceDeductions).toLocaleString()}</td>
                      <td className="p-4 text-sm font-bold text-green-700 text-lg">₹{Number(p.netSalary).toLocaleString()}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handlePrint(p)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition font-medium">
                            <Printer className="w-3.5 h-3.5" /> Print A4
                          </button>
                          <button onClick={() => generateSalarySlip(p)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition font-medium">
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {printPayroll && (
        <SalarySlip payroll={printPayroll.payroll} employee={printPayroll.emp} organization={printPayroll.org} />
      )}
    </div>
  );
}
