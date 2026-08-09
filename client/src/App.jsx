import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Navbar/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import MachineDetail from './pages/MachineDetail/MachineDetail';
import ManualTest from './pages/ManualTest/ManualTest';

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <Layout>
          <Routes>
            <Route path="/"                      element={<Dashboard />} />
            <Route path="/machine/:machineId"    element={<MachineDetail />} />
            <Route path="/manual-test"           element={<ManualTest />} />
          </Routes>
        </Layout>
      </SocketProvider>
    </BrowserRouter>
  );
}
