import React, { useState, useRef } from 'react';
import { api } from '../lib/api';
import { Employee, Organization } from '../types';
import { Upload, Download, AlertCircle, CheckCircle, FileSpreadsheet, Loader2, X, Trash2 } from 'lucide-react';

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess: () => Promise<void>;
  organizations: Organization[];
}

interface ParsedRow {
  index: number;
  data: Partial<Employee> & { organizationName?: string };
  errors: string[];
  isValid: boolean;
}

export function BulkImportModal({ onClose, onSuccess, organizations }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download high-quality CSV template
  const handleDownloadTemplate = () => {
    // Provide a sample organization ID from active list if possible for convenience
    const sampleOrgId = organizations.length > 0 ? organizations[0].id : "org_123";
    const headers = [
      'name',
      'mobileNumber',
      'gender',
      'dob',
      'address',
      'aadhaarNumber',
      'organizationId',
      'department',
      'designation',
      'joiningDate',
      'status',
      'salaryType',
      'dailyWageAmount',
      'monthlySalaryAmount',
      'overtimeRatePerHour'
    ].join(',');

    const firstSample = [
      '"Amit Sharma"',
      '"9876543210"',
      '"Male"',
      '"1992-06-15"',
      '"122 Green View Apartments, Delhi"',
      '"123456789012"',
      `"${sampleOrgId}"`,
      '"Engineering"',
      '"Senior Engineer"',
      '"2024-01-10"',
      '"Active"',
      '"Monthly Salary"',
      '0',
      '45000',
      '200'
    ].join(',');

    const secondSample = [
      '"Pooja Patel"',
      '"8765432109"',
      '"Female"',
      '"1996-12-04"',
      '"402 Residency Lane, Mumbai"',
      '""',
      `"${sampleOrgId}"`,
      '"Human Resources"',
      '"HR Assistant"',
      '"2024-03-01"',
      '"Active"',
      '"Monthly Salary"',
      '0',
      '28000',
      '120'
    ].join(',');

    const csvContent = "data:text/csv;charset=utf-8," + [headers, firstSample, secondSample].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "employees_bulk_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to robustly parse CSV rows, ignoring commas inside double quotes
  const parseCSVText = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }
        row.push(cell.trim());
        if (row.length > 1 || row[0] !== '') {
          result.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    if (row.length > 0 || cell !== '') {
      row.push(cell.trim());
      result.push(row);
    }
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSVText(text);

        if (rows.length < 2) {
          setParsedRows([]);
          setIsProcessing(false);
          return;
        }

        const headers = rows[0].map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
        
        // Find positions of expected columns
        const headerIndexMap: Record<string, number> = {};
        headers.forEach((header, index) => {
          headerIndexMap[header] = index;
        });

        const newParsedRows: ParsedRow[] = [];

        for (let idx = 1; idx < rows.length; idx++) {
          const rawRow = rows[idx];
          if (rawRow.length === 0 || (rawRow.length === 1 && rawRow[0] === '')) continue;

          const getVal = (col: string): string => {
            const pos = headerIndexMap[col];
            if (pos === undefined) return '';
            const cellVal = rawRow[pos];
            return cellVal !== undefined ? cellVal.replace(/^["']|["']$/g, '').trim() : '';
          };

          const name = getVal('name');
          const mobileNumber = getVal('mobilenumber');
          const genderInput = getVal('gender');
          const dob = getVal('dob');
          const address = getVal('address');
          const aadhaarNumber = getVal('aadhaarnumber');
          const organizationId = getVal('organizationid');
          const department = getVal('department');
          const designation = getVal('designation');
          const joiningDate = getVal('joiningdate');
          const statusInput = getVal('status');
          const salaryTypeInput = getVal('salarytype');
          const dailyWageAmount = Number(getVal('dailywageamount')) || 0;
          const monthlySalaryAmount = Number(getVal('monthlysalaryamount')) || 0;
          const overtimeRatePerHour = Number(getVal('overtimerateperhour')) || 0;

          const errors: string[] = [];

          // Standard Validation Rules
          if (!name) errors.push('Required: Full Name is missing.');
          
          if (!mobileNumber) {
            errors.push('Required: Mobile Number is missing.');
          } else if (!/^[0-9]{10}$/.test(mobileNumber)) {
            errors.push('Invalid format: Mobile Number must be exactly 10 digits.');
          }

          let gender: any = 'Male';
          if (genderInput) {
            const normalizedGender = genderInput.toLowerCase();
            if (normalizedGender === 'male') gender = 'Male';
            else if (normalizedGender === 'female') gender = 'Female';
            else if (normalizedGender === 'other') gender = 'Other';
            else {
              errors.push('Invalid format: Gender must be Male, Female, or Other.');
            }
          } else {
            errors.push('Required: Gender is missing.');
          }

          if (!dob) errors.push('Required: Date of Birth is missing.');
          if (!address) errors.push('Required: Address is missing.');

          if (aadhaarNumber && !/^[0-9]{12}$/.test(aadhaarNumber)) {
            errors.push('Invalid format: Aadhaar number must be exactly 12 digits.');
          }

          // CRITICAL REQUIREMENT: Validate Organization ID
          if (!organizationId) {
            errors.push('Required: Organization ID is missing.');
          } else {
            const orgExists = organizations.some(o => o.id === organizationId);
            if (!orgExists) {
              errors.push(`Validation Error: Organization ID "${organizationId}" does not exist in the system.`);
            }
          }

          if (!joiningDate) errors.push('Required: Joining Date is missing.');

          let status: any = 'Active';
          if (statusInput) {
            const normalizedStatus = statusInput.toLowerCase();
            if (normalizedStatus === 'active') status = 'Active';
            else if (normalizedStatus === 'resigned') status = 'Resigned';
            else if (normalizedStatus === 'terminated') status = 'Terminated';
            else {
              errors.push('Invalid format: Status must be Active, Resigned, or Terminated.');
            }
          }

          let salaryType: any = 'Monthly Salary';
          if (salaryTypeInput) {
            const normalizedSalaryType = salaryTypeInput.toLowerCase();
            if (normalizedSalaryType === 'monthly salary' || normalizedSalaryType === 'monthly') {
              salaryType = 'Monthly Salary';
            } else if (normalizedSalaryType === 'daily wage' || normalizedSalaryType === 'daily') {
              salaryType = 'Daily Wage';
            } else {
              errors.push('Invalid format: Salary Type must be "Monthly Salary" or "Daily Wage".');
            }
          }

          if (salaryType === 'Monthly Salary' && monthlySalaryAmount <= 0) {
            errors.push('Validation Error: Monthly Salary must be greater than 0 for Monthly Salary Type.');
          }
          if (salaryType === 'Daily Wage' && dailyWageAmount <= 0) {
            errors.push('Validation Error: Daily Wage must be greater than 0 for Daily Wage Type.');
          }

          const orgObj = organizations.find(o => o.id === organizationId);

          const empData: Partial<Employee> & { organizationName?: string } = {
            name,
            mobileNumber,
            gender,
            dob,
            address,
            aadhaarNumber,
            organizationId,
            organizationName: orgObj ? orgObj.name : 'Unknown',
            department,
            designation,
            joiningDate,
            status,
            salaryType,
            dailyWageAmount,
            monthlySalaryAmount,
            overtimeRatePerHour
          };

          newParsedRows.push({
            index: idx,
            data: empData,
            errors,
            isValid: errors.length === 0
          });
        }

        setParsedRows(newParsedRows);
      } catch (err) {
        console.error(err);
        alert('Failed to parse CSV file. Please make sure the structure is correct.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleBulkImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsSaving(true);
    try {
      let importedCount = 0;
      for (const row of validRows) {
        const empToCreate = {
          name: row.data.name!,
          mobileNumber: row.data.mobileNumber!,
          gender: row.data.gender!,
          dob: row.data.dob!,
          address: row.data.address!,
          aadhaarNumber: row.data.aadhaarNumber || '',
          organizationId: row.data.organizationId!,
          department: row.data.department || '',
          designation: row.data.designation || '',
          joiningDate: row.data.joiningDate!,
          status: row.data.status!,
          salaryType: row.data.salaryType!,
          dailyWageAmount: row.data.dailyWageAmount || 0,
          monthlySalaryAmount: row.data.monthlySalaryAmount || 0,
          overtimeRatePerHour: row.data.overtimeRatePerHour || 0,
        };
        await api.employees.create(empToCreate);
        importedCount++;
      }

      // Log bulk action
      await api.logs.create({
        timestamp: new Date().toISOString(),
        action: 'Bulk Employee Import',
        description: `Successfully imported ${importedCount} employees from CSV bulk upload.`
      });

      // Send System Notification
      await api.notifications.create({
        title: 'Bulk Import Completed',
        message: `Successfully imported ${importedCount} employees based on the uploaded CSV template.`,
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false
      });

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error occurred during bulk import.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setParsedRows([]);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bulk Import Employees</h2>
              <p className="text-xs text-gray-500">Upload a CSV configuration sheet to add multiple workforce records at once</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!file ? (
            <div className="space-y-6">
              {/* Info Guide */}
              <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl flex gap-3.5 text-blue-850">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-sm">
                  <p className="font-semibold text-blue-900">Mandatory Schema Information</p>
                  <p className="leading-relaxed">To ensure clean imports, make sure to follow our structured template. Every row needs a valid, pre-existing <strong className="text-blue-900">Organization ID</strong> from the platform. Rows with invalid Organization IDs will fail verification.</p>
                  <button 
                    onClick={handleDownloadTemplate}
                    className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white font-medium text-xs rounded-lg hover:bg-blue-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Template CSV
                  </button>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
                  dragActive ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 hover:border-blue-500 hover:bg-gray-50/40'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv" 
                  className="hidden" 
                />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-base font-semibold text-gray-800">Drag & drop your employees CSV file here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse your local computer (requires .csv format)</p>
              </div>

              {/* Step By Step Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Step 1</span>
                  <h3 className="font-semibold text-gray-800 mt-2 text-sm">Download Template</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Save the standard template structure to guarantee column names are accurate.</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">Step 2</span>
                  <h3 className="font-semibold text-gray-800 mt-2 text-sm">Enter Worker Info</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Add name, details, and the correct target Organization IDs from your list.</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl">
                  <span className="text-xs font-bold text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded">Step 3</span>
                  <h3 className="font-semibold text-gray-800 mt-2 text-sm">Preview & Verify</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">We parsing the file immediately, identifying errors so you can upload with confidence.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected File Card */}
              <div className="flex items-center justify-between bg-gray-50 border p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-100 text-green-600 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB • {parsedRows.length} total rows parsed</p>
                  </div>
                </div>
                <button 
                  onClick={clearFile}
                  className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove file
                </button>
              </div>

              {/* Status Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-gray-500">Total Rows</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{parsedRows.length}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-green-600">Valid & Ready to Import</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{validCount}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-amber-600">Needs Correction</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{invalidCount}</p>
                </div>
              </div>

              {/* Parsed Rows Preview */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Workforce Preview & Row Validation</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[35vh] overflow-y-auto bg-white">
                  <table className="w-full text-left text-xs border-collapse divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 font-semibold text-gray-700">Row</th>
                        <th className="p-3 font-semibold text-gray-700">Full Name</th>
                        <th className="p-3 font-semibold text-gray-700">Org ID</th>
                        <th className="p-3 font-semibold text-gray-700">Org Name</th>
                        <th className="p-3 font-semibold text-gray-700">Designation</th>
                        <th className="p-3 font-semibold text-gray-700">Salary Type</th>
                        <th className="p-3 font-semibold text-gray-700">Amount</th>
                        <th className="p-3 font-semibold text-gray-700 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isProcessing ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-gray-500">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                            Parsing CSV elements...
                          </td>
                        </tr>
                      ) : parsedRows.map((row) => (
                        <React.Fragment key={row.index}>
                          <tr className={`hover:bg-gray-50/50 ${!row.isValid ? 'bg-red-50/15' : ''}`}>
                            <td className="p-3 font-mono text-gray-400">{row.index}</td>
                            <td className="p-3 font-medium text-gray-900">{row.data.name || <span className="text-red-500 italic">Empty</span>}</td>
                            <td className="p-3 font-mono text-gray-600">{row.data.organizationId || <span className="text-red-500 italic">Empty</span>}</td>
                            <td className="p-3 text-gray-500">{row.data.organizationName}</td>
                            <td className="p-3 text-gray-600">{row.data.designation || '-'}</td>
                            <td className="p-3 text-gray-500">{row.data.salaryType}</td>
                            <td className="p-3 font-medium text-gray-800">
                              {row.data.salaryType === 'Monthly Salary' ? `₹${row.data.monthlySalaryAmount}` : `₹${row.data.dailyWageAmount}`}
                            </td>
                            <td className="p-3 text-right">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                                  <CheckCircle className="w-3 h-3" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-100">
                                  <AlertCircle className="w-3 h-3" /> Invalid
                                </span>
                              )}
                            </td>
                          </tr>
                          {!row.isValid && (
                            <tr className="bg-red-50/30">
                              <td colSpan={8} className="px-3 pb-3 pt-1 border-b border-red-100">
                                <div className="pl-6 space-y-1">
                                  {row.errors.map((err, i) => (
                                    <p key={i} className="text-[10px] text-red-700 flex items-center gap-1.5 font-medium">
                                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" /> {err}
                                    </p>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Close
          </button>
          
          {file && (
            <button 
              type="button" 
              onClick={handleBulkImport}
              disabled={isSaving || isProcessing || validCount === 0}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving rows ({validCount})...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Import {validCount} Valid Employee{validCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
