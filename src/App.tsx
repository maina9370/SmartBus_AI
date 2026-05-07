import { useState, useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  Bus as BusIcon, 
  Users, 
  ShieldCheck, 
  Bell, 
  LayoutDashboard, 
  FileCheck,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

// Pages
import Dashboard from './components/Dashboard';
import VerificationTerminal from './components/VerificationTerminal';
import StudentRegistration from './components/StudentRegistration';
import ParentView from './components/ParentView';
import Login from './components/Login';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(!auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function Navigation() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Verification', path: '/verify', icon: ShieldCheck },
    { name: 'Students', path: '/students', icon: Users },
  ];

  if (!user && location.pathname !== '/login') return null;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <BusIcon className="text-white w-5 h-5" />
          </div>
          <span className="font-sans font-bold tracking-tight text-xl">SmartBus AI</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                location.pathname === item.path ? 'text-black' : 'text-gray-500 hover:text-black'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          ))}
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 ml-4 border-l pl-4 border-gray-100"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 top-16 bg-white z-40 md:hidden p-6"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 text-lg font-medium p-4 rounded-xl bg-gray-50"
                >
                  <item.icon className="w-6 h-6" />
                  {item.name}
                </Link>
              ))}
              <button 
                onClick={() => {
                  signOut(auth);
                  setIsOpen(false);
                }}
                className="flex items-center gap-4 text-lg font-medium p-4 rounded-xl bg-red-50 text-red-600 mt-4"
              >
                <LogOut className="w-6 h-6" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F9FAFB] text-black">
        <Navigation />
        <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/verify" element={<ProtectedRoute><VerificationTerminal /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute><StudentRegistration /></ProtectedRoute>} />
            <Route path="/parent" element={<ProtectedRoute><ParentView /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
