import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import Button, { EditLink, editLinkClass } from '../../components/Button';
import StatusChip from '../../components/StatusChip';
import Tabs from '../../components/Tabs';
import Pager from '../../components/Pager';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { deleteDebtPaymentRequest, getAccountsRequest, getDebtRequest } from '../../services/api';
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
  const categoryNameOf = (categoryId) =>
    (debt.categories || []).find((line) => String(line.id || '') === String(categoryId || ''))?.label || '';
  const payerNameOf = (participantId) =>
    (debt.participants || []).find((item) => String(item.id) === String(participantId))?.name || '';

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
      await afterSave(async () => {
        await deleteDebtPaymentRequest(paymentId, token);
        setDebt(null);
        invalidateFamilies('debts', 'dashboard', 'accounts');
        notify('Payment deleted');
        if (payments.length === 1 && paymentPage > 0) {
          setPaymentPage((current) => current - 1);
          return;
        }
      });
      if (!(payments.length === 1 && paymentPage > 0)) await load();
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
          <p className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
              {debt.kind === 'CONTRIBUTION' ? 'Contribution' : 'Individual'}
            </span>
            <StatusChip status={debt.status} />
            <span>{debt.dueDate ? `due ${formatDate(debt.dueDate)}` : 'No due date'}</span>
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
          { id: 'additions', label: debt.kind === 'CONTRIBUTION' ? 'Payers' : 'Balances' },
          { id: 'payments', label: 'Payments' },
        ]}
        onChange={(id) => setSearchParams({ tab: id })}
      />
      {tab === 'additions' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg text-primary">{debt.kind === 'CONTRIBUTION' ? 'Payers' : 'Balances'}</h2>
            {debt.kind === 'INDIVIDUAL' && (debt.categories || []).length > 0 ? (
              <Link
                className="rounded-md bg-primary-tint px-4 py-2 text-sm text-neutral-0"
                to={`/debts/${id}/balances/add`}
                state={{ backgroundLocation: location }}
              >
                Add amount
              </Link>
            ) : null}
          </div>
          {debt.kind === 'CONTRIBUTION' ? (
            <>
              {!(debt.participants || []).length && <Empty label="No payers yet." />}
              {(debt.participants || []).length > 0 && (
                <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-0">
                  {(debt.participants || []).map((payer) => (
                    <li key={payer.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span>
                        {payer.name}
                        <span className="ml-2">
                          <StatusChip status={payer.status} />
                        </span>
                      </span>
                      <span>Remaining {formatPeso(payer.remainingAmount)} of {formatPeso(payer.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              {!(debt.categories || []).length && <Empty label="No balances yet." />}
              {(debt.categories || []).length > 0 && (
                <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-0">
                  {(debt.categories || []).map((line) => (
                    <li key={line.id || 'original'} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span>
                        {line.label}
                        <span className="ml-2">
                          <StatusChip status={line.status} />
                        </span>
                      </span>
                      <span>Remaining {formatPeso(line.remainingAmount)} of {formatPeso(line.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
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
                    {payerNameOf(payment.participantId) ? ` · ${payerNameOf(payment.participantId)}` : ''}
                    {categoryNameOf(payment.categoryId) ? ` · ${categoryNameOf(payment.categoryId)}` : ''}
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
