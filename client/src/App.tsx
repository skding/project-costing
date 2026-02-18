import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProjectEditor from './pages/ProjectEditor';
import ComponentLibrary from './pages/ComponentLibrary';
import ClientManagement from './pages/ClientManagement';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<PrivateRoute />}>
            <Route element={<Layout><Dashboard /></Layout>} path="/" />
            <Route element={<Layout><ProjectEditor /></Layout>} path="/projects/:id/versions/:versionId" />
            <Route element={<Layout><ComponentLibrary /></Layout>} path="/components" />
            <Route element={<Layout><ClientManagement /></Layout>} path="/clients" />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
