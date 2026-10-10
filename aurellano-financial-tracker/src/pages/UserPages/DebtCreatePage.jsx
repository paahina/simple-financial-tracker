import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import FormModal from '../../components/FormModal';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { createDebtRequest } from '../../services/api';
import { toCentavos, toIsoDate } from '../../utils/format';
import { hasErrors, requiredAmount, requiredText } from '../../utils/validate';

const emptyForm = { personName: '', originalAmount: '', dueDate: '', description: '' };

const DebtCreatePage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [baseline] = useState(JSON.stringify(emptyForm));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      personName: requiredText(form.personName, 'Name', 2),
      originalAmount: requiredAmount(form.originalAmount),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setError('');
    try {
      await createDebtRequest(
        {
          personName: form.personName,
          originalAmount: toCentavos(form.originalAmount),
          ...(form.dueDate ? { dueDate: toIsoDate(form.dueDate) } : {}),
          description: form.description.trim(),
        },
        token,
      );
      notify('Debt saved');
      navigate('/debts');
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/debts">
      <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
        <h1 className="pr-8 text-2xl font-semibold text-primary-shade">New debt</h1>
        <ErrorText message={error} />
        <Field label="Name" error={fieldErrors.personName}>
          <input
            className={inputClass}
            required
            minLength={2}
            value={form.personName}
            onChange={(event) => setForm({ ...form, personName: event.target.value })}
          />
        </Field>
        <Field label="Amount (PHP)" error={fieldErrors.originalAmount}>
          <input
            className={inputClass}
            required
            type="number"
            min="0.01"
            step="0.01"
            value={form.originalAmount}
            onChange={(event) => setForm({ ...form, originalAmount: event.target.value })}
          />
        </Field>
        <Field label="Description">
          <input
            className={inputClass}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>
        <Field label="Due date">
          <input
            className={inputClass}
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
          />
        </Field>
        <Button onClick={onSubmit}>Save debt</Button>
      </form>
    </FormModal>
  );
};

export default DebtCreatePage;
