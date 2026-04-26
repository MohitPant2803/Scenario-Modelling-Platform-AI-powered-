import { Route, Routes } from "react-router-dom";
import AuthLayout from "./auth/AuthLayout";
import AccessControlPage from "./pages/AccessControlPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MyProjectsPage from "./pages/MyProjectsPage";
import ProjectPage from "./pages/ProjectPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/access-control" element={<AccessControlPage />} />
          <Route path="/my-projects" element={<MyProjectsPage />} />
          <Route path="/my-projects/:userId" element={<MyProjectsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />
        </Route>
      </Routes>
    </div>
  );
}
