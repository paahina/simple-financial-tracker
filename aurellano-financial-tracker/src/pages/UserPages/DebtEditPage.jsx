import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import FormModal from '../../components/FormModal';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { getDebtRequest, updateDebtRequest } from '../../services/api';
import { dateInput, fromCentavos, toCentavos, toIsoDate } from '../../utils/format';
import { hasErrors, requiredAmount, requiredText } from '../../utils/validate';

const DebtEditPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;
    getDebtRequest(id, token)
      .then(({ debt }) => {
        if (!active) return;
        const nextForm = {
          personName: debt.personName,
          originalAmount: fromCentavos(debt.originalAmount),
          dueDate: debt.dueDate ? dateInput(debt.dueDate) : '',
          description: debt.description || '',
        };
        setForm(nextForm);
        setBaseline(JSON.stringify(nextForm));
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
    const nextErrors = {
      personName: requiredText(form.personName, 'Name', 2),
      originalAmount: requiredAmount(form.originalAmount),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setError('');
    const payload = {
      personName: form.personName,
      originalAmount: toCentavos(form.originalAmount),
      dueDate: form.dueDate ? toIsoDate(form.dueDate) : null,
      description: form.description,
    };
    try {
      await afterSave(async () => {
        await updateDebtRequest(id, payload, token);
        navigate(`/debts/${id}`);
        invalidateFamilies('debts', 'dashboard');
        notify('Debt updated');
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/debts">
      {error && !form && <ErrorText message={error} />}
      {!form && !error && <Loading variant="form" />}
      {form && (
    <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Edit debt</h1>
      <ErrorText message={error} />
      <Field label="Name" error={fieldErrors.personName}>
        <input className={inputClass} required minLength={2} value={form.personName} onChange={(event) => setForm({ ...form, personName: event.target.value })} />
      </Field>
      <Field label="Amount (PHP)" error={fieldErrors.originalAmount}>
        <input className={inputClass} required type="number" min="0.01" step="0.01" value={form.originalAmount} onChange={(event) => setForm({ ...form, originalAmount: event.target.value })} />
      </Field>
      <Field label="Due date">
        <input className={inputClass} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
      </Field>
      <Field label="Description">
        <input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </Field>
      <Button type="submit">Save changes</Button>
    </form>
      )}
    </FormModal>
  );
};

export default DebtEditPage;
