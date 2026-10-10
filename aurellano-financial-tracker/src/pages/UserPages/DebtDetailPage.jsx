import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import Button, { EditLink, editLinkClass } from '../../components/Button';
import Tabs from '../../components/Tabs';
import Pager from '../../components/Pager';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { invalidateFamilies } from '../../query/cache';
import { deleteDebtAdditionRequest, deleteDebtPaymentRequest, getAccountsRequest, getDebtRequest } from '../../services/api';
import { formatDate, formatDateTime, formatPeso } from '../../utils/format';

const DebtDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'payments' ? 'payments' : 'additions';
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [debt, setDebt] = useState(null);
  const [additions, setAdditions] = useState([]);
  const [additionTotal, setAdditionTotal] = useState(0);
  const [additionPage, setAdditionPage] = useState(0);
  const [additionPageSize, setAdditionPageSize] = useState(10);
  const [payments, setPayments] = useState([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentPage, setPaymentPage] = useState(0);
  const [paymentPageSize, setPaymentPageSize] = useState(10);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(
    () =>
      Promise.all([
        getDebtRequest(id, token, {
          additionsPage: additionPage + 1,
          additionsLimit: additionPageSize,
          paymentsPage: paymentPage + 1,
          paymentsLimit: paymentPageSize,
        }),
        getAccountsRequest(token),
      ])
        .then(([detail, accountList]) => {
          setDebt(detail.debt);
          setAdditions(detail.additions.data);
          setAdditionTotal(detail.additions.total);
          setPayments(detail.payments.data);
          setPaymentTotal(detail.payments.total);
          setAccounts(accountList);
        })
        .catch((err) => setError(err.message)),
    [id, token, additionPage, additionPageSize, paymentPage, paymentPageSize],
  );

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (accountId) => accounts.find((account) => account._id === accountId)?.name || 'Account';

  const onDeleteAddition = async (additionId) => {
    const accepted = await confirm({
      title: 'Delete added amount?',
      message: 'This removes the added amount and updates what is still owed.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    try {
      await deleteDebtAdditionRequest(additionId, token);
      await invalidateFamilies('debts', 'dashboard');
      notify('Added amount deleted');
      if (additions.length === 1 && additionPage > 0) {
        setAdditionPage((current) => current - 1);
        return;
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

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
      await invalidateFamilies('debts', 'dashboard', 'accounts');
      notify('Payment deleted');
      if (payments.length === 1 && paymentPage > 0) {
        setPaymentPage((current) => current - 1);
        return;
      }
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
          {debt.description?.trim() ? <p className="mt-2 font-semibold text-primary">{debt.description}</p> : null}
          <p className="mt-2">
            Remaining {formatPeso(debt.remainingAmount)} of {formatPeso(debt.totalAmount)}
          </p>
        </div>
        <EditLink className="text-sm" to={`/debts/${id}/edit`}>
          Edit debt
        </EditLink>
      </div>
      <ErrorText message={error} />
      <Tabs
        value={tab}
        tabs={[
          { id: 'additions', label: 'Added amounts' },
          { id: 'payments', label: 'Payments' },
        ]}
        onChange={(id) => setSearchParams({ tab: id })}
      />
      {tab === 'additions' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg text-primary">Added amounts</h2>
            <Link className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0" to={`/debts/${id}/additions/new`} state={{ backgroundLocation: location }}>
              Add amount
            </Link>
          </div>
          {!additions.length && <Empty label="No added amounts yet." />}
          {additions.length > 0 && (
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-0">
              {additions.map((line) => (
                <li key={line._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    {line.label}
                    <span className="ml-2 text-neutral-500">{formatDateTime(line.createdAt)}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    {formatPeso(line.amount)}
                    <EditLink to={`/debts/${id}/additions/${line._id}/edit`}>Edit</EditLink>
                    <Button variant="danger" icon={Trash2} onClick={() => onDeleteAddition(line._id)}>
                      Delete
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Pager
            page={additionPage}
            pageSize={additionPageSize}
            total={additionTotal}
            label="Added amounts"
            onPageChange={(nextPage, nextSize) => {
              setAdditionPage(nextPage);
              setAdditionPageSize(nextSize);
            }}
          />
        </div>
      )}
      {tab === 'payments' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg text-primary">Payments</h2>
            <Link className="rounded-md bg-primary-tint px-4 py-2 text-sm text-neutral-0" to={`/debts/${id}/payments/new`} state={{ backgroundLocation: location }}>
              Record payment
            </Link>
          </div>
          {payments.length === 0 && <Empty label="No payments yet." />}
          {payments.length > 0 && (
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-0">
              {payments.map((payment) => (
                <li key={payment._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    {formatPeso(payment.amount)} into {nameOf(payment.accountId)}
                    <span className="ml-2 text-neutral-500">{formatDateTime(payment.paymentDate)}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <EditLink to={`/debts/${id}/payments/${payment._id}/edit`}>Edit</EditLink>
                    <Button variant="danger" icon={Trash2} onClick={() => onDeletePayment(payment._id)}>
                      Delete
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Pager
            page={paymentPage}
            pageSize={paymentPageSize}
            total={paymentTotal}
            label="Payments"
            onPageChange={(nextPage, nextSize) => {
              setPaymentPage(nextPage);
              setPaymentPageSize(nextSize);
            }}
          />
        </div>
      )}
    </section>
  );
};

export default DebtDetailPage;
