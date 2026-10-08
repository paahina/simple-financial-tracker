import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import Button, { EditLink, editLinkClass } from '../../components/Button';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { deleteDebtPaymentRequest, getAccountsRequest, getDebtRequest } from '../../services/api';
import { formatDate, formatDateTime, formatPeso } from '../../utils/format';

const DebtDetailPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
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
    const accepted = await confirm({
      title: 'Delete payment?',
      message: 'This removes the payment and updates what is still owed.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    try {
      await deleteDebtPaymentRequest(paymentId, token);
      notify('Payment deleted');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !debt) return <ErrorText message={error} />;
  if (!debt) return <Loading variant="detail" />;

  return (
    <section className="space-y-6">
      <Link className={`text-sm ${editLinkClass}`} to="/debts">
        Back to debts
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary-shade">{debt.personName}</h1>
          <p className="text-sm text-neutral-500">
            {debt.status} · {debt.dueDate ? `due ${formatDate(debt.dueDate)}` : 'No due date'}
          </p>
          <p className="mt-2">
            Remaining {formatPeso(debt.remainingAmount)} of {formatPeso(debt.originalAmount)}
          </p>
        </div>
        <EditLink className="text-sm" to={`/debts/${id}/edit`}>
          Edit debt
        </EditLink>
      </div>
      <ErrorText message={error} />
      <h2 className="text-lg text-primary">Payments</h2>
      {payments.length === 0 && <Empty label="No payments yet." />}
      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-0">
        {payments.map((payment) => (
          <li key={payment._id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              {formatPeso(payment.amount)} into {nameOf(payment.accountId)}
              <span className="ml-2 text-neutral-500">{formatDateTime(payment.paymentDate)}</span>
            </span>
            <span className="flex items-center gap-2">
              <EditLink to={`/debts/${id}/payments/${payment._id}/edit`}>Edit</EditLink>
              <Button variant="danger" icon={Trash2} onClick={() => onDeletePayment(payment._id)}>
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
