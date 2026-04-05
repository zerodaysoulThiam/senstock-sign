import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, extractName, logout } from '@/lib/auth';
import { LogOut, FileText, Shield, PenTool, Moon, Sun, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';
import { useState } from 'react';

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const name = extractName(user.email);
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  const isAdmin = user.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Tableau de bord', icon: FileText },
    { path: '/sign', label: 'Signer', icon: PenTool },
    ...(isAdmin ? [{ path: '/admin', label: 'Administration', icon: Shield }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg brand-gradient flex items-center justify-center">
              <PenTool className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">SENSTOCK</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8"
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <div className="hidden sm:flex items-center gap-2.5 border-l pl-3 ml-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium leading-none">{name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{isAdmin ? 'Admin' : 'Utilisateur'}</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={handleLogout} title="Déconnexion" className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>

          {/* Mobile menu toggle */}
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-card px-4 py-2 space-y-1">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === item.path ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
