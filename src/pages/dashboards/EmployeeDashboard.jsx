import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import PrivateChat from "../../components/PrivateChat";
import DeptGroupChat from "../../components/DeptGroupChat";
import { io } from "socket.io-client";
import DepartmentSelection from "../../components/DepartmentSelection";

axios.defaults.baseURL = "http://localhost:5000";

export default function EmployeeDashboard() {
  const name = localStorage.getItem("name");
  const token = localStorage.getItem("token");
  const currentUserId = parseInt(localStorage.getItem("id"), 10);
  const assignedDept = localStorage.getItem("department");
  const storedAccess = localStorage.getItem("access_rights");
  const userAccess = storedAccess ? JSON.parse(storedAccess) : { private_chat: true, leave_request: true, group_chat: true };


  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checkedIn | checkedOut
  const navigate = useNavigate();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // ✅ Leave request states
  const [leaveForm, setLeaveForm] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [leaveMessage, setLeaveMessage] = useState("");

   // New state: employee list for private messaging
  const [employees, setEmployees] = useState([]);
  // This state holds the id of the employee selected for chatting
  const [selectedReceiver, setSelectedReceiver] = useState(null);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get("/api/employees", authHeaders);
      setEmployees(res.data);
    } catch (error) {
      console.error("Error fetching employees:", error.response?.data?.message || error.message);
    }
  };

  // Call fetchEmployees on component mount so we have a dynamic list
  useEffect(() => {
    fetchEmployees();
  }, []);

  // ✅ Fetch today's attendance status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();

        const res = await axios.get(
          `/attendance/monthly?month=${month}&year=${year}`,
          authHeaders
        );

        if (!Array.isArray(res.data)) return;

        const todayRecord = res.data.find((att) => {
          if (!att.check_in) return false; // ignore empty records
          const checkInDate = new Date(att.check_in).toDateString();
          return checkInDate === today.toDateString();
        });

        if (!todayRecord) {
          setStatus("idle"); // Not checked in
        } else if (todayRecord.check_in && !todayRecord.check_out) {
          setStatus("checkedIn"); // Checked in but not out
        } else if (todayRecord.check_in && todayRecord.check_out) {
          setStatus("checkedOut"); // Finished day
        }
      } catch (err) {
        console.log("Error fetching status:", err.response?.data?.message);
        setStatus("idle");
      }
    };

    fetchStatus();
  }, []);

  const checkIn = async () => {
    try {
      const res = await axios.post("/attendance/checkin", {}, authHeaders);
      setMessage(res.data.message);
      setStatus("checkedIn");
    } catch (err) {
      setMessage(err.response?.data?.message || "Check-in failed");
    }
  };

  const checkOut = async () => {
    try {
      const res = await axios.post("/attendance/checkout", {}, authHeaders);
      setMessage(res.data.message);
      setStatus("checkedOut");
    } catch (err) {
      setMessage(err.response?.data?.message || "Check-out failed");
    }
  };

  const handleLogout = () => {
    localStorage.clear(); // clear all data
    navigate("/login");   // redirect
  };

  // ✅ Submit leave request
  const submitLeaveRequest = async () => {
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) {
      setLeaveMessage("All fields are required");
      return;
    }
    try {
      const res = await axios.post("/leaves/request", leaveForm, authHeaders);
      setLeaveMessage(res.data.message || "Leave request submitted!");
      setLeaveForm({ start_date: "", end_date: "", reason: "" });
    } catch (err) {
      setLeaveMessage(err.response?.data?.message || "Failed to submit leave request");
    }
  };

  // ✅ Fetch personal leave requests
  const fetchMyLeaves = async () => {
    try {
      const res = await axios.get("/leaves/my", authHeaders);
      setLeaveRequests(res.data);
    } catch (err) {
      console.log("Failed to fetch leave requests:", err.response?.data?.message);
    }
  };

  const fetchMyTasks = async () => {
    try {
      const res = await axios.get("/tasks/my", authHeaders);
      setTasks(res.data);
    } catch (err) {
      console.log("Failed to fetch tasks:", err.response?.data?.message);
    }
  };

   const fetchNotifications = async () => {
    try {
      const res = await axios.get("/api/notifications", authHeaders);
      setNotifications(res.data);
    } catch (error) {
      console.error("Error fetching notifications:", error.response?.data?.message);
    }
  };

    // Mark a notification as read
  const markAsRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`, {}, authHeaders);
      setMessage("Notification marked as read.");
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error.response?.data?.message);
    }
  };

  // Delete a notification
  const deleteNotification = async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`, authHeaders);
      setMessage("Notification deleted.");
      fetchNotifications();
      setTimeout(() => setMessage(""), 2000);
    } catch (error) {
      console.error("Error deleting notification:", error.response?.data?.message);
    }
  };

  const handleMarkAsCompleted = async (taskId) => {
    try {
      await axios.put(`/tasks/employee/${taskId}`, { status: "Completed" }, authHeaders);
      fetchMyTasks(); // ✅ Refresh tasks after completion
    } catch (err) {
      console.log("Error updating task status:", err.response?.data?.message || err.message);
    }
  };

  const leaveDepartment = async () => {
  try {
    await axios.put(`/api/departments/${currentUserId}`, { department: null }, authHeaders);
    localStorage.removeItem("department");
    // Optionally force a reload or update state so DepartmentSelection is shown:
    window.location.reload();
  } catch (error) {
    console.error("Error leaving department:", error.response?.data?.message || error.message);
  }
};


  // ✅ Fetch data on mount
  useEffect(() => {
    fetchMyLeaves();
  }, [leaveMessage]);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:5000");
    // Register the current user id with the socket server
    socket.emit("register", currentUserId);
    // Listen for new notifications
    socket.on("new_notification", (data) => {
      setNotifications((prevNotifications) => [data, ...prevNotifications]);
    });
    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  const fetchMyProjects = async () => {
    try {
      const res = await axios.get('/api/projects/my', authHeaders);
      setProjects(res.data);
    } catch (err) {
      console.error('Error fetching my projects:', err.response?.data?.message || err.message);
    }
  };

  const handleProjectComplete = async (projectId) => {
    try {
      await axios.put(`/api/projects/${projectId}/status`, { status: 'Completed' }, authHeaders);
      fetchMyProjects();
    } catch (err) {
      console.error('Error updating project status:', err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    fetchMyProjects();
  }, []);

  return (
    <div className="dashboard-container full-screen">
      <h1>Employee Dashboard</h1>
      <h2>Hello, {name}</h2>

      {/* Notifications Panel */}
      <div className="dashboard-card">
        <h3 className="panel-header">Notifications</h3>
        {notifications.length === 0 ? (
          <p>No notifications.</p>
        ) : (
          <ul className="list">
            {notifications.map((notif) => (
              <li key={notif.id} className="list-item">
                {notif.message}
                <button onClick={() => markAsRead(notif.id)}>Mark as Read</button>
                <button onClick={() => deleteNotification(notif.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Attendance Panel */}
      <div className="dashboard-card">
        <h3 className="panel-header">Attendance</h3>
        <p>Status: {status}</p>
        {status === "idle" && <button onClick={checkIn}>Check In</button>}
        {status === "checkedIn" && <button onClick={checkOut}>Check Out</button>}
        {status === "checkedOut" && <span>Day complete</span>}
        {message && <p>{message}</p>}
      </div>

      {/* Tasks Panel */}
      <div className="dashboard-card">
        <h3 className="panel-header">Tasks</h3>
        {tasks.length === 0 ? (
          <p>No tasks assigned.</p>
        ) : (
          <ul className="list">
            {tasks.map((task) => (
              <li key={task.id} className="list-item">
                {task.title} - {task.status}
                {task.status !== "Completed" && (
                  <button onClick={() => handleMarkAsCompleted(task.id)}>Mark as Completed</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Projects Panel */}
      <div className="dashboard-card">
        <h3 className="panel-header">Projects</h3>
        {projects.length === 0 ? (
          <p>No projects assigned.</p>
        ) : (
          <ul className="list">
            {projects.map((project) => (
              <li key={project.id} className="list-item">
                {project.name} - {project.status}
                {project.status !== "Completed" && (
                  <button onClick={() => handleProjectComplete(project.id)}>Mark as Completed</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Leave Requests Panel */}
      <div className="dashboard-card">
        <h3 className="panel-header">Leave Requests</h3>
        <form onSubmit={e => { e.preventDefault(); submitLeaveRequest(); }}>
          <input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} required />
          <input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} required />
          <input type="text" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Reason" required />
          <button type="submit">Submit</button>
        </form>
        {leaveMessage && <p>{leaveMessage}</p>}
        <ul className="list">
          {leaveRequests.map((leave) => (
            <li key={leave.id} className="list-item">
              {leave.start_date} to {leave.end_date} - {leave.reason} ({leave.status})
            </li>
          ))}
        </ul>
      </div>

      {/* Private Chat Panel */}
      {userAccess.private_chat && (
        <div className="dashboard-card">
          <h3 className="panel-header">Private Chat</h3>
          <ul className="list">
            {employees.map(emp => (
              <li key={emp.id} className="list-item">
                {emp.name}
                <button onClick={() => setSelectedReceiver(emp)}>Chat</button>
              </li>
            ))}
          </ul>
          {selectedReceiver && (
            <PrivateChat receiverId={selectedReceiver.id} receiverName={selectedReceiver.name} onClose={() => setSelectedReceiver(null)} />
          )}
        </div>
      )}

      {/* Group Chat Panel */}
      {userAccess.group_chat && (
        <div className="dashboard-card">
          <h3 className="panel-header">Department Group Chat</h3>
          {assignedDept ? (
            <DeptGroupChat department={assignedDept} />
          ) : (
            <DepartmentSelection onDepartmentSelected={() => window.location.reload()} />
          )}
          <button onClick={leaveDepartment}>Leave Department</button>
        </div>
      )}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
