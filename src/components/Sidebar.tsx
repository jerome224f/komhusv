import React from 'react';
import { LayoutDashboard, Users, Building2, Layers, CalendarCheck, FileSpreadsheet, Banknote, FileBarChart, History, Menu, X, LogOut, Settings as SettingsIcon } from 'lucide-react';
import logo from '../assets/logo.png';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: { username: string; role: string; name: string } | null;
  onLogout: () => void;
}

export function Sidebar({ currentView, setCurrentView, isOpen, setIsOpen, user, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'organizations', label: 'Organizations', icon: Building2 },
    { id: 'departments', label: 'Departments', icon: Layers },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'payroll', label: 'Payroll', icon: FileSpreadsheet },
    { id: 'advances', label: 'Advances', icon: Banknote },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'activity_log', label: 'Activity Log', icon: History },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleLogout = () => {
    onLogout();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 bg-white border-r border-gray-200 text-gray-600 w-64 z-30 print:hidden shrink-0 flex flex-col h-full
        transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 shrink-0">
          <span className="text-xl font-black text-blue-600 flex items-center gap-2 tracking-tight">
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
            Workforce HRMS
          </span>
          <button className="md:hidden text-gray-500 hover:text-gray-800" onClick={() => setIsOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto flex-1 hide-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  if (window.innerWidth < 768) setIsOpen(false);
                }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all group ${
                  isActive 
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' 
                    : 'text-gray-600 hover:bg-blue-50/60 hover:text-blue-700 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200 shrink-0 space-y-3 bg-gray-50/50">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-50/50 border border-blue-100/80 rounded-xl">
              <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-blue-500/10">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-[10px] text-blue-600 font-medium truncate">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors hover:bg-red-50 hover:text-red-600 text-gray-500 font-medium text-sm group"
          >
            <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}
