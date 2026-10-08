import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { createAccountRequest } from '../../services/api';
import { toCentavos } from '../../utils/format';
import { hasErrors, optionalAmount, requiredText } from '../../utils/validate';

const emptyForm = { name: '', type: 'CASH', initialBalance: '' };

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
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setError('');
    try {
      await createAccountRequest(
        {
          name: form.name,
          type: form.type,
          initialBalance: toCentavos(form.initialBalance || 0),
          currency: 'PHP',
          description: '',
        },
        token,
      );
      notify('Account created');
      navigate('/accounts');
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
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'E_WALLET', label: 'E-wallet' },
              { value: 'BANK', label: 'Bank' },
            ]}
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
        <Button onClick={onSubmit}>Save account</Button>
      </form>
    </FormModal>
  );
};

export default AccountCreatePage;
