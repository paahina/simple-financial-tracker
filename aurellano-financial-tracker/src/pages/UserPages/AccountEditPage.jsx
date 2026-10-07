import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getAccountRequest, updateAccountRequest } from '../../services/api';
import { fromCentavos, toCentavos } from '../../utils/format';

const AccountEditPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getAccountRequest(id, token)
      .then((account) => {
        if (!active) return;
        setForm({
          name: account.name,
          type: account.type,
          currentAmount: fromCentavos(account.balance),
          description: account.description || '',
        });
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [id, token]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await updateAccountRequest(
        id,
        {
          name: form.name,
          type: form.type,
          currentBalance: toCentavos(form.currentAmount || 0),
          description: form.description,
        },
        token,
      );
      notify('Account updated');
      navigate('/accounts');
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !form) return <ErrorText message={error} />;
  if (!form) return <Loading />;

  return (
    <form className="mx-auto max-w-lg space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <Link className="text-sm text-primary-shade underline" to="/accounts">
        Back to accounts
      </Link>
      <h1 className="text-2xl font-semibold text-primary-shade">Edit account</h1>
      <ErrorText message={error} />
      <Field label="Name">
        <input className={inputClass} required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </Field>
      <Field label="Type">
        <select className={inputClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          <option value="CASH">Cash</option>
          <option value="E_WALLET">E-wallet</option>
          <option value="BANK">Bank</option>
        </select>
      </Field>
      <Field label="Current amount (PHP)">
        <input className={inputClass} type="number" min="0" step="0.01" value={form.currentAmount} onChange={(event) => setForm({ ...form, currentAmount: event.target.value })} />
      </Field>
      <Field label="Description">
        <input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </Field>
      <Button onClick={onSubmit}>Save changes</Button>
    </form>
  );
};

export default AccountEditPage;
