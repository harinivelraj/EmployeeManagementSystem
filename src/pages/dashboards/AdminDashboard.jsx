import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export default function AdminDashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatSelectedReceiver, setChatSelectedReceiver] = useState(null);

  // Sample data for charts and table
  const userRolesData = {
    labels: ['Admins', 'Managers', 'Employees'],
    datasets: [
      {
        label: 'Count',
        data: [5, 12, 43],
        backgroundColor: ['#4ADE80', '#60A5FA', '#F472B6'],
      },
    ],
  };

  const deptOverview = [
    { name: 'HR', employees: 8, progress: 75 },
    { name: 'Engineering', employees: 25, progress: 50 },
    { name: 'Marketing', employees: 12, progress: 90 },
  ];

  const activityData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Activity',
        data: [120, 200, 150, 170, 180, 190, 210],
        borderColor: '#4ADE80',
        backgroundColor: 'rgba(74, 222, 128, 0.5)',
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      title: { display: true, text: 'Weekly Activity' },
    },
  };

  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Employee CRUD state
  const [employees, setEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });

  // Notifications state
  const [notifications, setNotifications] = useState([]);

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const res = await axios.get('/employees', authHeaders);
      setEmployees(res.data);
    } catch (err) {
      // handle error
    }
  };
  useEffect(() => { fetchEmployees(); }, []);

  // Edit handlers
  const startEdit = (emp) => {
    setEditingEmployee(emp.id);
    setEditForm({ name: emp.name, email: emp.email, role: emp.role });
  };
  const cancelEdit = () => { setEditingEmployee(null); };
  const saveEdit = async () => {
    try {
      await axios.put(`/employees/${editingEmployee}`, editForm, authHeaders);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err) { console.error(err); }
  };

  const deleteEmp = async (id) => {
    try {
      await axios.delete(`/employees/${id}`, authHeaders);
      fetchEmployees();
    } catch (err) { console.error(err); }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications', authHeaders);
      setNotifications(res.data);
    } catch (err) {
      // handle error
    }
  };
  useEffect(() => { fetchNotifications(); }, []);

  return (
    <div className="admin-dashboard-container">
      <h1>Admin Dashboard</h1>
      <div className="dashboard-charts">
        <Bar data={userRolesData} />
        <Line data={activityData} options={lineOptions} />
      </div>
      <div className="dashboard-table">
        <h2>Department Overview</h2>
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Employees</th>
              <th>Progress (%)</th>
            </tr>
          </thead>
          <tbody>
            {deptOverview.map((dept) => (
              <tr key={dept.name}>
                <td>{dept.name}</td>
                <td>{dept.employees}</td>
                <td>{dept.progress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dashboard-notifications">
        <h2>Notifications</h2>
        <ul>
          {notifications.map((notif) => (
            <li key={notif.id}>{notif.message}</li>
          ))}
        </ul>
      </div>
      <div className="dashboard-employees">
        <h2>Employees</h2>
        <ul>
          {employees.map((emp) => (
            <li key={emp.id}>{emp.name} ({emp.role})</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
