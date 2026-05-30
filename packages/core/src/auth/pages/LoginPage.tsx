import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AuthLayout } from '../../framework/components/AuthLayout';
import { LoginForm } from '../components/LoginForm';
import { checkAuthClient } from '../auth-client';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkAuthClient().then((isAuth) => {
      if (isAuth) {
        const redirect = searchParams.get('redirect') || '/';
        navigate(redirect);
      }
    });
  }, [navigate, searchParams]);
  return (
    <AuthLayout title="Login">
      <LoginForm />
    </AuthLayout>
  );
};

export default LoginPage;
