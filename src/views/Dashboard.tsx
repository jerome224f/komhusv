import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Organization, Employee } from '../types';
import {
  Building2, Users, CalendarCheck, CalendarOff, FileSpreadsheet,
  AlertCircle, Loader2, UserCheck, UserMinus
} from 'lucide-react';
import { format } from 'date-fns';

interface RelieverInfo {
  name: string;
  type: 'Internal' | 'External';
  mobileNumber?: string;
}

interface AbsentEntry {
  employee: Employee;
  org: Organization;
  reliever: RelieverInfo | null;
}

export function Dashboard() {
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    leaveToday: 0,
    payrollCost: 0,
    totalRelievers: 0,
    relieversToday: 0,
  });

  const [absentEmployeesToday, setAbsentEmployeesToday] = useState<AbsentEntry[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ date: string; percentage: number | null; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const data: any = await api.dashboard.getStats();
      setStats({
        totalOrganizations: data.totalOrganizations ?? 0,
        totalEmployees: data.totalEmployees ?? 0,
        presentToday: data.presentToday ?? 0,
        absentToday: data.absentToday ?? 0,
        leaveToday: data.leaveToday ?? 0,
        payrollCost: data.payrollCost ?? 0,
        totalRelievers: data.totalRelievers ?? 0,
        relieversToday: data.relieversToday ?? 0,
      });
      setAbsentEmployeesToday(data.absentEmployeesToday || []);
      setHeatmapData(data.heatmapData || []);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Organizations',     value: stats.totalOrganizations,                      icon: Building2,     color: 'bg-blue-500'   },
    { label: 'Total Employees',          value: stats.totalEmployees,                           icon: Users,         color: 'bg-indigo-500' },
    { label: 'Present Today',            value: stats.presentToday,                             icon: CalendarCheck, color: 'bg-green-500'  },
    { label: 'Absent Today',             value: stats.absentToday,                              icon: CalendarOff,   color: 'bg-red-500'    },
    { label: 'On Leave Today',           value: stats.leaveToday,                               icon: AlertCircle,   color: 'bg-orange-500' },
    { label: 'This Month Payroll',       value: `₹${stats.payrollCost.toLocaleString()}`,       icon: FileSpreadsheet, color: 'bg-purple-500' },
    { label: 'Total Relievers',          value: stats.totalRelievers,                           icon: UserCheck,     color: 'bg-teal-500'   },
    { label: 'Relievers On Duty Today',  value: stats.relieversToday,                           icon: UserMinus,     color: 'bg-cyan-500'   },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* Alert Banner */}
      {absentEmployeesToday.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-bold">
              Attention: {absentEmployeesToday.length} Absent Employee{absentEmployeesToday.length > 1 ? 's' : ''} Today
            </h3>
            <p className="text-red-600 text-sm mt-1">
              Please review the list of absentees and take necessary actions.
              {stats.relieversToday > 0 && (
                <span className="ml-2 font-semibold text-teal-700">
                  {stats.relieversToday} reliever{stats.relieversToday > 1 ? 's' : ''} assigned.
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-500">Welcome to V-Staff. Here is a summary of your organization's daily activities.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const isAbsentCard = stat.label === 'Absent Today';
          const hasAbsentees = isAbsentCard && typeof stat.value === 'number' && stat.value > 0;
          return (
            <div
              key={i}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden ${hasAbsentees ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
            >
              {hasAbsentees && (
                <div className="absolute top-0 right-0 p-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl text-white ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Absentees */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="relative flex h-3 w-3 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            Today's Absentees
          </h3>
          <div className="flex items-center gap-2">
            {stats.relieversToday > 0 && (
              <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-semibold border border-teal-100">
                {stats.relieversToday} Reliever{stats.relieversToday > 1 ? 's' : ''} Assigned
              </span>
            )}
            <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-semibold border border-red-100">
              {absentEmployeesToday.length} Absent
            </span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 bg-gray-50/50">
          {absentEmployeesToday.length === 0 ? (
            <div className="p-10 text-center text-gray-500 flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CalendarCheck className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-medium text-gray-900">Everyone is present today!</p>
              <p className="text-sm mt-1 text-gray-500">No employees have been marked as absent.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {absentEmployeesToday.map((item, idx) => (
                <li key={idx} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {item.employee.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{item.employee.name}</span>
                      <span className="text-xs text-gray-500">{item.org.name} | {item.employee.mobileNumber}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-100">
                      Absent
                    </span>
                    {item.reliever ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-100 rounded-full">
                        <UserCheck className="w-3 h-3 text-teal-600" />
                        <span className="text-xs font-semibold text-teal-700">{item.reliever.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${item.reliever.type === 'Internal' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {item.reliever.type}
                        </span>
                      </div>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-semibold rounded-full border border-yellow-100">
                        No Reliever
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Attendance Heatmap */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            Organizational Attendance Heatmap
          </h3>
          <span className="text-sm font-semibold text-blue-600 px-4 py-1.5 bg-blue-50 rounded-full border border-blue-100">
            {format(new Date(), 'MMMM yyyy')}
          </span>
        </div>

        <div className="pb-2">
          <div className="w-full">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-500 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-1 uppercase tracking-wider">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {heatmapData.length > 0 &&
                Array.from({ length: new Date(heatmapData[0].date + 'T00:00:00').getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-11 sm:h-12 rounded-xl bg-transparent" />
                ))}

              {heatmapData.map((data, idx) => {
                let colorClass = 'bg-gray-50 border-gray-100 text-gray-300 border-dashed opacity-60';
                if (data.percentage !== null) {
                  if (data.percentage >= 90)      colorClass = 'bg-blue-600 border-blue-700 shadow-sm text-white';
                  else if (data.percentage >= 70) colorClass = 'bg-blue-400 border-blue-500 text-white';
                  else if (data.percentage >= 50) colorClass = 'bg-blue-200 border-blue-300 text-blue-900';
                  else if (data.percentage > 0)   colorClass = 'bg-blue-50 border-blue-100 text-blue-800';
                  else                            colorClass = 'bg-red-50 text-red-700 border-red-100';
                } else if (data.label === 'Future') {
                  colorClass = 'bg-gray-50 border-gray-100 text-gray-300 border-dashed';
                }
                const dayNum = new Date(data.date + 'T00:00:00').getDate();
                return (
                  <div
                    key={idx}
                    className={`h-11 sm:h-12 flex flex-col justify-between p-1.5 rounded-lg border transition-all duration-200 hover:-translate-y-0.5 ${colorClass}`}
                    title={data.label}
                  >
                    <span className="text-xs font-bold leading-none">{dayNum}</span>
                    <span className="text-[10px] sm:text-xs font-black self-end leading-none">
                      {data.percentage !== null ? `${Math.round(data.percentage)}%` : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-blue-600 rounded border border-blue-700"></div> <span className="font-semibold text-gray-600">90-100%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-blue-400 rounded border border-blue-500"></div> <span className="font-semibold text-gray-600">70-89%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-blue-200 rounded border border-blue-300"></div> <span className="font-semibold text-gray-600">50-69%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-blue-50 rounded border border-blue-100"></div> <span className="font-semibold text-gray-600">1-49%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-red-50 rounded border border-red-100"></div> <span className="font-semibold text-gray-600">0%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-gray-50 rounded border border-dashed border-gray-100"></div> <span className="font-semibold text-gray-500">No Data / Future</span></div>
        </div>
      </div>

    </div>
  );
}
