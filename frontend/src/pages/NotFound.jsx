import { Link } from 'react-router-dom';
import { ShieldCheck, Home } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-[#0B1120] text-[#172033] dark:text-[#F8FAFC] text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 shadow-md">
        <ShieldCheck className="w-8 h-8" />
      </div>

      <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
        404 Page Not Found
      </span>

      <h1 className="text-3xl sm:text-4xl font-extrabold mt-2 mb-3">
        Looking for a Community Issue?
      </h1>

      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8">
        The page or resource you requested cannot be located. It might have been moved or doesn't exist.
      </p>

      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
            Return to Citizen Portal
          </Button>
        </Link>
        <Link to="/admin">
          <Button variant="outline">
            Admin Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
