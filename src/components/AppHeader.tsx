import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, extractName, logout } from '@/lib/auth';
import { LogOut, FileText, Shield, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();

  if (!user) return null;

  const name = extractName(user.email);
  const isAdmin = user.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Tableau de bord', icon: FileText },
    { path: '/sign', label: 'Signer', icon: PenTool },
    ...(isAdmin ? [{ path: '/admin', label: 'Administration', icon: Shield }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg brand-gradient flex items-center justify-center">
              <PenTool className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-gradient">SENSTOCK</span>
          </button>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground">
            {name.split(' ').map(n => n[0]).join('')}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Déconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
