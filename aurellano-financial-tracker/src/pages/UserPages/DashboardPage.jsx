import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AccountTypeChip from '../../components/AccountTypeChip';
import Money from '../../components/Money';
import Tabs from '../../components/Tabs';
import PagedGrid from '../../components/PagedGrid';
import Pager from '../../components/Pager';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'transactions' ? 'transactions' : 'summary';
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [accountPage, setAccountPage] = useState(0);
  const [accountPageSize, setAccountPageSize] = useState(10);
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', { accountPage, accountPageSize }],
    queryFn: () => getDashboardRequest(token, accountPage + 1, accountPageSize),
    enabled: Boolean(token),
  });
  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'recent', paginationModel],
    queryFn: () => getTransactionsRequest(token, paginationModel.page + 1, paginationModel.pageSize),
    enabled: Boolean(token),
  });
  const data = dashboardQuery.data;
  const error = dashboardQuery.error?.message || '';
  const transactions = transactionsQuery.data?.data.map((item) => ({ ...item, id: item._id })) ?? [];
  const transactionTotal = transactionsQuery.data?.total ?? 0;
  const transactionError = transactionsQuery.error?.message || '';
  const gridLoading = transactionsQuery.isFetching;

  if (error && !data) return <ErrorText message={error} />;
  if (!data) return <Loading variant={tab === 'transactions' ? 'dashboardTransactions' : 'dashboard'} />;

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
      <Tabs
        value={tab}
        tabs={[
          { id: 'summary', label: 'Summary' },
          { id: 'transactions', label: 'Recent transactions' },
        ]}
        onChange={(id) => setSearchParams(id === 'transactions' ? { tab: 'transactions' } : {})}
      />
      {tab === 'summary' && (
        <>
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
            {data.accountBalances.total === 0 ? (
              <Empty label="No active accounts yet. Add one from Accounts." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.accountBalances.data.map((account) => (
                  <article key={account.id} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
                    <p className="font-medium">{account.name}</p>
                    <span className="mt-1 block">
                      <AccountTypeChip type={account.type} />
                    </span>
                    <Money className="mt-2 block text-primary-shade" centavos={account.balance} />
                  </article>
                ))}
              </div>
            )}
            <div className="mt-3">
              <Pager
                page={accountPage}
                pageSize={accountPageSize}
                total={data.accountBalances.total}
                label="Accounts"
                onPageChange={(nextPage, nextSize) => {
                  setAccountPage(nextPage);
                  setAccountPageSize(nextSize);
                }}
              />
            </div>
          </div>
        </>
      )}
      {tab === 'transactions' && (
        <div>
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
      )}
    </section>
  );
};

export default DashboardPage;
