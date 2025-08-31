import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import axios from '../../api/axios';
import PrivateChat from '../../components/PrivateChat';
import SuperAdminNotifications from '../../components/SuperAdminNotifications';
import './SuperAdminDashboardUsers.css';
import './SuperAdminDashboard.css';
import logo from '../../../logo.png';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  // Mock chart data
  const recentData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{
      label: 'Actions',
      data: [12, 19, 3, 5, 2],
      backgroundColor: 'rgba(255,255,255,0.6)',
    }]
  };
  const healthData = {
    labels: ['1h ago', '2h ago', '3h ago', '4h ago', '5h ago'],
    datasets: [{
      label: 'CPU %',
      data: [65, 59, 80, 75, 60],
      borderColor: 'rgba(0, 255, 255, 0.7)',
      backgroundColor: 'rgba(0, 255, 255, 0.3)',
      fill: true,
    }]
  };
  const userStatsData = {
    labels: ['Active', 'Inactive'],
    datasets: [{
      data: [200, 50],
      backgroundColor: ['rgba(0, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.4)'],
    }]
  };
  const lineOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#0ff' } } },
    scales: {
      x: { ticks: { color: '#fff' } },
      y: { ticks: { color: '#fff' } },
    },
  };
  const name = localStorage.getItem('name') || 'SuperAdmin';
  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [employees, setEmployees] = useState([]);
  const [chatReceiver, setChatReceiver] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menu = [
    { title: 'Notifications', action: () => setActiveTab('notifications') },
    { title: 'Users', action: () => setActiveTab('users') },
    { title: 'Departments', path: '/superadmin-dashboard/departments' },
    { title: 'Tasks', path: '/superadmin-dashboard/tasks' },
    { title: 'Projects', path: '/superadmin-dashboard/projects' },
    { title: 'Payments', path: '/superadmin-dashboard/payments' },
    { title: 'Attendance', path: '/superadmin-dashboard/attendance' },
    { title: 'Leave', path: '/superadmin-dashboard/leave-requests' },
    { title: 'Group Chat', path: '/superadmin-dashboard/group-chat' },
  ];
  const fetchEmployees = async () => {
    try {
      const res = await axios.get('/employees', authHeaders);
      setEmployees(res.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };
  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications', authHeaders);
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };
  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => {
    if (activeTab === 'notifications') fetchNotifications();
  }, [activeTab]);

  return (
    <div className={`superadmin-dashboard ${activeTab === 'users' ? 'users-bg' : 'brand-bg'} flex h-screen overflow-hidden font-poppins text-red-color`}>
      {/* Hamburger trigger (shown when sidebar closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 left-4 z-20 text-white p-2 focus:outline-none"
        >
        </button>
      )}
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full'} brand-bg flex flex-col items-start py-8 space-y-6 fixed top-0 left-0 h-full transition-all duration-300 overflow-y-auto overflow-x-hidden z-10`}
      >
        {/* Close button (shown when sidebar open) */}
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 focus:outline-none close-btn"
          >
            ×
          </button>
        )}
        {/* Sidebar menu */}
        {menu.map((m) => (
          m.path ? (
            <Link
              key={m.title}
              to={m.path}
              className="w-full p-3 text-white rounded hover:bg-white hover:bg-opacity-25 hover:text-indigo-300 transition text-left"
            >
              {m.title}
            </Link>
          ) : (
            <button
              key={m.title}
              onClick={m.action}
              className="w-full p-3 text-white bg-transparent rounded hover:bg-white hover:bg-opacity-25 hover:text-indigo-300 transition text-left"
            >
              {m.title}
            </button>
          )
        ))}
      </aside>
      {/* Main area shifts when sidebar open */}
      <div className={`${sidebarOpen ? 'ml-64' : 'ml-0'} flex-1 flex flex-col ${activeTab === 'dashboard' ? 'bg-white' : 'bg-transparent'} overflow-y-auto relative text-red-color transition-all duration-300`}>
        {/* Top bar */}
        <header className="flex items-center justify-between bg-transparent backdrop-blur-md p-4 sticky top-0 z-10">
          <div className="flex items-center">
            <img src={logo} alt="D Grow Logo" className="h-12 w-auto ml-12" />
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 hover:scale-105 transform transition"
          >Logout</button>
        </header>
        {/* Content */}
        <main className="p-6 space-y-8">
          {activeTab === 'dashboard' && (
            <>
              {/* Welcome Banner */}
              <div className="welcome-banner bg-[#1c0607] backdrop-blur-md rounded-lg p-6 flex items-center space-x-4 shadow-lg animate-fadeIn">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-xl avatar-text">
                  {name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl welcome-title">Welcome, {name}</h2>
                  <p className="welcome-subtitle">Super Admin Dashboard</p>
                </div>
              </div>
              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Define navigable actions */}
                { [
                  { title: 'Add User', path: '/superadmin-dashboard/users' },
                  { title: 'Manage Roles', path: '/superadmin-dashboard/users' },
                  { title: 'View Reports', path: '/superadmin-dashboard/reports' }
                ].map(({ title, path }) => (
                  <Link
                    key={title}
                    to={path}
                    className={
                      title === 'Add User'
                        ? 'block text-center bg-[#a32227] text-white py-4 rounded-lg shadow-lg transform hover:scale-105 transition animate-fadeIn'
                        : 'block text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg shadow-lg transform hover:scale-105 transition animate-fadeIn'
                    }
                  >
                    {title}
                  </Link>
                ))}
              </div>
              {/* Glass Cards Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Recent Activity Chart */}
                <div className="bg-[#1c0607] backdrop-blur-md p-6 rounded-lg shadow-lg animate-fadeIn hover:shadow-xl transition text-white">
                  <h3 className="text-white font-semibold mb-2">Recent Activity</h3>
                  <Bar data={recentData} options={{ responsive: true, plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#fff' } }, y: { ticks: { color: '#fff' } } } }} />
                </div>
                {/* System Health Chart */}
                <div className="bg-[#1c0607] backdrop-blur-md p-6 rounded-lg shadow-lg animate-fadeIn hover:shadow-xl transition text-white delay-100">
                  <h3 className="text-white font-semibold mb-2">System Health</h3>
                  <Line data={healthData} options={{ responsive: true, plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#fff' } }, y: { ticks: { color: '#fff' } } } }} />
                </div>
                {/* User Stats Chart */}
                <div className="bg-[#1c0607] backdrop-blur-md p-6 rounded-lg shadow-lg animate-fadeIn hover:shadow-xl transition text-white delay-200">
                  <h3 className="text-white font-semibold mb-2">User Stats</h3>
                  <Doughnut data={userStatsData} options={{ responsive: true, plugins: { legend: { labels: { color: '#fff' } } } }} />
                </div>
              </div>
            </>
          )}
          {activeTab === 'notifications' && (
            <SuperAdminNotifications />
          )}
          {activeTab === 'users' && (
            <section className="superadmin-users bg-gray-800 bg-opacity-60 backdrop-blur-md rounded-xl shadow-neu p-6" style={{ color: '#ffffff' }}>
              <h2 className="text-2xl font-bold mb-4">Users</h2>
              <ul className="space-y-4">
                {employees.map(emp => (
                  <li key={emp.id} className="bg-white bg-opacity-20 backdrop-blur-md p-4 rounded-lg flex justify-between items-center">
                    <span className="font-medium">{emp.name} ({emp.email})</span>
                    <button onClick={() => setChatReceiver({ id: emp.id, name: emp.name })} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-current rounded">Chat</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {chatReceiver && (
            <section className="mt-6 p-4 bg-white bg-opacity-20 backdrop-blur-md rounded-xl shadow-neu">
              <button onClick={() => setChatReceiver(null)} className="mb-4 text-sm text-gray-300 hover:underline">← Back to Users</button>
              <PrivateChat receiverId={chatReceiver.id} receiverName={chatReceiver.name} onClose={() => setChatReceiver(null)} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
