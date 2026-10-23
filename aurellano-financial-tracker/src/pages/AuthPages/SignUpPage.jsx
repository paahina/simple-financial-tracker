import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';

const SignUpPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useFormErrorToast(error);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signup(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <h1 className="text-2xl font-semibold text-primary-shade">Create account</h1>
      <Field label="Name">
        <input
          className={inputClass}
          required
          minLength={2}
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </Field>
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
          minLength={6}
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
      </Field>
      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? 'Creating...' : 'Create account'}
      </Button>
      <p className="text-sm text-neutral-500">
        Already registered?{' '}
        <Link className="text-primary-shade underline" to="/auth/signin">
          Sign in
        </Link>
      </p>
    </form>
  );
};

export default SignUpPage;
