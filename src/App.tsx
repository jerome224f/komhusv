import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './views/Dashboard';
import { Organizations } from './views/Organizations';
import { DepartmentsView } from './views/Departments';
import { Employees } from './views/Employees';
import { Attendance } from './views/Attendance';
import { PayrollView } from './views/Payroll';
import { Advances } from './views/Advances';
import { Reports } from './views/Reports';
import { Settings } from './views/Settings';
import { ActivityLogView } from './views/ActivityLog';
import { Login } from './views/Login';
import { MigrateData } from './views/MigrateData';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; role: string; name: string } | null>(() => {
    const saved = localStorage.getItem('vstaff_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLoginSuccess = (loggedInUser: { username: string; role: string; name: string }) => {
    setUser(loggedInUser);
    localStorage.setItem('vstaff_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vstaff_user');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'organizations': return <Organizations />;
      case 'departments': return <DepartmentsView />;
      case 'employees': return <Employees />;
      case 'attendance': return <Attendance />;
      case 'payroll': return <PayrollView />;
      case 'advances': return <Advances />;
      case 'reports': return <Reports />;
      case 'activity_log': return <ActivityLogView />;
      case 'settings': return <Settings />;
      case 'migrate': return <MigrateData />;
      default: return <Dashboard />;
    }
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        user={user}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden print-wrapper">
        <Header setSidebarOpen={setIsSidebarOpen} title={currentView} user={user} />
        <main className="flex-1 overflow-y-auto print-overflow-visible">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
