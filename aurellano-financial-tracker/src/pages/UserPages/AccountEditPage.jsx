import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getAccountRequest, updateAccountRequest } from '../../services/api';
import { fromCentavos, toCentavos } from '../../utils/format';
import { hasErrors, optionalAmount, requiredText } from '../../utils/validate';

const AccountEditPage = () => {
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
    getAccountRequest(id, token)
      .then((account) => {
        if (!active) return;
        const nextForm = {
          name: account.name,
          type: account.type,
          currentAmount: fromCentavos(account.balance),
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
          options={[
            { value: 'CASH', label: 'Cash' },
            { value: 'E_WALLET', label: 'E-wallet' },
            { value: 'BANK', label: 'Bank' },
          ]}
          onChange={(type) => setForm({ ...form, type })}
        />
      </Field>
      <Field label="Current amount (PHP)" error={fieldErrors.currentAmount}>
        <input className={inputClass} type="number" min="0" step="0.01" value={form.currentAmount} onChange={(event) => setForm({ ...form, currentAmount: event.target.value })} />
      </Field>
      <Field label="Description">
        <input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </Field>
      <Button onClick={onSubmit}>Save changes</Button>
    </form>
      )}
    </FormModal>
  );
};

export default AccountEditPage;
