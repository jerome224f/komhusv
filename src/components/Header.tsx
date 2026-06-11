import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Check, Info, AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { SystemNotification } from '../types';
import { format, parseISO, isValid } from 'date-fns';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
  title: string;
  user: { username: string; role: string; name: string } | null;
}

export function Header({ setSidebarOpen, title, user }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const list = await api.notifications.getAll();
    setNotifications(list);
    setUnreadCount(list.filter(n => !n.read).length);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await api.notifications.markAsRead(id);
    await fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await api.notifications.markAllAsRead();
    await fetchNotifications();
    setShowNotifications(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'alert': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between sticky top-0 z-10 transition-shadow print:hidden">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-1 -ml-1 text-gray-500 hover:text-gray-700 md:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800 capitalize">
          {title.replace('-', ' ')}
        </h1>
      </div>
      
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        <button 
          className="text-gray-400 hover:text-gray-600 relative p-2 rounded-full hover:bg-gray-100 transition-colors"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md"
                >
                  <Check className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-[70vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                  <Bell className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm">No notifications yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors cursor-default ${!n.read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {n.title}
                          </h4>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {n.timestamp && isValid(parseISO(n.timestamp))
                              ? format(parseISO(n.timestamp), 'MMM d, HH:mm')
                              : ''}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${!n.read ? 'text-gray-700' : 'text-gray-500'}`}>
                          {n.message}
                        </p>
                        {!n.read && (
                          <div className="mt-2 flex justify-end">
                            <button 
                              onClick={() => handleMarkAsRead(n.id)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                              Mark as read
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold border border-blue-500 text-xs shadow-sm shadow-blue-500/10">
          {user ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
        </div>
      </div>
    </header>
  );
}
