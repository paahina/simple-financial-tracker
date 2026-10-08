import { useEffect, useState } from 'react';
import Money from '../../components/Money';
import PagedGrid from '../../components/PagedGrid';
import { Loading } from '../../components/Skeleton';
import { Empty, ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardRequest, getTransactionsRequest } from '../../services/api';
import { formatDateTime, formatPeso } from '../../utils/format';

const transactionColumns = [
  { field: 'label', headerName: 'Label', flex: 1, minWidth: 140, sortable: false, filterable: false },
  {
    field: 'transactionDate',
    headerName: 'Date',
    flex: 1,
    minWidth: 180,
    sortable: false,
    filterable: false,
    renderCell: ({ row }) => formatDateTime(row.transactionDate),
  },
  { field: 'type', headerName: 'Type', width: 120, sortable: false, filterable: false },
  {
    field: 'amount',
    headerName: 'Amount',
    width: 140,
    sortable: false,
    filterable: false,
    renderCell: ({ row }) => `${row.type === 'EXPENSE' ? '-' : '+'}${formatPeso(row.amount)}`,
  },
];

const DashboardPage = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionError, setTransactionError] = useState('');
  const [gridLoading, setGridLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  useEffect(() => {
    getDashboardRequest(token)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    let active = true;
    setGridLoading(true);
    getTransactionsRequest(token, paginationModel.page + 1, paginationModel.pageSize)
      .then((result) => {
        if (!active) return;
        setTransactionError('');
        setTransactions(result.data.map((item) => ({ ...item, id: item._id })));
        setTransactionTotal(result.total);
      })
      .catch((err) => {
        if (active) setTransactionError(err.message);
      })
      .finally(() => {
        if (active) setGridLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, paginationModel]);

  if (error && !data) return <ErrorText message={error} />;
  if (!data) return <Loading variant="dashboard" />;

  const cards = [
    ['Cash on hand', data.totalMoney],
    ['Income this month', data.monthlyIncome],
    ['Expenses this month', data.monthlyExpenses],
    ['Net this month', data.monthlyNet],
    ['People owe you', data.outstandingReceivables],
  ];

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary-shade">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, amount]) => (
          <article key={label} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
            <p className="text-sm text-neutral-500">{label}</p>
            <Money className="mt-2 block text-xl font-semibold text-primary-shade" centavos={amount} />
          </article>
        ))}
      </div>
      <div>
        <h2 className="mb-3 text-lg text-primary">Accounts</h2>
        {data.accountBalances.length === 0 ? (
          <Empty label="No active accounts yet. Add one from Accounts." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.accountBalances.map((account) => (
              <article key={account.id} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
                <p className="font-medium">{account.name}</p>
                <p className="text-sm text-neutral-500">{account.type}</p>
                <Money className="mt-2 block text-primary-shade" centavos={account.balance} />
              </article>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="mb-3 text-lg text-primary">Recent transactions</h2>
        <ErrorText message={transactionError} />
        <div className="rounded-lg border border-neutral-200 bg-neutral-0">
          <PagedGrid
            rows={transactions}
            columns={transactionColumns}
            rowCount={transactionTotal}
            loading={gridLoading}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            localeText={{ noRowsLabel: 'No transactions yet.' }}
          />
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;
