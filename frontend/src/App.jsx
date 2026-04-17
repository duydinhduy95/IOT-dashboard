import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Activity, Settings, Cpu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/Settings';

const Sidebar = () => (
  <div className="sidebar">
    <div className="sidebar-logo">
      <Cpu size={32} color="#3b82f6" />
      <span>IoT Dashboard</span>
    </div>

    <nav>
      <NavLink
        to="/"
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        <Activity size={20} />
        Overview
      </NavLink>
      <NavLink
        to="/settings"
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        <Settings size={20} />
        Settings
      </NavLink>
    </nav>
  </div>
);

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
