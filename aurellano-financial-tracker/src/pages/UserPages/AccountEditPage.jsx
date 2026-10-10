import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { accountTypeOptions } from '../../components/AccountTypeChip';
import BelowRemainingChip from '../../components/BelowRemainingChip';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { invalidateFamilies } from '../../query/cache';
import { deleteAccountRequest, getAccountRequest, updateAccountRequest } from '../../services/api';
import { belowRemainingBalance } from '../../utils/accounts';
import { fromCentavos, toCentavos } from '../../utils/format';
import { hasErrors, optionalAmount, requiredText } from '../../utils/validate';

const remainingCentavos = (value) => (value === '' || value == null ? null : toCentavos(value));

const AccountEditPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;
    getAccountRequest(id, token)
      .then((account) => {
        if (!active) return;
        const nextForm = {
          name: account.name,
          type: account.type,
          currentAmount: fromCentavos(account.balance),
          remainingBalance: account.remainingBalance == null ? '' : fromCentavos(account.remainingBalance),
          description: account.description || '',
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
      name: requiredText(form.name, 'Name', 2),
      currentAmount: optionalAmount(form.currentAmount, 'Current amount'),
      remainingBalance: optionalAmount(form.remainingBalance, 'Remaining balance'),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setError('');
    try {
      await updateAccountRequest(
        id,
        {
          name: form.name,
          type: form.type,
          currentBalance: toCentavos(form.currentAmount || 0),
          remainingBalance: remainingCentavos(form.remainingBalance),
          description: form.description,
        },
        token,
      );
      await invalidateFamilies('accounts', 'dashboard');
      notify('Account updated');
      navigate('/accounts');
    } catch (err) {
      setError(err.message);
    }
  };

  const onDelete = async () => {
    const accepted = await confirm({
      title: 'Delete account?',
      message: 'This removes the account. An account with transactions, transfers, or debt payments cannot be deleted.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    setError('');
    try {
      await deleteAccountRequest(id, token);
      await invalidateFamilies('accounts', 'dashboard');
      notify('Account deleted');
      navigate('/accounts');
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/accounts">
      {error && !form && <ErrorText message={error} />}
      {!form && !error && <Loading variant="form" />}
      {form && (
    <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Edit account</h1>
      <ErrorText message={error} />
      <Field label="Name" error={fieldErrors.name}>
        <input className={inputClass} required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </Field>
      <Field label="Type">
        <Select
          value={form.type}
          options={accountTypeOptions}
          onChange={(type) => setForm({ ...form, type })}
        />
      </Field>
      <Field label="Current amount (PHP)" error={fieldErrors.currentAmount}>
        <input className={inputClass} type="number" min="0" step="0.01" value={form.currentAmount} onChange={(event) => setForm({ ...form, currentAmount: event.target.value })} />
      </Field>
      <Field label="Remaining balance (PHP)" error={fieldErrors.remainingBalance}>
        <input className={inputClass} type="number" min="0" step="0.01" value={form.remainingBalance} onChange={(event) => setForm({ ...form, remainingBalance: event.target.value })} />
      </Field>
      {belowRemainingBalance(toCentavos(form.currentAmount || 0), remainingCentavos(form.remainingBalance)) && (
        <BelowRemainingChip />
      )}
      <Field label="Description">
        <input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">Save changes</Button>
        <Button variant="danger" icon={Trash2} onClick={onDelete}>
          Delete
        </Button>
      </div>
    </form>
      )}
    </FormModal>
  );
};

export default AccountEditPage;
