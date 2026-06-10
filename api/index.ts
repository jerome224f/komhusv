import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
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

    const [
      { count: orgsCount, error: orgError },
      { count: empsCount, error: empError },
      { data: attendanceToday, error: attError },
      { data: activeEmps, error: activeEmpsError },
      { data: activeOrgs, error: activeOrgsError },
      { data: payrollsThisMonth, error: prError },
      { data: allAttendance, error: allAttError }
    ] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('attendance_records').select('*').eq('date', todayStr),
      supabase.from('employees').select('*').eq('status', 'Active'),
      supabase.from('organizations').select('*').eq('status', 'Active'),
      supabase.from('payrolls').select('net_salary').eq('month', currentMonth),
      supabase.from('attendance_records').select('*')
    ]);

    if (orgError) throw orgError;
    if (empError) throw empError;
    if (attError) throw attError;
    if (activeEmpsError) throw activeEmpsError;
    if (activeOrgsError) throw activeOrgsError;
    if (prError) throw prError;
    if (allAttError) throw allAttError;

    let presentToday = 0, absentToday = 0, leaveToday = 0;
    const absentEmployeesToday: any[] = [];
    const attTodayList = attendanceToday || [];
    const empList = activeEmps || [];
    const orgList = activeOrgs || [];

    attTodayList.forEach((att: any) => {
      if (att.status === 'Present' || att.status === 'Half Day') presentToday++;
      if (att.status === 'Leave') leaveToday++;
      if (att.status === 'Absent') {
        absentToday++;
        const emp = empList.find((e: any) => e.id === att.employee_id);
        if (emp) {
          const org = orgList.find((o: any) => o.id === emp.organization_id);
          if (org) absentEmployeesToday.push({ employee: toCamel(emp), org: toCamel(org) });
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

    res.json({ totalOrganizations: orgsCount || 0, totalEmployees: empsCount || 0, presentToday, absentToday, leaveToday, payrollCost, absentEmployeesToday, heatmapData });
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
    const { data, error } = await supabase.from('organizations').select('*').order('name');
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/organizations/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('organizations').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/organizations', async (req, res) => {
  try {
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = crypto.randomUUID();
    dbPayload.created_at = new Date().toISOString();
    const { data, error } = await supabase.from('organizations').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/organizations/:id', async (req, res) => {
  try {
    const dbPayload = toSnake(req.body);
    const { data, error } = await supabase.from('organizations').update(dbPayload).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/organizations/:id', async (req, res) => {
  try {
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
    const { data, error } = await supabase.from('departments').select('*').order('name');
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/departments', async (req, res) => {
  try {
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = crypto.randomUUID();
    const { data, error } = await supabase.from('departments').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/departments/:id', async (req, res) => {
  try {
    const dbPayload = toSnake(req.body);
    const { data, error } = await supabase.from('departments').update(dbPayload).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
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
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/employees/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('employees').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/employees', async (req, res) => {
  try {
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = crypto.randomUUID();
    const { data, error } = await supabase.from('employees').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/employees/:id', async (req, res) => {
  try {
    const dbPayload = toSnake(req.body);
    const { data, error } = await supabase.from('employees').update(dbPayload).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
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
    const { date, employeeId } = req.query;
    let query = supabase.from('attendance_records').select('*');
    if (date) query = query.eq('date', date as string);
    if (employeeId) query = query.eq('employee_id', employeeId as string);
    const { data, error } = await query;
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/attendance/upsert', async (req, res) => {
  try {
    const records = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Request body must be an array of records' });
    const dbRecords = toSnake(records);
    for (const record of dbRecords) {
      const { data: existing, error: checkError } = await supabase
        .from('attendance_records').select('id')
        .eq('employee_id', record.employee_id).eq('date', record.date);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        const { error: updateError } = await supabase.from('attendance_records')
          .update({ status: record.status, overtime_hours: record.overtime_hours })
          .eq('id', existing[0].id);
        if (updateError) throw updateError;
      } else {
        if (!record.id) record.id = crypto.randomUUID();
        const { error: insertError } = await supabase.from('attendance_records').insert([record]);
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
// SALARY ADVANCES
// ----------------------------------------------------
app.get('/api/advances', async (req, res) => {
  try {
    const { data, error } = await supabase.from('advances').select('*');
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/advances', async (req, res) => {
  try {
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = crypto.randomUUID();
    const { data, error } = await supabase.from('advances').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/advances/:id', async (req, res) => {
  try {
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
      if (!payroll.id) payroll.id = crypto.randomUUID();
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
    const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/logs', async (req, res) => {
  try {
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = crypto.randomUUID();
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
    const { data, error } = await supabase.from('system_notifications').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    res.json(toCamel(data));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const dbPayload = toSnake(req.body);
    if (!dbPayload.id) dbPayload.id = crypto.randomUUID();
    if (!dbPayload.timestamp) dbPayload.timestamp = new Date().toISOString();
    const { data, error } = await supabase.from('system_notifications').insert([dbPayload]).select();
    if (error) throw error;
    res.status(201).json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/notifications/:id', async (req, res) => {
  try {
    const dbPayload = toSnake(req.body);
    const { data, error } = await supabase.from('system_notifications').update(dbPayload).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(toCamel(data[0]));
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notifications/mark-all-read', async (req, res) => {
  try {
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
    const [users, orgs, depts, emps, att, adv, payroll, logs, notifs] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('organizations').select('*'),
      supabase.from('departments').select('*'),
      supabase.from('employees').select('*'),
      supabase.from('attendance_records').select('*'),
      supabase.from('advances').select('*'),
      supabase.from('payrolls').select('*'),
      supabase.from('activity_logs').select('*'),
      supabase.from('system_notifications').select('*'),
    ]);
    res.json(toCamel({
      users: users.data || [], organizations: orgs.data || [], departments: depts.data || [],
      employees: emps.data || [], attendance: att.data || [], advances: adv.data || [],
      payrolls: payroll.data || [], logs: logs.data || [], notifications: notifs.data || [],
    }));
  } catch (error: any) {
    console.error('Backup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings/restore', async (req, res) => {
  try {
    const data = toSnake(req.body);
    await supabase.from('payrolls').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('advances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('departments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('system_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (data.users?.length) await supabase.from('users').insert(data.users);
    if (data.organizations?.length) await supabase.from('organizations').insert(data.organizations);
    if (data.departments?.length) await supabase.from('departments').insert(data.departments);
    if (data.employees?.length) await supabase.from('employees').insert(data.employees);
    if (data.attendance?.length) await supabase.from('attendance_records').insert(data.attendance);
    if (data.advances?.length) await supabase.from('advances').insert(data.advances);
    if (data.payrolls?.length) await supabase.from('payrolls').insert(data.payrolls);
    if (data.logs?.length) await supabase.from('activity_logs').insert(data.logs);
    if (data.notifications?.length) await supabase.from('system_notifications').insert(data.notifications);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Restore error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
