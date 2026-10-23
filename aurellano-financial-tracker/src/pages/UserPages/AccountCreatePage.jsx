import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountTypeOptions } from '../../components/AccountTypeChip';
import BelowRemainingChip from '../../components/BelowRemainingChip';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import SubBalanceFields, { emptySubBalanceRow } from '../../components/SubBalanceFields';
import { createAccountRequest } from '../../services/api';
import { belowRemainingBalance } from '../../utils/accounts';
import { fromCentavos, toCentavos } from '../../utils/format';
import { hasErrors, optionalAmount, requiredText } from '../../utils/validate';

const remainingCentavos = (value) => (value === '' || value == null ? null : toCentavos(value));

const emptyForm = {
  name: '',
  type: 'CASH',
  remainingBalance: '',
  subBalances: [emptySubBalanceRow({ label: 'Current', amount: fromCentavos(0) })],
};

const labeledSubBalances = (rows) =>
  rows
    .filter((row) => String(row.label || '').trim())
    .map((row) => ({ label: row.label.trim(), amount: toCentavos(row.amount || 0) }));

const AccountCreatePage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [baseline] = useState(JSON.stringify(emptyForm));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  useFormErrorToast(error);
  const total = labeledSubBalances(form.subBalances).reduce((sum, item) => sum + item.amount, 0);

  const onSubmit = async (event) => {
    event.preventDefault();
    const subBalances = labeledSubBalances(form.subBalances);
    const nextErrors = {
      name: requiredText(form.name, 'Name', 2),
      remainingBalance: optionalAmount(form.remainingBalance, 'Remaining balance'),
      subBalances: !subBalances.length
        ? 'An account must have at least one sub-balance'
        : form.subBalances.some((row) => row.amount && !String(row.label || '').trim())
          ? 'Each sub-balance needs a label'
          : '',
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
            remainingBalance: remainingCentavos(form.remainingBalance),
            currency: 'PHP',
            description: '',
            subBalances,
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
        <Field label="Current amount (PHP)">
          <input className={inputClass} readOnly value={fromCentavos(total)} />
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
        {belowRemainingBalance(total, remainingCentavos(form.remainingBalance)) && (
          <BelowRemainingChip />
        )}
        <SubBalanceFields
          rows={form.subBalances}
          error={fieldErrors.subBalances}
          onChange={(subBalances) => setForm({ ...form, subBalances })}
        />
        <Button type="submit">Save account</Button>
      </form>
    </FormModal>
  );
};

export default AccountCreatePage;
