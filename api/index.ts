import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { mockDb } from './mockDb';

const app = express();
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://zqcguxgqsmmnubigpdnw.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2d1eGdxc21tbnViaWdwZG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjcyNTgsImV4cCI6MjA5NjMwMzI1OH0.wPOCY3vnMH6P_hsW12LSA34eF5Qaj-sL4QHby2HoEoU';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

let databaseConnected = false;
const forceMockMode = process.env.USE_MOCK_DATA === 'true';

// Naming helpers (snake_case DB <-> camelCase Frontend)
function toCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamel(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

function toSnake(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      const val = obj[key];
      acc[snakeKey] = val === '' ? null : toSnake(val);
      return acc;
    }, {} as any);
  }
  return obj;
}

async function checkConnectionAndSeed() {
  if (forceMockMode) {
    console.log('Force mock mode is enabled via environment variable.');
    return;
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('Supabase credentials missing. Running in mock fallback mode.');
    return;
  }
  try {
    const { count, error } = await supabase.from('organizations').select('id', { count: 'exact', head: true });
    if (error) {
      console.warn('Supabase query failed. Running in mock fallback mode:', error.message);
      return;
    }
    databaseConnected = true;
    console.log('Supabase connected successfully.');

    // Seed if empty
    if (count === 0) {
      console.log('Supabase organizations table is empty. Seeding demo mock data...');
      await seedDatabaseFromMockDb();
    }
  } catch (err: any) {
    console.error('Failed to connect to Supabase. Running in mock fallback mode:', err.message);
  }
}

async function seedDatabaseFromMockDb() {
  try {
    await supabase.from('payrolls').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('advances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('departments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('system_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('relievers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000001'); // preserve default mock user ID

    await supabase.from('users').insert(toSnake(mockDb.users));
    await supabase.from('organizations').insert(toSnake(mockDb.organizations));
    await supabase.from('departments').insert(toSnake(mockDb.departments));
    await supabase.from('employees').insert(toSnake(mockDb.employees));
    await supabase.from('relievers').insert(toSnake(mockDb.relievers));
    await supabase.from('attendance_records').insert(toSnake(mockDb.attendance));
    await supabase.from('advances').insert(toSnake(mockDb.advances));
    await supabase.from('payrolls').insert(toSnake(mockDb.payrolls));
    await supabase.from('activity_logs').insert(toSnake(mockDb.logs));
    await supabase.from('system_notifications').insert(toSnake(mockDb.notifications));
    console.log('Supabase seeding complete!');
  } catch (err: any) {
    console.error('Seeding failed:', err.message);
  }
}

checkConnectionAndSeed();

function useMock(): boolean {
  return forceMockMode || !databaseConnected;
}

// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (useMock()) {
      const user = mockDb.users.find(u => u.username === username.trim() && u.password === password);
      if (user) {
        return res.json({ username: user.username, role: user.role, name: user.name });
      } else {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
    }
    const { data: users, error } = await supabase
      .from('users').select('*')
      .eq('username', username.trim())
      .eq('password', password);
    if (error) throw error;
    if (users && users.length > 0) {
      const user = toCamel(users[0]);
      return res.json({ username: user.username, role: user.role, name: user.name });
    } else {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// DASHBOARD
// ----------------------------------------------------
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().substring(0, 7);

    if (useMock()) {
      const orgsCount = mockDb.organizations.filter(o => o.status === 'Active').length;
      const empsCount = mockDb.employees.filter(e => e.status === 'Active').length;
      const attendanceToday = mockDb.attendance.filter(a => a.date === todayStr);
      const activeEmps = mockDb.employees.filter(e => e.status === 'Active');
      const activeOrgs = mockDb.organizations.filter(o => o.status === 'Active');
      const payrollsThisMonth = mockDb.payrolls.filter(p => p.month === currentMonth);
      const allAttendance = mockDb.attendance;
      const relCount = mockDb.relievers.length;
      const relieversList = mockDb.relievers;

      let presentToday = 0, absentToday = 0, leaveToday = 0, relieversToday = 0;
      const absentEmployeesToday: any[] = [];

      attendanceToday.forEach((att: any) => {
        if (att.status === 'Present' || att.status === 'Half Day') presentToday++;
        if (att.status === 'Leave') leaveToday++;
        if (att.status === 'Absent') {
          absentToday++;
          const emp = activeEmps.find((e: any) => e.id === att.employee_id);
          if (emp) {
            const org = activeOrgs.find((o: any) => o.id === emp.organization_id);
            if (org) {
              let relieverInfo: any = null;
              if (att.reliever_id) {
                const rel = relieversList.find((r: any) => r.id === att.reliever_id);
                if (rel) relieverInfo = { name: rel.name, type: 'External', mobileNumber: rel.mobile_number };
              } else if (att.reliever_employee_id) {
                const relEmp = activeEmps.find((e: any) => e.id === att.reliever_employee_id);
                if (relEmp) relieverInfo = { name: relEmp.name, type: 'Internal', mobileNumber: relEmp.mobile_number };
              }
              if (relieverInfo) relieversToday++;
              absentEmployeesToday.push({ employee: toCamel(emp), org: toCamel(org), reliever: relieverInfo });
            }
          }
        }
      });

      const payrollCost = payrollsThisMonth.reduce((sum, p) => sum + Number(p.net_salary), 0);
      const heatmapData: any[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const dateCopy = new Date(d);
        dateCopy.setHours(0, 0, 0, 0);
        const formattedDate = dateCopy.toISOString().split('T')[0];
        if (dateCopy > today) {
          heatmapData.push({ date: formattedDate, percentage: null, label: 'Future' });
        } else {
          const dayAtt = allAttendance.filter((a: any) => a.date === formattedDate);
          if (dayAtt.length === 0) {
            heatmapData.push({ date: formattedDate, percentage: null, label: 'No Data' });
          } else {
            let presentCount = 0;
            dayAtt.forEach((a: any) => { if (a.status === 'Present' || a.status === 'Half Day') presentCount++; });
            const percent = (presentCount / dayAtt.length) * 100;
            heatmapData.push({ date: formattedDate, percentage: percent, label: `${Math.round(percent)}% Present` });
          }
        }
      }

      return res.json({
        totalOrganizations: orgsCount,
        totalEmployees: empsCount,
        presentToday,
        absentToday,
        leaveToday,
        payrollCost,
        absentEmployeesToday,
        heatmapData,
        totalRelievers: relCount,
        relieversToday
      });
    }

    // Run core queries and reliever queries separately so a reliever schema issue doesn't crash the whole dashboard
    const [
      { count: orgsCount, error: orgError },
      { count: empsCount, error: empError },
      { data: attendanceToday, error: attError },
      { data: activeEmps, error: activeEmpsError },
      { data: activeOrgs, error: activeOrgsError },
      { data: payrollsThisMonth, error: prError },
      { data: allAttendance, error: allAttError },
    ] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('attendance_records').select('*').eq('date', todayStr),
      supabase.from('employees').select('*').eq('status', 'Active'),
      supabase.from('organizations').select('*').eq('status', 'Active'),
      supabase.from('payrolls').select('net_salary').eq('month', currentMonth),
      supabase.from('attendance_records').select('*'),
    ]);

    if (orgError) throw orgError;
    if (empError) throw empError;
    if (attError) throw attError;
    if (activeEmpsError) throw activeEmpsError;
    if (activeOrgsError) throw activeOrgsError;
    if (prError) throw prError;
    if (allAttError) throw allAttError;

    // Relievers are optional — if the table doesn't exist yet in schema cache, gracefully return 0
    let relieversList: any[] = [];
    let relCount = 0;
    try {
      const [{ data: rList, error: relListError }, { count: rCount, error: relCountError }] = await Promise.all([
        supabase.from('relievers').select('*'),
        supabase.from('relievers').select('id', { count: 'exact', head: true })
      ]);
      if (!relListError) relieversList = rList || [];
      if (!relCountError) relCount = rCount || 0;
    } catch (_) {
      // relievers table not accessible — skip
    }

    let presentToday = 0, absentToday = 0, leaveToday = 0, relieversToday = 0;
    const absentEmployeesToday: any[] = [];
    const attTodayList = attendanceToday || [];
    const empList = activeEmps || [];
    const orgList = activeOrgs || [];
    const relList = relieversList || [];

    attTodayList.forEach((att: any) => {
      if (att.status === 'Present' || att.status === 'Half Day') presentToday++;
      if (att.status === 'Leave') leaveToday++;
      if (att.status === 'Absent') {
        absentToday++;
        const emp = empList.find((e: any) => e.id === att.employee_id);
        if (emp) {
          const org = orgList.find((o: any) => o.id === emp.organization_id);
          if (org) {
            let relieverInfo: any = null;
            if (att.reliever_id) {
              const rel = relList.find((r: any) => r.id === att.reliever_id);
              if (rel) relieverInfo = { name: rel.name, type: 'External', mobileNumber: rel.mobile_number };
            } else if (att.reliever_employee_id) {
              const relEmp = empList.find((e: any) => e.id === att.reliever_employee_id);
              if (relEmp) relieverInfo = { name: relEmp.name, type: 'Internal', mobileNumber: relEmp.mobile_number };
            }
            if (relieverInfo) relieversToday++;
            absentEmployeesToday.push({ employee: toCamel(emp), org: toCamel(org), reliever: relieverInfo });
          }
        }
      }
    });

    const payrollCost = (payrollsThisMonth || []).reduce((sum: number, p: any) => sum + Number(p.net_salary), 0);
    const heatmapData: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const allAttList = allAttendance || [];

    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const dateCopy = new Date(d);
      dateCopy.setHours(0, 0, 0, 0);
      const formattedDate = dateCopy.toISOString().split('T')[0];
      if (dateCopy > today) {
        heatmapData.push({ date: formattedDate, percentage: null, label: 'Future' });
      } else {
        const dayAtt = allAttList.filter((a: any) => a.date === formattedDate);
        if (dayAtt.length === 0) {
          heatmapData.push({ date: formattedDate, percentage: null, label: 'No Data' });
        } else {
          let presentCount = 0;
          dayAtt.forEach((a: any) => { if (a.status === 'Present' || a.status === 'Half Day') presentCount++; });
          const percent = (presentCount / dayAtt.length) * 100;
          heatmapData.push({ date: formattedDate, percentage: percent, label: `${Math.round(percent)}% Present` });
        }
      }
    }

    res.json({
      totalOrganizations: orgsCount || 0,
      totalEmployees: empsCount || 0,
      presentToday,
      absentToday,
      leaveToday,
      payrollCost,
      absentEmployeesToday,
      heatmapData,
      totalRelievers: relCount || 0,
      relieversToday
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// ORGANIZATIONS
// ----------------------------------------------------
app.get('/api/organizations', async (req, res) => {
  try {
    if (useMock()) {
      const list = [...mockDb.organizations].sort((a, b) => a.name.localeCompare(b.name));
      return res.json(toCamel(list));
    }
    const { data, error } = await supabase.from('organizations').select('*').order('name');
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/organizations/:id', async (req, res) => {
  try {
    if (useMock()) {
      const org = mockDb.organizations.find(o => o.id === req.params.id);
      if (!org) return res.status(404).json({ error: 'Organization not found' });
      return res.json(toCamel(org));
    }
    const { data, error } = await supabase.from('organizations').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/organizations', async (req, res) => {
  try {
    if (useMock()) {
      const org = toSnake(req.body);
      if (!org.id) org.id = randomUUID();
      org.created_at = new Date().toISOString();
      mockDb.organizations.push(org);
      return res.status(201).json(toCamel(org));
    }
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = randomUUID();
    dbPayload.created_at = new Date().toISOString();
    const { data, error } = await supabase.from('organizations').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/organizations/:id', async (req, res) => {
  try {
    if (useMock()) {
      const idx = mockDb.organizations.findIndex(o => o.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Organization not found' });
      const updated = { ...mockDb.organizations[idx], ...toSnake(req.body) };
      mockDb.organizations[idx] = updated;
      return res.json(toCamel(updated));
    }
    const dbPayload = toSnake(req.body);
    const { data, error } = await supabase.from('organizations').update(dbPayload).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/organizations/:id', async (req, res) => {
  try {
    if (useMock()) {
      mockDb.organizations = mockDb.organizations.filter(o => o.id !== req.params.id);
      return res.status(204).end();
    }
    const { error } = await supabase.from('organizations').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ----------------------------------------------------
// DEPARTMENTS
// ----------------------------------------------------
app.get('/api/departments', async (req, res) => {
  try {
    if (useMock()) {
      const list = [...mockDb.departments].sort((a, b) => a.name.localeCompare(b.name));
      return res.json(toCamel(list));
    }
    const { data, error } = await supabase.from('departments').select('*').order('name');
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/departments', async (req, res) => {
  try {
    if (useMock()) {
      const dept = toSnake(req.body);
      if (!dept.id) dept.id = randomUUID();
      mockDb.departments.push(dept);
      return res.status(201).json(toCamel(dept));
    }
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = randomUUID();
    const { data, error } = await supabase.from('departments').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/departments/:id', async (req, res) => {
  try {
    if (useMock()) {
      const idx = mockDb.departments.findIndex(d => d.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Department not found' });
      const updated = { ...mockDb.departments[idx], ...toSnake(req.body) };
      mockDb.departments[idx] = updated;
      return res.json(toCamel(updated));
    }
    const dbPayload = toSnake(req.body);
    const { data, error } = await supabase.from('departments').update(dbPayload).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    if (useMock()) {
      mockDb.departments = mockDb.departments.filter(d => d.id !== req.params.id);
      return res.status(204).end();
    }
    const { error } = await supabase.from('departments').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ----------------------------------------------------
// EMPLOYEES
// ----------------------------------------------------
app.get('/api/employees', async (req, res) => {
  try {
    if (useMock()) {
      const list = [...mockDb.employees].sort((a, b) => a.name.localeCompare(b.name));
      return res.json(toCamel(list));
    }
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/employees/:id', async (req, res) => {
  try {
    if (useMock()) {
      const emp = mockDb.employees.find(e => e.id === req.params.id);
      if (!emp) return res.status(404).json({ error: 'Employee not found' });
      return res.json(toCamel(emp));
    }
    const { data, error } = await supabase.from('employees').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/employees', async (req, res) => {
  try {
    if (useMock()) {
      const emp = toSnake(req.body);
      if (!emp.id) emp.id = randomUUID();
      mockDb.employees.push(emp);
      return res.status(201).json(toCamel(emp));
    }
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = randomUUID();
    const { data, error } = await supabase.from('employees').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/employees/:id', async (req, res) => {
  try {
    if (useMock()) {
      const idx = mockDb.employees.findIndex(e => e.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Employee not found' });
      const updated = { ...mockDb.employees[idx], ...toSnake(req.body) };
      mockDb.employees[idx] = updated;
      return res.json(toCamel(updated));
    }
    const dbPayload = toSnake(req.body);
    const { data, error } = await supabase.from('employees').update(dbPayload).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    if (useMock()) {
      mockDb.employees = mockDb.employees.filter(e => e.id !== req.params.id);
      return res.status(204).end();
    }
    const { error } = await supabase.from('employees').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ----------------------------------------------------
// ATTENDANCE
// ----------------------------------------------------
app.get('/api/attendance', async (req, res) => {
  try {
    if (useMock()) {
      const { date, employeeId, month } = req.query;
      let list = [...mockDb.attendance];
      if (date) {
        const dateStr = date as string;
        if (/^\d{4}-\d{2}$/.test(dateStr)) {
          const from = `${dateStr}-01`;
          const [year, mon] = dateStr.split('-').map(Number);
          const nextMonth = new Date(year, mon, 1);
          const to = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
          list = list.filter(a => a.date >= from && a.date < to);
        } else {
          list = list.filter(a => a.date === dateStr);
        }
      }
      if (month) {
        const monthStr = month as string;
        const from = `${monthStr}-01`;
        const [year, mon] = monthStr.split('-').map(Number);
        const nextMonth = new Date(year, mon, 1);
        const to = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
        list = list.filter(a => a.date >= from && a.date < to);
      }
      if (employeeId) {
        list = list.filter(a => a.employee_id === employeeId);
      }
      return res.json(toCamel(list));
    }
    const { date, employeeId, month } = req.query;
    let query = supabase.from('attendance_records').select('*');
    if (date) {
      const dateStr = date as string;
      if (/^\d{4}-\d{2}$/.test(dateStr)) {
        const [year, mon] = dateStr.split('-').map(Number);
        const from = `${dateStr}-01`;
        const nextMonth = new Date(year, mon, 1);
        const to = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
        query = query.gte('date', from).lt('date', to);
      } else {
        query = query.eq('date', dateStr);
      }
    }
    if (month) {
      const monthStr = month as string;
      const [year, mon] = monthStr.split('-').map(Number);
      const from = `${monthStr}-01`;
      const nextMonth = new Date(year, mon, 1);
      const to = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
      query = query.gte('date', from).lt('date', to);
    }
    if (employeeId) query = query.eq('employee_id', employeeId as string);
    const { data, error } = await query;
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// GET /api/attendance/relievers - attendance records that have a reliever assigned
app.get('/api/attendance/relievers', async (req, res) => {
  try {
    if (useMock()) {
      const { date } = req.query;
      let list = mockDb.attendance.filter(a => a.reliever_employee_id !== null || a.reliever_id !== null);
      if (date && (date as string).length === 7) {
        const from = `${date}-01`;
        const [year, mon] = (date as string).split('-').map(Number);
        const nextMonth = new Date(year, mon, 1);
        const to = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
        list = list.filter(a => a.date >= from && a.date < to);
      } else if (date) {
        list = list.filter(a => a.date === date);
      }
      return res.json(toCamel(list.sort((a, b) => b.date.localeCompare(a.date))));
    }
    const { date } = req.query;
    let query = supabase
      .from('attendance_records')
      .select('*')
      .or('reliever_employee_id.not.is.null,reliever_id.not.is.null');

    if (date && (date as string).length === 7) {
      const [year, mon] = (date as string).split('-').map(Number);
      const from = `${date}-01`;
      const nextMonth = new Date(year, mon, 1);
      const to = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
      query = query.gte('date', from).lt('date', to);
    } else if (date) {
      query = query.eq('date', date as string);
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/attendance/upsert', async (req, res) => {
  try {
    const records = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Request body must be an array of records' });

    if (useMock()) {
      for (const record of records) {
        const employeeId = record.employeeId ?? record.employee_id;
        const date = record.date;
        const status = record.status;
        const overtimeHours = record.overtimeHours ?? record.overtime_hours ?? 0;
        const relieverEmployeeId = record.relieverEmployeeId ?? record.reliever_employee_id ?? null;
        const relieverId = record.relieverId ?? record.reliever_id ?? null;

        if (!employeeId || !date || !status) continue;
        const idx = mockDb.attendance.findIndex(a => a.employee_id === employeeId && a.date === date);
        if (idx > -1) {
          mockDb.attendance[idx] = {
            ...mockDb.attendance[idx],
            status,
            overtime_hours: overtimeHours,
            reliever_employee_id: relieverEmployeeId,
            reliever_id: relieverId
          };
        } else {
          mockDb.attendance.push({
            id: randomUUID(),
            employee_id: employeeId,
            date,
            status,
            overtime_hours: overtimeHours,
            reliever_employee_id: relieverEmployeeId,
            reliever_id: relieverId
          });
        }
      }
      return res.json({ success: true });
    }

    for (const record of records) {
      // Convert camelCase from frontend to snake_case for DB
      const employeeId = record.employeeId ?? record.employee_id;
      const date = record.date;
      const status = record.status;
      const overtimeHours = record.overtimeHours ?? record.overtime_hours ?? 0;
      const relieverEmployeeId = record.relieverEmployeeId ?? record.reliever_employee_id ?? null;
      const relieverId = record.relieverId ?? record.reliever_id ?? null;

      if (!employeeId || !date || !status) {
        continue; // skip malformed records
      }

      const { data: existing, error: checkError } = await supabase
        .from('attendance_records').select('id')
        .eq('employee_id', employeeId).eq('date', date);
      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        const { error: updateError } = await supabase.from('attendance_records')
          .update({
            status,
            overtime_hours: overtimeHours,
            reliever_employee_id: relieverEmployeeId,
            reliever_id: relieverId,
          })
          .eq('id', existing[0].id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('attendance_records').insert([{
          id: randomUUID(),
          employee_id: employeeId,
          date,
          status,
          overtime_hours: overtimeHours,
          reliever_employee_id: relieverEmployeeId,
          reliever_id: relieverId,
        }]);
        if (insertError) throw insertError;
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Attendance upsert error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// RELIEVERS
// ----------------------------------------------------
app.get('/api/relievers', async (req, res) => {
  try {
    const { orgId } = req.query;
    if (useMock()) {
      let list = [...mockDb.relievers];
      if (orgId) list = list.filter(r => r.organization_id === orgId);
      return res.json(toCamel(list.sort((a, b) => a.name.localeCompare(b.name))));
    }
    let query = supabase.from('relievers').select('*').order('name');
    if (orgId) query = query.eq('organization_id', orgId as string);
    const { data, error } = await query;
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/relievers/:id', async (req, res) => {
  try {
    if (useMock()) {
      const rel = mockDb.relievers.find(r => r.id === req.params.id);
      if (!rel) return res.status(404).json({ error: 'Reliever not found' });
      return res.json(toCamel(rel));
    }
    const { data, error } = await supabase.from('relievers').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/relievers', async (req, res) => {
  try {
    if (useMock()) {
      const rel = toSnake(req.body);
      if (!rel.id) rel.id = randomUUID();
      rel.created_at = new Date().toISOString();
      mockDb.relievers.push(rel);
      return res.status(201).json(toCamel(rel));
    }
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = randomUUID();
    dbPayload.created_at = new Date().toISOString();
    const { data, error } = await supabase.from('relievers').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/relievers/:id', async (req, res) => {
  try {
    if (useMock()) {
      const idx = mockDb.relievers.findIndex(r => r.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Reliever not found' });
      const updated = { ...mockDb.relievers[idx], ...toSnake(req.body) };
      mockDb.relievers[idx] = updated;
      return res.json(toCamel(updated));
    }
    const dbPayload = toSnake(req.body);
    const { data, error } = await supabase.from('relievers').update(dbPayload).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/relievers/:id', async (req, res) => {
  try {
    if (useMock()) {
      mockDb.relievers = mockDb.relievers.filter(r => r.id !== req.params.id);
      return res.status(204).end();
    }
    const { error } = await supabase.from('relievers').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ----------------------------------------------------
// SALARY ADVANCES
// ----------------------------------------------------
app.get('/api/advances', async (req, res) => {
  try {
    if (useMock()) {
      return res.json(toCamel(mockDb.advances));
    }
    const { data, error } = await supabase.from('advances').select('*');
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/advances', async (req, res) => {
  try {
    if (useMock()) {
      const adv = toSnake(req.body);
      if (!adv.id) adv.id = randomUUID();
      mockDb.advances.push(adv);
      return res.status(201).json(toCamel(adv));
    }
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = randomUUID();
    const { data, error } = await supabase.from('advances').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/advances/:id', async (req, res) => {
  try {
    if (useMock()) {
      mockDb.advances = mockDb.advances.filter(a => a.id !== req.params.id);
      return res.status(204).end();
    }
    const { error } = await supabase.from('advances').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ----------------------------------------------------
// PAYROLL
// ----------------------------------------------------
app.get('/api/payrolls', async (req, res) => {
  try {
    if (useMock()) {
      const { month } = req.query;
      let list = [...mockDb.payrolls];
      if (month) list = list.filter(p => p.month === month);
      return res.json(toCamel(list));
    }
    const { month } = req.query;
    let query = supabase.from('payrolls').select('*');
    if (month) query = query.eq('month', month as string);
    const { data, error } = await query;
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/payrolls', async (req, res) => {
  try {
    if (useMock()) {
      const payroll = toSnake(req.body);
      const idx = mockDb.payrolls.findIndex(p => p.employee_id === payroll.employee_id && p.month === payroll.month);
      if (idx > -1) {
        const updated = { ...mockDb.payrolls[idx], ...payroll };
        mockDb.payrolls[idx] = updated;
        return res.json(toCamel(updated));
      } else {
        if (!payroll.id) payroll.id = randomUUID();
        mockDb.payrolls.push(payroll);
        return res.status(201).json(toCamel(payroll));
      }
    }
    const payroll = toSnake(req.body);
    const { data: existing, error: checkError } = await supabase
      .from('payrolls').select('id')
      .eq('employee_id', payroll.employee_id).eq('month', payroll.month);
    if (checkError) throw checkError;
    if (existing && existing.length > 0) {
      const { data, error: updateError } = await supabase.from('payrolls')
        .update(payroll).eq('id', existing[0].id).select();
      if (updateError) throw updateError;
      return res.json(toCamel(data[0]));
    } else {
      if (!payroll.id) payroll.id = randomUUID();
      const { data, error: insertError } = await supabase.from('payrolls').insert([payroll]).select();
      if (insertError) throw insertError;
      return res.status(201).json(toCamel(data[0]));
    }
  } catch (error: any) {
    console.error('Payroll post error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// ACTIVITY LOGS
// ----------------------------------------------------
app.get('/api/logs', async (req, res) => {
  try {
    if (useMock()) {
      const list = [...mockDb.logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return res.json(toCamel(list));
    }
    const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/logs', async (req, res) => {
  try {
    if (useMock()) {
      const log = toSnake(req.body);
      if (!log.id) log.id = randomUUID();
      if (!log.timestamp) log.timestamp = new Date().toISOString();
      mockDb.logs.push(log);
      return res.status(201).json(toCamel(log));
    }
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = randomUUID();
    if (!dbPayload.timestamp) dbPayload.timestamp = new Date().toISOString();
    const { data, error } = await supabase.from('activity_logs').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ----------------------------------------------------
// SYSTEM NOTIFICATIONS
// ----------------------------------------------------
app.get('/api/notifications', async (req, res) => {
  try {
    if (useMock()) {
      const list = [...mockDb.notifications].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return res.json(toCamel(list));
    }
    const { data, error } = await supabase.from('system_notifications').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notifications', async (req, res) => {
  try {
    if (useMock()) {
      const notif = toSnake(req.body);
      if (!notif.id) notif.id = randomUUID();
      if (!notif.timestamp) notif.timestamp = new Date().toISOString();
      mockDb.notifications.push(notif);
      return res.status(201).json(toCamel(notif));
    }
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = randomUUID();
    if (!dbPayload.timestamp) dbPayload.timestamp = new Date().toISOString();
    const { data, error } = await supabase.from('system_notifications').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/notifications/:id', async (req, res) => {
  try {
    if (useMock()) {
      const idx = mockDb.notifications.findIndex(n => n.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Notification not found' });
      const updated = { ...mockDb.notifications[idx], ...toSnake(req.body) };
      mockDb.notifications[idx] = updated;
      return res.json(toCamel(updated));
    }
    const dbPayload = toSnake(req.body);
    const { data, error } = await supabase.from('system_notifications').update(dbPayload).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notifications/mark-all-read', async (req, res) => {
  try {
    if (useMock()) {
      mockDb.notifications = mockDb.notifications.map(n => ({ ...n, read: true }));
      return res.json({ success: true });
    }
    const { error } = await supabase.from('system_notifications').update({ read: true }).eq('read', false);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ----------------------------------------------------
// BACKUP & RESTORE
// ----------------------------------------------------
app.get('/api/settings/backup', async (req, res) => {
  try {
    if (useMock()) {
      return res.json(toCamel({
        users: mockDb.users,
        organizations: mockDb.organizations,
        departments: mockDb.departments,
        employees: mockDb.employees,
        attendance: mockDb.attendance,
        advances: mockDb.advances,
        payrolls: mockDb.payrolls,
        logs: mockDb.logs,
        notifications: mockDb.notifications,
        relievers: mockDb.relievers,
      }));
    }
    const [users, orgs, depts, emps, att, adv, payroll, logs, notifs, relievers] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('organizations').select('*'),
      supabase.from('departments').select('*'),
      supabase.from('employees').select('*'),
      supabase.from('attendance_records').select('*'),
      supabase.from('advances').select('*'),
      supabase.from('payrolls').select('*'),
      supabase.from('activity_logs').select('*'),
      supabase.from('system_notifications').select('*'),
      supabase.from('relievers').select('*'),
    ]);
    res.json(toCamel({
      users: users.data || [], organizations: orgs.data || [], departments: depts.data || [],
      employees: emps.data || [], attendance: att.data || [], advances: adv.data || [],
      payrolls: payroll.data || [], logs: logs.data || [], notifications: notifs.data || [],
      relievers: relievers.data || [],
    }));
  } catch (error: any) {
    console.error('Backup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings/restore', async (req, res) => {
  try {
    const data = toSnake(req.body);
    if (useMock()) {
      mockDb.reset();
      if (data.users?.length) mockDb.users = data.users;
      if (data.organizations?.length) mockDb.organizations = data.organizations;
      if (data.departments?.length) mockDb.departments = data.departments;
      if (data.employees?.length) mockDb.employees = data.employees;
      if (data.relievers?.length) mockDb.relievers = data.relievers;
      if (data.attendance?.length) mockDb.attendance = data.attendance;
      if (data.advances?.length) mockDb.advances = data.advances;
      if (data.payrolls?.length) mockDb.payrolls = data.payrolls;
      if (data.logs?.length) mockDb.logs = data.logs;
      if (data.notifications?.length) mockDb.notifications = data.notifications;
      
      // Ensure default admin user is present
      if (!mockDb.users.some(u => u.username === 'admin')) {
        mockDb.users.push({
          id: '00000000-0000-0000-0000-000000000001',
          username: 'admin',
          password: 'admin123',
          name: 'System Administrator (Demo)',
          role: 'Super Admin',
          email: 'admin@vstaff.com'
        });
      }
      return res.json({ success: true });
    }

    await supabase.from('payrolls').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('advances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('departments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('system_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('relievers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (data.users?.length) await supabase.from('users').insert(data.users);
    if (data.organizations?.length) await supabase.from('organizations').insert(data.organizations);
    if (data.departments?.length) await supabase.from('departments').insert(data.departments);
    if (data.employees?.length) await supabase.from('employees').insert(data.employees);
    if (data.relievers?.length) await supabase.from('relievers').insert(data.relievers);
    if (data.attendance?.length) await supabase.from('attendance_records').insert(data.attendance);
    if (data.advances?.length) await supabase.from('advances').insert(data.advances);
    if (data.payrolls?.length) await supabase.from('payrolls').insert(data.payrolls);
    if (data.logs?.length) await supabase.from('activity_logs').insert(data.logs);
    if (data.notifications?.length) await supabase.from('system_notifications').insert(data.notifications);

    // Safety: ensure default admin user is present in Supabase if no users were inserted
    const { count } = await supabase.from('users').select('id', { count: 'exact', head: true });
    if (!count || count === 0) {
      await supabase.from('users').insert([{
        username: 'admin',
        password: 'admin123',
        name: 'System Administrator',
        role: 'Super Admin',
        email: 'admin@vstaff.com'
      }]);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Restore error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
