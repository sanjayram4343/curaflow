import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input, Button } from '../components/ui';
import { Mail, Lock, AlertCircle } from 'lucide-react';

const ROLES = [
  { name: 'Super Admin', email: 'superadmin@hospital.com', pass: 'admin123' },
  { name: 'H. Admin',   email: 'admin@stmarys.com',       pass: 'admin123' },
  { name: 'Doctor',     email: 'doctor@stmarys.com',      pass: 'doctor123' },
  { name: 'Nurse',      email: 'nurse@stmarys.com',       pass: 'nurse123' },
  { name: 'Reception',  email: 'staff@stmarys.com',       pass: 'staff123' },
];

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickFill = (role: typeof ROLES[0]) => {
    setEmail(role.email);
    setPassword(role.pass);
    setSelected(role.name);
    setError('');
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0a0a0a]">

      {/* LEFT — branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-gray-900 dark:bg-black p-12">
        <div>
          <span className="font-bold text-white text-xl tracking-tight">CuraFlow</span>
        </div>

        <div>
          <h1 className="text-4xl font-extrabold text-white leading-snug tracking-tight mb-4">
            Hospital<br />Operations<br />Platform
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            Unified bed management, patient flow, equipment coordination, and compliance reporting.
          </p>

          {/* Feature list */}
          <ul className="mt-8 space-y-2.5 text-sm text-gray-400">
            {[
              'Real-time bed & ICU tracking',
              'Medical equipment coordination',
              'Patient admission & transfers',
              'Role-based access control',
              'Reports & audit trails',
            ].map(f => (
              <li key={f} className="flex items-center gap-2.5">
                <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-gray-600">CuraFlow v2.0 · Secure</p>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <span className="font-bold text-xl text-gray-900 dark:text-white">CuraFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-7">Enter your credentials to continue</p>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30 animate-fade-in">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="login-email"
              label="Email"
              type="email"
              placeholder="doctor@stmarys.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              required
              autoComplete="email"
            />
            <Input
              id="login-password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              required
              autoComplete="current-password"
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          {/* Quick fill */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-100 dark:bg-[#1f1f1f]" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">Quick-fill roles</span>
              <div className="h-px flex-1 bg-gray-100 dark:bg-[#1f1f1f]" />
            </div>

            <div className="grid grid-cols-5 gap-2">
              {ROLES.map(role => (
                <button
                  key={role.name}
                  type="button"
                  onClick={() => quickFill(role)}
                  className={`py-2.5 px-1.5 rounded-lg border text-[10px] font-semibold text-center transition-colors ${
                    selected === role.name
                      ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-[#2a2a2a] dark:text-gray-400 dark:hover:bg-[#1a1a1a]'
                  }`}
                >
                  {role.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Login;
