import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { AuthLayout } from '../../framework/components/AuthLayout';
import { RegisterForm } from '../components/RegisterForm';
import { checkAuthClient } from '../auth-client';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    checkAuthClient().then((isAuth) => {
      if (isAuth) {
        hasCheckedRef.current = true;
        navigate('/dashboard');
      }
    });
  }, [navigate]);
  return (
    <AuthLayout title="Register">
      <RegisterForm />
    </AuthLayout>
  );
};

export default RegisterPage;
