import React from 'react';
import { Employee, Organization, Payroll } from '../types';
import { format } from 'date-fns';

interface SalarySlipProps {
  payroll: Payroll;
  employee: Employee;
  organization: Organization;
}

export function SalarySlip({ payroll, employee, organization }: SalarySlipProps) {
  const monthName = format(new Date(payroll.month + '-01'), 'MMMM yyyy');
  const basicEarnings = payroll.grossSalary - (payroll.overtimeHours * (employee.overtimeRatePerHour || 0));
  const otEarnings = payroll.overtimeHours * (employee.overtimeRatePerHour || 0);

  return (
    <div className="print-slip hidden print:block text-gray-900 absolute top-0 left-0 w-[210mm] min-h-[297mm] bg-white p-[20mm] z-[9999] font-sans">
      
      {/* Header / Branding */}
      <div className="text-center mb-10 border-b-2 border-gray-800 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight uppercase mb-2">
          {organization.name}
        </h1>
        <p className="text-sm text-gray-600 mb-1">{organization.address}</p>
        <p className="text-sm text-gray-600 mb-4">Email: {organization.email} | Contact: {organization.contactNumber}</p>
        
        <div className="mt-6 inline-block bg-gray-100 px-6 py-2 border border-gray-300">
          <h2 className="text-xl font-bold uppercase tracking-widest text-gray-800">
            Payslip for {monthName}
          </h2>
        </div>
      </div>

      {/* Employee Details Grid */}
      <div className="mb-8 border border-gray-300 rounded overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-gray-300">
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-600 font-medium col-span-1">Employee Name:</span>
              <span className="font-semibold text-gray-900 col-span-2">{employee.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-600 font-medium col-span-1">Employee ID:</span>
              <span className="font-semibold text-gray-900 col-span-2 uppercase">{employee.id.slice(0,8)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-600 font-medium col-span-1">Designation:</span>
              <span className="font-semibold text-gray-900 col-span-2">{employee.designation || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-600 font-medium col-span-1">Department:</span>
              <span className="font-semibold text-gray-900 col-span-2">{employee.department || 'N/A'}</span>
            </div>
          </div>
          
          <div className="p-4 space-y-3 bg-gray-50">
             <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-600 font-medium col-span-1">Total Days:</span>
              <span className="font-semibold text-gray-900 col-span-2">{payroll.presentDays + payroll.absentDays + payroll.halfDays}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-600 font-medium col-span-1">Present:</span>
              <span className="font-semibold text-gray-900 col-span-2">{payroll.presentDays}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-600 font-medium col-span-1">Absent/Half:</span>
              <span className="font-semibold text-gray-900 col-span-2">{payroll.absentDays} / {payroll.halfDays}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-600 font-medium col-span-1">OT Hours:</span>
              <span className="font-semibold text-gray-900 col-span-2">{payroll.overtimeHours} Hrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Details */}
      <table className="w-full mb-8 border border-gray-300 border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-800">
            <th className="py-3 px-4 text-left font-bold border border-gray-300 w-1/2">EARNINGS</th>
            <th className="py-3 px-4 text-left font-bold border border-gray-300 w-1/2">DEDUCTIONS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-0 border border-gray-300 align-top">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-3 px-4 text-sm border-b border-gray-200">Basic Earnings</td>
                    <td className="py-3 px-4 text-sm font-medium text-right border-b border-gray-200 text-gray-900">₹ {basicEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-sm border-b border-gray-200">Overtime Allowance</td>
                    <td className="py-3 px-4 text-sm font-medium text-right border-b border-gray-200 text-gray-900">₹ {otEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {/* Empty rows for layout */}
                  <tr><td className="py-3 px-4">&nbsp;</td><td></td></tr>
                  <tr><td className="py-3 px-4">&nbsp;</td><td></td></tr>
                </tbody>
              </table>
            </td>
            
            <td className="p-0 border border-gray-300 align-top relative">
              <table className="w-full h-full border-collapse">
                 <tbody>
                  <tr>
                    <td className="py-3 px-4 text-sm border-b border-gray-200">Advance Deductions</td>
                    <td className="py-3 px-4 text-sm font-medium text-right border-b border-gray-200 text-gray-900">₹ {payroll.advanceDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr><td className="py-3 px-4">&nbsp;</td><td className="border-b border-gray-200"></td></tr>
                  <tr><td className="py-3 px-4">&nbsp;</td><td></td></tr>
                  <tr><td className="py-3 px-4">&nbsp;</td><td></td></tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border border-gray-300 text-gray-900">
            <td className="p-0 border-r border-gray-300">
               <div className="flex justify-between py-3 px-4 font-bold">
                  <span>Gross Salary</span>
                  <span>₹ {payroll.grossSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
               </div>
            </td>
            <td className="p-0">
               <div className="flex justify-between py-3 px-4 font-bold">
                  <span>Total Deductions</span>
                  <span>₹ {payroll.advanceDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
               </div>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Net Salary Highlight */}
      <div className="flex items-center justify-between mb-16 p-4 border border-gray-800 bg-gray-50">
        <span className="text-lg font-bold text-gray-800 uppercase tracking-wide">Net Pay for the Month</span>
        <span className="text-2xl font-black text-gray-900">₹ {payroll.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>

      {/* Signatures */}
      <div className="mt-20 pt-8 flex justify-between items-end">
        <div className="text-center w-48">
          <div className="border-b border-gray-400 mb-2"></div>
          <span className="text-sm font-medium text-gray-600">Employer Signature</span>
        </div>
        <div className="text-center w-48">
          <div className="border-b border-gray-400 mb-2"></div>
          <span className="text-sm font-medium text-gray-600">Employee Signature</span>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-[20mm] left-[20mm] right-[20mm] text-center border-t border-gray-200 pt-4">
        <p className="text-xs text-gray-500">
          This is a computer generated document and does not require a physical signature unless mandated for record keeping.
        </p>
      </div>

    </div>
  );
}
