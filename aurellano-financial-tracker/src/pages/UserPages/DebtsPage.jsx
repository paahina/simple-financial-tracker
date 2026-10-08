import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import Button, { EditLink } from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import {
  createDebtPaymentRequest,
  createDebtRequest,
  deleteDebtRequest,
  getAccountsRequest,
  getDebtsRequest,
} from '../../services/api';
import { datetimeLocalToIso, formatDate, formatPeso, nowDatetimeLocal, todayInput, toCentavos, toIsoDate } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const DebtsPage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [debts, setDebts] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [debtErrors, setDebtErrors] = useState({});
  const [paymentErrors, setPaymentErrors] = useState({});
  const [debtForm, setDebtForm] = useState({ personName: '', originalAmount: '', dueDate: todayInput() });
  const [paymentForm, setPaymentForm] = useState({
    debtId: '',
    accountId: '',
    amount: '',
    paymentDate: nowDatetimeLocal(),
  });

  const load = useCallback(
    () =>
      Promise.all([getDebtsRequest(token), getAccountsRequest(token)])
        .then(([debtList, accountList]) => {
          setDebts(debtList);
          setAccounts(accountList.filter((account) => account.isActive));
        })
        .catch((err) => setError(err.message)),
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onCreateDebt = async (event) => {
    event.preventDefault();
    const nextErrors = {
      personName: requiredText(debtForm.personName, 'Name', 2),
      originalAmount: requiredAmount(debtForm.originalAmount),
      dueDate: requiredChoice(debtForm.dueDate, 'Due date'),
    };
    setDebtErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setError('');
    try {
      await createDebtRequest(
        {
          personName: debtForm.personName,
          originalAmount: toCentavos(debtForm.originalAmount),
          dueDate: toIsoDate(debtForm.dueDate),
        },
        token,
      );
      notify('Debt saved');
      setDebtForm({ personName: '', originalAmount: '', dueDate: todayInput() });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onDelete = async (debtId) => {
    const accepted = await confirm({
      title: 'Delete debt?',
      message: 'This removes the debt. Debts with payments must have those payments deleted first.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    try {
      await deleteDebtRequest(debtId, token);
      notify('Debt deleted');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onPay = async (event) => {
    event.preventDefault();
    const nextErrors = {
      debtId: requiredChoice(paymentForm.debtId, 'Debt'),
      accountId: requiredChoice(paymentForm.accountId, 'Account'),
      amount: requiredAmount(paymentForm.amount),
      paymentDate: requiredChoice(paymentForm.paymentDate, 'Date'),
    };
    setPaymentErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setError('');
    try {
      await createDebtPaymentRequest(
        {
          ...paymentForm,
          amount: toCentavos(paymentForm.amount),
          paymentDate: datetimeLocalToIso(paymentForm.paymentDate),
        },
        token,
      );
      notify('Payment recorded');
      setPaymentForm({ ...paymentForm, amount: '', paymentDate: nowDatetimeLocal() });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-semibold text-primary-shade">Debts</h1>
      <p className="text-sm text-neutral-500">This is money other people owe you. It is separate from the cash in your accounts.</p>
      <ErrorText message={error} />
      {!debts && <Loading />}
      {debts?.length === 0 && <Empty label="Nobody owes you money yet." />}
      <ul className="space-y-3">
        {debts?.map((debt) => (
          <li key={debt._id} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{debt.personName}</p>
                <p className="text-neutral-500">
                  {debt.status} · due {formatDate(debt.dueDate)}
                </p>
                <p className="mt-2">
                  Remaining {formatPeso(debt.remainingAmount)} of {formatPeso(debt.originalAmount)}
                </p>
              </div>
              <span className="flex items-center gap-2">
                <Link className="text-primary-shade underline" to={`/debts/${debt._id}`}>
                  Payments
                </Link>
                <EditLink to={`/debts/${debt._id}/edit`}>Edit</EditLink>
                {debt.paidAmount === 0 && (
                  <Button variant="danger" icon={Trash2} onClick={() => onDelete(debt._id)}>
                    Delete
                  </Button>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 lg:grid-cols-2">
        <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onCreateDebt}>
          <h2 className="text-lg text-primary">Someone owes you</h2>
          <Field label="Name" error={debtErrors.personName}>
            <input className={inputClass} required value={debtForm.personName} onChange={(event) => setDebtForm({ ...debtForm, personName: event.target.value })} />
          </Field>
          <Field label="Amount (PHP)" error={debtErrors.originalAmount}>
            <input className={inputClass} required type="number" min="0.01" step="0.01" value={debtForm.originalAmount} onChange={(event) => setDebtForm({ ...debtForm, originalAmount: event.target.value })} />
          </Field>
          <Field label="Due date" error={debtErrors.dueDate}>
            <input className={inputClass} required type="date" value={debtForm.dueDate} onChange={(event) => setDebtForm({ ...debtForm, dueDate: event.target.value })} />
          </Field>
          <Button onClick={onCreateDebt}>Save debt</Button>
        </form>
        <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onPay}>
          <h2 className="text-lg text-primary">Record a payment</h2>
          <Field label="Debt" error={paymentErrors.debtId}>
            <select className={inputClass} required value={paymentForm.debtId} onChange={(event) => setPaymentForm({ ...paymentForm, debtId: event.target.value })}>
              <option value="">Select</option>
              {debts?.filter((debt) => debt.remainingAmount > 0).map((debt) => (
                <option key={debt._id} value={debt._id}>
                  {debt.personName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Money goes into" error={paymentErrors.accountId}>
            <select className={inputClass} required value={paymentForm.accountId} onChange={(event) => setPaymentForm({ ...paymentForm, accountId: event.target.value })}>
              <option value="">Select</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (PHP)" error={paymentErrors.amount}>
            <input className={inputClass} required type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
          </Field>
          <Field label="Date and time" error={paymentErrors.paymentDate}>
            <input className={inputClass} required type="datetime-local" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })} />
          </Field>
          <Button variant="tint" onClick={onPay}>
            Record payment
          </Button>
        </form>
      </div>
    </section>
  );
};

export default DebtsPage;
