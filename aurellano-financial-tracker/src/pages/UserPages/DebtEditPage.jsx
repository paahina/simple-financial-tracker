import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getDebtRequest, updateDebtRequest } from '../../services/api';
import { dateInput, fromCentavos, toCentavos, toIsoDate } from '../../utils/format';

const DebtEditPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getDebtRequest(id, token)
      .then(({ debt }) => {
        if (!active) return;
        setForm({
          personName: debt.personName,
          originalAmount: fromCentavos(debt.originalAmount),
          dueDate: dateInput(debt.dueDate),
          description: debt.description || '',
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
      await updateDebtRequest(
        id,
        {
          personName: form.personName,
          originalAmount: toCentavos(form.originalAmount),
          dueDate: toIsoDate(form.dueDate),
          description: form.description,
        },
        token,
      );
      notify('Debt updated');
      navigate(`/debts/${id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !form) return <ErrorText message={error} />;
  if (!form) return <Loading />;

  return (
    <form className="mx-auto max-w-lg space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <Link className="text-sm text-primary-shade underline" to={`/debts/${id}`}>
        Back to debt
      </Link>
      <h1 className="text-2xl font-semibold text-primary-shade">Edit debt</h1>
      <ErrorText message={error} />
      <Field label="Name">
        <input className={inputClass} required minLength={2} value={form.personName} onChange={(event) => setForm({ ...form, personName: event.target.value })} />
      </Field>
      <Field label="Amount (PHP)">
        <input className={inputClass} required type="number" min="0.01" step="0.01" value={form.originalAmount} onChange={(event) => setForm({ ...form, originalAmount: event.target.value })} />
      </Field>
      <Field label="Due date">
        <input className={inputClass} required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
      </Field>
      <Field label="Description">
        <input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </Field>
      <Button onClick={onSubmit}>Save changes</Button>
    </form>
  );
};

export default DebtEditPage;
