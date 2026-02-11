import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';

const Index = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const user = getCurrentUser();
    navigate(user ? '/dashboard' : '/login');
  }, []);
  return null;
};

export default Index;
