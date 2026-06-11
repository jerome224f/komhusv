import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Employee, Organization, Department, Payroll } from '../types';
import { Download, FileSpreadsheet, FileText, Table, Layers, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      try {
        const [empData, orgData, deptData] = await Promise.all([
          api.employees.getAll(),
          api.organizations.getAll(),
          api.departments.getAll(),
        ]);
        setEmployees(empData);
        setOrganizations(orgData);
        setDepartments(deptData);
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAll();
  }, []);

  useEffect(() => {
    const loadPayrolls = async () => {
      try {
        const data = await api.payrolls.getAll(selectedMonth);
        setPayrolls(data);
      } catch (err) {
        console.error('Failed to load payrolls:', err);
      }
    };
    loadPayrolls();
  }, [selectedMonth]);

  const handleExportDepartmentRoster = () => {
    let filteredEmps = employees;
    if (selectedDepartment !== 'all') {
      const targetDept = departments.find(d => d.id === selectedDepartment);
      filteredEmps = employees.filter(e => e.department === targetDept?.name);
    }
    if (filteredEmps.length === 0) return alert('No employees found for this department filter.');

    const headers = ['Employee Name', 'Organization', 'Department', 'Designation', 'Mobile', 'Status', 'Salary Type', 'Base Salary/Wage'];
    const rows = filteredEmps.map(emp => {
      const org = organizations.find(o => o.id === emp.organizationId);
      return [
        `"${emp.name}"`,
        `"${org?.name || 'Unassigned'}"`,
        `"${emp.department || 'N/A'}"`,
        `"${emp.designation || 'N/A'}"`,
        `"${emp.mobileNumber}"`,
        `"${emp.status}"`,
        `"${emp.salaryType}"`,
        emp.salaryType === 'Monthly Salary' ? emp.monthlySalaryAmount : emp.dailyWageAmount,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Department_Roster_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCurrentMonthPayroll = () => {
    if (payrolls.length === 0) return alert('No payroll data for this month.');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Monthly Payroll Summary', pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    try {
      doc.text(`Billing Month: ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}`, pageWidth / 2, 30, { align: 'center' });
    } catch (e) {
      doc.text(`Billing Month: ${selectedMonth}`, pageWidth / 2, 30, { align: 'center' });
    }

    let finalY = 40;
    let grandTotal = 0;

    const orgMap: Record<string, typeof payrolls> = {};
    payrolls.forEach(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      const orgId = emp?.organizationId || 'unassigned';
      if (!orgMap[orgId]) orgMap[orgId] = [];
      orgMap[orgId].push(p);
    });

    Object.keys(orgMap).forEach(orgId => {
      const orgPayrolls = orgMap[orgId];
      const org = organizations.find(o => o.id === orgId);
      const orgName = org?.name || 'Unassigned Organization';

      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'bold');
      doc.text(orgName, 14, finalY);
      finalY += 5;

      let orgTotal = 0;
      const bodyData: any[][] = orgPayrolls.map(p => {
        const emp = employees.find(e => e.id === p.employeeId);
        orgTotal += Number(p.netSalary);
        return [
          emp?.name || 'Unknown',
          emp?.designation || '-',
          `${p.presentDays}`,
          `${p.absentDays}`,
          `Rs. ${Number(p.grossSalary).toLocaleString()}`,
          `Rs. ${Number(p.advanceDeductions).toLocaleString()}`,
          `Rs. ${Number(p.netSalary).toLocaleString()}`,
        ];
      });

      grandTotal += orgTotal;
      bodyData.push([
        { content: 'Total for ' + orgName, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `Rs. ${orgTotal.toLocaleString()}`, styles: { fontStyle: 'bold' } },
      ]);

      autoTable(doc, {
        startY: finalY,
        head: [['Employee Name', 'Designation', 'Present', 'Absent', 'Gross Salary', 'Deductions', 'Net Pay']],
        body: bodyData,
        theme: 'striped',
        headStyles: { fillColor: [63, 81, 181] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
        columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
      });
      finalY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.setFillColor(240, 240, 240);
    doc.rect(14, finalY, pageWidth - 28, 20, 'F');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Grand Total Payout:', 20, finalY + 13);
    doc.text(`Rs. ${grandTotal.toLocaleString()}`, pageWidth - 20, finalY + 13, { align: 'right' });
    doc.save(`PayrollCost_${selectedMonth}.pdf`);
  };

  const exportToExcel = () => {
    if (payrolls.length === 0) return alert('No payroll data for this month.');
    const headers = ['Organization', 'Employee Name', 'Designation', 'Present Days', 'Absent Days', 'Gross Salary (Rs)', 'Deductions (Rs)', 'Net Pay (Rs)'];
    const rows = payrolls.map(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      const org = organizations.find(o => o.id === emp?.organizationId);
      return [
        `"${org?.name || 'Unassigned'}"`,
        `"${emp?.name || 'Unknown'}"`,
        `"${emp?.designation || ''}"`,
        p.presentDays,
        p.absentDays,
        p.grossSalary,
        p.advanceDeductions,
        p.netSalary,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PayrollSummary_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-6">System Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 flex flex-col items-center text-center">
            <FileSpreadsheet className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="font-semibold text-lg text-gray-800 mb-2">Monthly Payroll Summary</h3>
            <p className="text-sm text-gray-600 mb-6">Generated cost sheet for all organizations combined for a select month.</p>
            <div className="flex flex-col sm:flex-row w-full gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg bg-white"
              />
              <div className="flex gap-2">
                <button onClick={exportCurrentMonthPayroll} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm" title="Download PDF">
                  <FileText className="w-4 h-4" /> PDF
                </button>
                <button onClick={exportToExcel} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm" title="Download Excel / CSV">
                  <Table className="w-4 h-4" /> Excel
                </button>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 flex flex-col items-center text-center">
            <Layers className="w-12 h-12 text-indigo-600 mb-4" />
            <h3 className="font-semibold text-lg text-gray-800 mb-2">Department Roster Report</h3>
            <p className="text-sm text-gray-600 mb-6">Generate an employee roster filtered by specific departments across your organizations.</p>
            <div className="flex flex-col sm:flex-row w-full gap-3">
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg bg-white"
              >
                <option value="all">All Departments</option>
                {departments.map(d => {
                  const org = organizations.find(o => o.id === d.organizationId);
                  return <option key={d.id} value={d.id}>{d.name} ({org?.name || 'Unknown'})</option>;
                })}
              </select>
              <button onClick={handleExportDepartmentRoster} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm">
                <Table className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
