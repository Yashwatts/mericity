import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ResponsiveDashboard from "./pages/ResponsiveDashboard";
import CompleteProfile from "./pages/CompleteProfile";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import DepartmentLogin from "./pages/DepartmentLogin";
import DepartmentDashboard from "./pages/DepartmentDashboard";
import ToastContainer from "./components/ToastContainer";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ResponsiveDashboard />} />
        <Route path="/dashboard-old" element={<Dashboard />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/department" element={<DepartmentLogin />} />
        <Route path="/department/dashboard" element={<DepartmentDashboard />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
