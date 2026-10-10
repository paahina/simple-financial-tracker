import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { invalidateFamilies } from '../../query/cache';
import { getAccountsRequest, getDebtRequest, updateDebtPaymentRequest } from '../../services/api';
import { accountOption, selectableAccounts } from '../../utils/accounts';
import { datetimeLocalInput, datetimeLocalToIso, fromCentavos, toCentavos } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice } from '../../utils/validate';

const PaymentEditPage = () => {
  const { id, paymentId } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all([getDebtRequest(id, token), getAccountsRequest(token)])
      .then(([detail, accountList]) => {
        if (!active) return;
        const payment = detail.payments.find((item) => item._id === paymentId);
        if (!payment) {
          setError('Payment not found');
          return;
        }
        setAccounts(selectableAccounts(accountList, [payment.accountId]));
        const nextForm = {
          accountId: payment.accountId,
          amount: fromCentavos(payment.amount),
          paymentDate: datetimeLocalInput(payment.paymentDate),
          notes: payment.notes || '',
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
  }, [id, paymentId, token]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      accountId: requiredChoice(form.accountId, 'Account'),
      amount: requiredAmount(form.amount),
      paymentDate: requiredChoice(form.paymentDate, 'Date'),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setError('');
    try {
      await updateDebtPaymentRequest(
        paymentId,
        {
          accountId: form.accountId,
          amount: toCentavos(form.amount),
          paymentDate: datetimeLocalToIso(form.paymentDate),
          notes: form.notes,
        },
        token,
      );
      await invalidateFamilies('debts', 'dashboard', 'accounts');
      notify('Payment updated');
      navigate(`/debts/${id}?tab=payments`);
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo={`/debts/${id}?tab=payments`}>
      {error && !form && <ErrorText message={error} />}
      {!form && !error && <Loading variant="form" />}
      {form && (
    <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Edit payment</h1>
      <ErrorText message={error} />
      <Field label="Money goes into" error={fieldErrors.accountId}>
        <Select
          value={form.accountId}
          options={accounts.map(accountOption)}
          onChange={(accountId) => setForm({ ...form, accountId })}
        />
      </Field>
      <Field label="Amount (PHP)" error={fieldErrors.amount}>
        <input className={inputClass} required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
      </Field>
      <Field label="Date and time" error={fieldErrors.paymentDate}>
        <input className={inputClass} required type="datetime-local" value={form.paymentDate} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} />
      </Field>
      <Field label="Notes">
        <input className={inputClass} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </Field>
      <Button type="submit">Save changes</Button>
    </form>
      )}
    </FormModal>
  );
};

export default PaymentEditPage;
