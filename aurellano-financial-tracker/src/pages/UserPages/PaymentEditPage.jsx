import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getAccountsRequest, getDebtRequest, updateDebtPaymentRequest } from '../../services/api';
import { dateInput, fromCentavos, toCentavos, toIsoDate } from '../../utils/format';

const PaymentEditPage = () => {
  const { id, paymentId } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');

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
        setAccounts(accountList.filter((account) => account.isActive));
        setForm({
          accountId: payment.accountId,
          amount: fromCentavos(payment.amount),
          paymentDate: dateInput(payment.paymentDate),
          notes: payment.notes || '',
        });
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
    setError('');
    try {
      await updateDebtPaymentRequest(
        paymentId,
        {
          accountId: form.accountId,
          amount: toCentavos(form.amount),
          paymentDate: toIsoDate(form.paymentDate),
          notes: form.notes,
        },
        token,
      );
      notify('Payment updated');
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
      <h1 className="text-2xl font-semibold text-primary-shade">Edit payment</h1>
      <ErrorText message={error} />
      <Field label="Money goes into">
        <select className={inputClass} required value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>
          {accounts.map((account) => (
            <option key={account._id} value={account._id}>
              {account.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Amount (PHP)">
        <input className={inputClass} required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
      </Field>
      <Field label="Date">
        <input className={inputClass} required type="date" value={form.paymentDate} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} />
      </Field>
      <Field label="Notes">
        <input className={inputClass} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </Field>
      <Button onClick={onSubmit}>Save changes</Button>
    </form>
  );
};

export default PaymentEditPage;
