import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import PrivateChat from "../../components/PrivateChat";
import DeptGroupChat from "../../components/DeptGroupChat";
import DepartmentSelection from "../../components/DepartmentSelection";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { io } from "socket.io-client";

axios.defaults.baseURL = "http://localhost:5000";
// Register Chart.js modules
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function ClientDashboard() {
  const name = localStorage.getItem("name");
  const token = localStorage.getItem("token");
  const currentUserId = parseInt(localStorage.getItem("id"), 10);
  const assignedDept = localStorage.getItem("department"); // if client is assigned a dept
  const [notifications, setNotifications] = useState([]);
  const [chatEmployees, setChatEmployees] = useState([]);
  const [selectedReceiver, setSelectedReceiver] = useState(null);
  const [deptTasks, setDeptTasks] = useState([]);
  const [message, setMessage] = useState("");
  // Payment and report tasks for clients
  const [payments, setPayments] = useState([]);
  const [tasks, setTasks] = useState([]);
  // Project onboarding for clients
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  // Sample chart data for report
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Tasks Completed',
        data: [12, 19, 3, 5, 2, 3, 7],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    plugins: { title: { display: true, text: 'Weekly Task Report' } },
  };
  
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  // Dashboard view control: 'home', 'notifications', 'report', 'privateChat'
  const [view, setView] = useState('home'); // 'home','notifications','privateChat','groupChat','payments'

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await axios.get("/api/notifications", authHeaders);
      setNotifications(res.data);
    } catch (error) {
      console.error("Error fetching notifications:", error.response?.data?.message || error.message);
    }
  };

  const downloadStatusReport = async () => {
  try {
    const response = await axios.get(
      `/api/reports/status?department=${assignedDept}`,
      { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
    );
    // Create a URL from the blob
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Status_Report_${assignedDept}_${new Date().toLocaleDateString()}.pdf`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage("Report downloaded successfully.");
    setView('report');
  } catch (error) {
    console.error("Error downloading report:", error.response?.data?.message || error.message);
    setMessage("Error downloading report.");
  }};

  // Fetch employees for private chat (if applicable for client)
  const fetchEmployees = async () => {
    try {
      const res = await axios.get("/api/employees", authHeaders);
      setChatEmployees(res.data);
    } catch (error) {
      console.error("Error fetching employees:", error.response?.data?.message || error.message);
    }
  };

  // Fetch client-specific pending payments
  const fetchPayments = async () => {
    try {
      const res = await axios.get('/api/payments/pending', authHeaders);
      setPayments(res.data);
    } catch (err) {
      console.error('Error fetching payments:', err.response?.data?.message || err.message);
    }
  };

  const markPaymentPaid = async (id) => {
    try {
      await axios.patch(`/api/payments/${id}/paid`, {}, authHeaders);
      fetchPayments();
    } catch (err) {
      console.error('Error marking payment paid:', err.response?.data?.message || err.message);
    }
  };

  // Fetch all tasks for reports and onboarding
  const fetchTasks = async () => {
    try {
      const res = await axios.get('/tasks', authHeaders);
      setTasks(res.data);
    } catch (err) {
      console.error('Error fetching tasks:', err.response?.data?.message || err.message);
    }
  };

  // Update task status (for report and onboarding tasks)
  const updateTaskStatus = async (id, status) => {
    try {
      await axios.put(`/tasks/${id}`, { status }, authHeaders);
      fetchTasks();
    } catch (err) {
      console.error('Error updating task status:', err.response?.data?.message || err.message);
    }
  };

  // Fetch projects created by this client
  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects/my', authHeaders);
      setProjects(res.data);
    } catch (err) {
      console.error('Error fetching projects:', err.response?.data?.message || err.message);
    }
  };

  // Client creates project (auto-assigned to Super Admin)
  const handleCreateProject = async () => {
    if (!projectForm.name || !projectForm.description) {
      setMessage('Project name and description required');
      return;
    }
    try {
      const res = await axios.post('/api/projects', projectForm, authHeaders);
      setMessage(`Project '${res.data.name}' created successfully`);
      setProjectForm({ name: '', description: '' });
      // update list immediately
      setProjects(prev => [...prev, res.data]);
      fetchProjects();
    } catch (err) {
      console.error('Error creating project:', err.response?.data?.message || err.message);
      setMessage(err.response?.data?.message || err.message);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  // Delete a project
  const deleteProject = async (id) => {
    try {
      await axios.delete(`/api/projects/${id}`, authHeaders);
      // remove from UI
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setMessage('Project deleted successfully');
    } catch (err) {
      console.error('Error deleting project:', err.response?.data?.message || err.message);
      setMessage(err.response?.data?.message || err.message);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  useEffect(() => {
  // Load initial notifications for home view
  fetchNotifications();
  fetchEmployees();
    fetchPayments();
    fetchTasks();
    fetchProjects();
  }, []);

    // Setup real-time notifications
    const socket = io("http://localhost:5000");
    socket.emit("register", currentUserId);
    socket.on("new_notification", (data) => {
      setNotifications((prev) => [data, ...prev]);
    });
    return () => socket.disconnect();
  }, [currentUserId]);

  // Mark notification as read
  const markAsRead = async (notifId) => {
    try {
      await axios.patch(`/api/notifications/${notifId}/read`, {}, authHeaders);
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error.response?.data?.message);
    }
  };

  const fetchDeptTasks = async () => {
  if (!assignedDept) return;
  try {
    const res = await axios.get(`/tasks/department/${assignedDept}`, authHeaders);
    setDeptTasks(res.data);
  } catch (error) {
    console.error("Error fetching department tasks:", error.response?.data?.message || error.message);
  }
};

useEffect(() => {
  if (assignedDept) {
    fetchDeptTasks();
  }
}, [assignedDept]);

  // Delete notification
  const deleteNotification = async (notifId) => {
    try {
      await axios.delete(`/api/notifications/${notifId}`, authHeaders);
      fetchNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error.response?.data?.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden font-poppins">
      {/* Sidebar (glassmorphism) */}
      <aside className="w-24 flex flex-col items-center py-8 space-y-6 backdrop-blur-md bg-white bg-opacity-10 border border-white border-opacity-20 rounded-xl mx-2">
       <button onClick={() => setView('notifications')} className="p-3 bg-white bg-opacity-20 rounded-full hover:shadow-lg transition">
         <span className="text-xl text-gray-50">🔔</span>
       </button>
       <button onClick={() => setView('privateChat')} className="p-3 bg-white bg-opacity-20 rounded-full hover:shadow-lg transition">
         <span className="text-xl text-gray-50">💬</span>
       </button>
       <button onClick={() => setView('groupChat')} className="p-3 bg-white bg-opacity-20 rounded-full hover:shadow-lg transition">
         <span className="text-xl text-gray-50">👥</span>
       </button>
       <button onClick={() => { downloadStatusReport(); setView('report'); }} className="p-3 bg-white bg-opacity-20 rounded-full hover:shadow-lg transition">
         <span className="text-xl text-gray-50">📄</span>
       </button>
       <button onClick={() => setView('payments')} className="p-3 bg-white bg-opacity-20 rounded-full hover:shadow-lg transition">
         <span className="text-xl text-gray-50">💰</span>
       </button>
      </aside>
      {/* Main content area */}
    <div className="flex-1 flex flex-col overflow-y-auto">
       {/* Top navigation bar (glassmorphism) */}
      <header className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white bg-opacity-10 border-b border-white border-opacity-20">
        <h1 className="text-2xl text-white font-bold tracking-wide">D Grow</h1>
        <button onClick={handleLogout} className="px-5 py-2 bg-gradient-to-r from-teal-400 to-purple-500 text-white rounded-full hover:opacity-90 transition">
          Logout
        </button>
       </header>

       {/* Main section */}
       <main className="p-6 flex-1 space-y-6 bg-[var(--bg-color)]">
          {/* Welcome Banner Card */}
          <div className="bg-blue-100 bg-opacity-20 backdrop-blur-lg rounded-xl p-6 flex items-center space-x-6 shadow-neu hover:shadow-neu-hover transform hover:-translate-y-1 animate-fadeInUp">
             <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xl">
               {name.charAt(0)}
             </div>
             <div>
               <h2 className="text-2xl text-gray-900 font-semibold">Welcome, {name}</h2>
               <p className="text-gray-700 text-sm">Client Dashboard</p>
             </div>
           </div>
          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
    <button
      onClick={() => { fetchNotifications(); setView('notifications'); }}
      className="bg-gradient-to-r from-blue-300 to-blue-400 text-gray-900 py-4 rounded-lg shadow-lg hover:scale-105 transform transition"
    >
      View Notifications
    </button>
    <button
      onClick={downloadStatusReport}
      className="bg-gradient-to-r from-blue-300 to-blue-400 text-gray-900 py-4 rounded-lg shadow-lg hover:scale-105 transform transition"
    >
      Download Report
    </button>
    <button
      onClick={() => setView('privateChat')}
      className="bg-gradient-to-r from-blue-300 to-blue-400 text-gray-900 py-4 rounded-lg shadow-lg hover:scale-105 transform transition"
    >
      Private Chat
    </button>
  </div>
          {/* Home Grid Cards */}
          {view === 'home' && (
            <> 
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {/* Department Tasks Card */}
              <div className="bg-blue-100 bg-opacity-20 backdrop-blur-md p-6 rounded-lg shadow-neu hover:shadow-neu-hover transform hover:-translate-y-1 animate-fadeInUp">
                <h3 className="text-gray-900 font-semibold mb-2">Department Tasks</h3>
                {deptTasks.length === 0 ? (
                  <p className="text-gray-700">No tasks for your department yet.</p>
                ) : (
                  <ul className="list-none space-y-2">
                    {deptTasks.map(task => (
                      <li key={task.id} className="text-white">
                        <strong>{task.title}</strong> - {task.status}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Pending Payments Card */}
              <div className="bg-blue-100 bg-opacity-20 backdrop-blur-md p-6 rounded-lg shadow-neu hover:shadow-neu-hover transform hover:-translate-y-1 animate-fadeInUp">
                <h3 className="text-gray-900 font-semibold mb-2">Pending Payments</h3>
                {payments.length === 0 ? (
                  <p className="text-gray-700">No pending payments.</p>
                ) : (
                  <ul className="list-none space-y-2">
                    {payments.map(p => (
                      <li key={p.id} className="text-white">
                        {p.label} - ${p.amount}
                        <button onClick={() => markPaymentPaid(p.id)} className="ml-2 text-sm text-green-300 hover:text-green-400">Mark Paid</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Report Tasks Card */}
              <div className="bg-blue-100 bg-opacity-20 backdrop-blur-md p-6 rounded-lg shadow-neu hover:shadow-neu-hover transform hover:-translate-y-1 animate-fadeInUp">
                <h3 className="text-gray-900 font-semibold mb-2">Report Tasks</h3>
                {tasks.filter(t => t.title.startsWith('Payment Report:')).length === 0 ? (
                  <p className="text-gray-700">No report tasks.</p>
                ) : (
                  <ul className="list-none space-y-2">
                    {tasks.filter(t => t.title.startsWith('Payment Report:')).map(task => (
                      <li key={task.id} className="text-white">
                        <strong>{task.title}</strong> - {task.status}
                        <button onClick={() => updateTaskStatus(task.id, 'Completed')} className="ml-2 text-sm text-green-300 hover:text-green-400">Mark Completed</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Onboarding Tasks Card */}
              <div className="bg-blue-100 bg-opacity-20 backdrop-blur-md p-6 rounded-lg shadow-neu hover:shadow-neu-hover transform hover:-translate-y-1 animate-fadeInUp">
                <h3 className="text-gray-900 font-semibold mb-2">Onboarding Tasks</h3>
                {tasks.filter(t => t.title.startsWith('Client Onboarding:')).length === 0 ? (
                  <p className="text-gray-700">No onboarding tasks.</p>
                ) : (
                  <ul className="list-none space-y-2">
                    {tasks.filter(t => t.title.startsWith('Client Onboarding:')).map(task => (
                      <li key={task.id} className="text-white">
                        <strong>{task.title}</strong> - {task.status}
                        <button onClick={() => updateTaskStatus(task.id, 'Completed')} className="ml-2 text-sm text-green-300 hover:text-green-400">Mark Completed</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Project Onboarding Card */}
              <div className="bg-blue-100 bg-opacity-20 backdrop-blur-md p-6 rounded-lg shadow-neu hover:shadow-neu-hover transform hover:-translate-y-1 animate-fadeInUp">
                <h3 className="text-gray-900 font-semibold mb-2">Project Onboarding</h3>
                <div className="space-y-2">
                  <input type="text" placeholder="Project Name" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} className="w-full p-2 rounded bg-white/10 text-white" />
                  <textarea placeholder="Description" value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} className="w-full p-2 rounded bg-white/10 text-white" />
                  <button onClick={handleCreateProject} className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded">Create Project</button>
                </div>
                {projects.length > 0 && (
                  <ul className="list-none mt-4 space-y-2">
                    {projects.map(p => (
                      <li key={p.id} className="text-white flex justify-between items-center">
                        <span>{p.name}</span>
                        <button onClick={() => deleteProject(p.id)} className="text-red-400 hover:text-red-500">Delete</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Compact Report Graph Card */}
              <div className="bg-blue-100 bg-opacity-20 backdrop-blur-md p-6 rounded-lg shadow-neu hover:shadow-neu-hover transform hover:-translate-y-1 animate-fadeInUp">
                <h3 className="text-gray-900 font-semibold mb-2">Weekly Tasks</h3>
                <div className="h-32">
                  <Line data={chartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          </>
        )}
          {/* Conditional Panels */}
        {view === 'notifications' && (
          <div className="mt-6 p-6 bg-gradient-to-r from-indigo-800 to-indigo-600 bg-opacity-30 backdrop-blur-md rounded-lg">
            <button onClick={() => setView('home')} className="mb-4 text-sm text-indigo-200 hover:underline">← Back</button>
            <h3 className="text-white font-semibold mb-2">Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-gray-300">No notifications.</p>
            ) : (
              <ul className="list-none space-y-4">
                {notifications.map(n => (
                  <li key={n.id} className="text-white">
                    <p>{n.message}</p>
                    <small className="text-gray-300">{new Date(n.created_at).toLocaleString()}</small>
                    <div className="mt-2 space-x-2">
                      {!n.is_read && <button onClick={() => markAsRead(n.id)} className="text-sm text-green-300">Mark as Read</button>}
                      <button onClick={() => deleteNotification(n.id)} className="text-sm text-red-300">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {view === 'privateChat' && (
          <div className="mt-6 p-6 bg-gradient-to-r from-indigo-800 to-indigo-600 bg-opacity-30 backdrop-blur-md rounded-lg">
            <button onClick={() => setView('home')} className="mb-4 text-sm text-indigo-200 hover:underline">← Back</button>
            <PrivateChat receiverId={selectedReceiver?.id} receiverName={selectedReceiver?.name} onClose={() => setView('home')} />
          </div>
        )}
        {view === 'groupChat' && (
          <div className="mt-6 p-6 bg-gradient-to-r from-indigo-800 to-indigo-600 bg-opacity-30 backdrop-blur-md rounded-lg">
            <button onClick={() => setView('home')} className="mb-4 text-sm text-indigo-200 hover:underline">← Back</button>
            {assignedDept ? <DeptGroupChat department={assignedDept} /> : <DepartmentSelection />}
          </div>
        )}
        {view === 'report' && (
          <div className="mt-6 p-6 bg-gradient-to-r from-indigo-800 to-indigo-600 bg-opacity-30 backdrop-blur-md rounded-lg text-center">
            <p className="text-white">Report downloaded. Check your downloads.</p>
            <button onClick={() => setView('home')} className="mt-4 text-indigo-200 hover:underline">Back to Dashboard</button>
          </div>
        )}
        {view === 'payments' && (
          <div className="mt-6 p-6 bg-gradient-to-r from-indigo-800 to-indigo-600 bg-opacity-30 backdrop-blur-md rounded-lg">
            <button onClick={() => setView('home')} className="mb-4 text-sm text-indigo-200 hover:underline">← Back</button>
            <h3 className="text-white font-semibold mb-2">Pending Payments</h3>
            {payments.length === 0 ? (
              <p className="text-gray-300">No pending payments.</p>
            ) : (
              <ul className="list-none space-y-2">
                {payments.map(p => (
                  <li key={p.id} className="text-white">
                    {p.label} - ${p.amount}
                    <button onClick={() => markPaymentPaid(p.id)} className="ml-2 text-sm text-green-300 hover:text-green-400">Mark Paid</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}