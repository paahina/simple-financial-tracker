import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { deleteDebtPaymentRequest, getAccountsRequest, getDebtRequest } from '../../services/api';
import { formatDate, formatPeso } from '../../utils/format';

const DebtDetailPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const [debt, setDebt] = useState(null);
  const [payments, setPayments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(
    () =>
      Promise.all([getDebtRequest(id, token), getAccountsRequest(token)])
        .then(([detail, accountList]) => {
          setDebt(detail.debt);
          setPayments(detail.payments);
          setAccounts(accountList);
        })
        .catch((err) => setError(err.message)),
    [id, token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (accountId) => accounts.find((account) => account._id === accountId)?.name || 'Account';

  const onDeletePayment = async (paymentId) => {
    try {
      await deleteDebtPaymentRequest(paymentId, token);
      notify('Payment deleted');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !debt) return <ErrorText message={error} />;
  if (!debt) return <Loading />;

  return (
    <section className="space-y-6">
      <Link className="text-sm text-primary-shade underline" to="/debts">
        Back to debts
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary-shade">{debt.personName}</h1>
          <p className="text-sm text-neutral-500">
            {debt.status} · due {formatDate(debt.dueDate)}
          </p>
          <p className="mt-2">
            Remaining {formatPeso(debt.remainingAmount)} of {formatPeso(debt.originalAmount)}
          </p>
        </div>
        <Link className="text-sm text-primary-shade underline" to={`/debts/${id}/edit`}>
          Edit debt
        </Link>
      </div>
      <ErrorText message={error} />
      <h2 className="text-lg text-primary">Payments</h2>
      {payments.length === 0 && <Empty label="No payments yet." />}
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-0">
        {payments.map((payment) => (
          <li key={payment._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              {formatPeso(payment.amount)} into {nameOf(payment.accountId)}
              <span className="ml-2 text-neutral-500">{formatDate(payment.paymentDate)}</span>
            </span>
            <span className="flex items-center gap-2">
              <Link className="text-primary-shade underline" to={`/debts/${id}/payments/${payment._id}/edit`}>
                Edit
              </Link>
              <Button variant="ghost" onClick={() => onDeletePayment(payment._id)}>
                Delete
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default DebtDetailPage;
