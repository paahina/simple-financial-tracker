import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';

const SignInPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useFormErrorToast(error);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <h1 className="text-2xl font-semibold text-primary-shade">Sign in</h1>
      <Field label="Email">
        <input
          className={inputClass}
          type="email"
          required
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
      </Field>
      <Field label="Password">
        <input
          className={inputClass}
          type="password"
          required
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
      </Field>
      <Button className="w-full" variant="primary" disabled={submitting} type="submit">
        {submitting ? 'Signing in...' : 'Sign in'}
      </Button>
      <p className="text-sm text-neutral-500">
        New here?{' '}
        <Link className="text-primary-shade underline" to="/auth/signup">
          Create an account
        </Link>
      </p>
    </form>
  );
};

export default SignInPage;
