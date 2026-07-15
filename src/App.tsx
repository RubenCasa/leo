import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { Navbar } from './components/Navbar';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { Home } from './pages/Home';
import { ProductsCatalog } from './pages/ProductsCatalog';
import { Checkout } from './pages/Checkout';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MisFacturas } from './pages/MisFacturas';

// Admin Pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminReports } from './pages/admin/AdminReports';

// Seller Pages
import { SellerPanel } from './pages/seller/SellerPanel';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <TopBar />
          <Navbar />
          <AuthModal />
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/productos" element={<ProductsCatalog />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/mis-facturas" element={<MisFacturas />} />

            {/* Rutas de Administrador (protegidas por rol) */}
            <Route path="/admin" element={
              <ProtectedRoute roles={['administrador']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="productos" element={<AdminProducts />} />
              <Route path="usuarios" element={<AdminUsers />} />
              <Route path="reportes" element={<AdminReports />} />
            </Route>

            {/* Ruta de Vendedor (protegida por rol) */}
            <Route path="/vendedor" element={
              <ProtectedRoute roles={['vendedor', 'administrador']}>
                <SellerPanel />
              </ProtectedRoute>
            } />
          </Routes>
          <FloatingWhatsApp />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
