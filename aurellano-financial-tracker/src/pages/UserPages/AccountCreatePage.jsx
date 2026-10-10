import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountTypeOptions } from '../../components/AccountTypeChip';
import BelowRemainingChip from '../../components/BelowRemainingChip';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { createAccountRequest } from '../../services/api';
import { belowRemainingBalance } from '../../utils/accounts';
import { toCentavos } from '../../utils/format';
import { hasErrors, optionalAmount, requiredText } from '../../utils/validate';

const emptyForm = { name: '', type: 'CASH', initialBalance: '', remainingBalance: '' };

const remainingCentavos = (value) => (value === '' || value == null ? null : toCentavos(value));

const AccountCreatePage = () => {
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
      name: requiredText(form.name, 'Name', 2),
      initialBalance: optionalAmount(form.initialBalance, 'Current amount'),
      remainingBalance: optionalAmount(form.remainingBalance, 'Remaining balance'),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setError('');
    try {
      await afterSave(async () => {
        await createAccountRequest(
          {
            name: form.name,
            type: form.type,
            initialBalance: toCentavos(form.initialBalance || 0),
            remainingBalance: remainingCentavos(form.remainingBalance),
            currency: 'PHP',
            description: '',
          },
          token,
        );
        navigate('/accounts');
        invalidateFamilies('accounts', 'dashboard');
        notify('Account created');
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/accounts">
      <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
        <h1 className="pr-8 text-2xl font-semibold text-primary-shade">New account</h1>
        <ErrorText message={error} />
        <Field label="Name" error={fieldErrors.name}>
          <input
            className={inputClass}
            required
            minLength={2}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>
        <Field label="Type">
          <Select
            value={form.type}
            options={accountTypeOptions}
            onChange={(type) => setForm({ ...form, type })}
          />
        </Field>
        <Field label="Current amount (PHP)" error={fieldErrors.initialBalance}>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={form.initialBalance}
            onChange={(event) => setForm({ ...form, initialBalance: event.target.value })}
          />
        </Field>
        <Field label="Remaining balance (PHP)" error={fieldErrors.remainingBalance}>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={form.remainingBalance}
            onChange={(event) => setForm({ ...form, remainingBalance: event.target.value })}
          />
        </Field>
        {belowRemainingBalance(toCentavos(form.initialBalance || 0), remainingCentavos(form.remainingBalance)) && (
          <BelowRemainingChip />
        )}
        <Button type="submit">Save account</Button>
      </form>
    </FormModal>
  );
};

export default AccountCreatePage;
