import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import FormModal from '../../components/FormModal';
import { Empty, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { getDebtRequest, updateDebtAdditionRequest } from '../../services/api';
import { dateInput, datetimeLocalInput, datetimeLocalToIso, fromCentavos, toCentavos, toIsoDate } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const DebtAdditionEditPage = () => {
  const { id, additionId } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  useFormErrorToast(error);
  const closeTo = `/debts/${id}?tab=additions`;

  useEffect(() => {
    let active = true;
    getDebtRequest(id, token)
      .then(({ debt }) => {
        if (!active) return;
        const line = debt.additions?.find((item) => item._id === additionId);
        if (!line) {
          setError('Category not found');
          return;
        }
        const nextForm = {
          label: line.label,
          amount: fromCentavos(line.amount),
          dueDate: line.dueDate ? dateInput(line.dueDate) : '',
          createdAt: datetimeLocalInput(line.createdAt),
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
  }, [additionId, id, token]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      label: requiredText(form.label, 'Label'),
      amount: requiredAmount(form.amount),
      createdAt: requiredChoice(form.createdAt, 'Date'),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setError('');
    try {
      await afterSave(async () => {
        await updateDebtAdditionRequest(
          additionId,
          {
            label: form.label.trim(),
            amount: toCentavos(form.amount),
            createdAt: datetimeLocalToIso(form.createdAt),
            dueDate: form.dueDate ? toIsoDate(form.dueDate) : null,
          },
          token,
        );
        navigate(closeTo);
        invalidateFamilies('debts', 'dashboard');
        notify('Category updated');
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo={closeTo}>
      {error && !form && <Empty label="Couldn't load this form." />}
      {!form && !error && <Loading variant="form" />}
      {form && (
        <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
          <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Edit category</h1>
          <Field label="Label" error={fieldErrors.label}>
            <input
              className={inputClass}
              required
              value={form.label}
              onChange={(event) => setForm({ ...form, label: event.target.value })}
            />
          </Field>
          <Field label="Amount (PHP)" error={fieldErrors.amount}>
            <input
              className={inputClass}
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
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
          <Field label="Date and time" error={fieldErrors.createdAt}>
            <input
              className={inputClass}
              required
              type="datetime-local"
              value={form.createdAt}
              onChange={(event) => setForm({ ...form, createdAt: event.target.value })}
            />
          </Field>
          <Button type="submit">Save changes</Button>
        </form>
      )}
    </FormModal>
  );
};

export default DebtAdditionEditPage;
