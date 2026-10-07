import { useEffect, useState } from 'react';
import { Empty, ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardRequest } from '../../services/api';
import { formatDate, formatPeso } from '../../utils/format';

const DashboardPage = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardRequest(token)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) return <ErrorText message={error} />;
  if (!data) return <Loading />;

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
            <p className="mt-2 text-xl font-semibold text-primary-shade">{formatPeso(amount)}</p>
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
                <p className="mt-2 text-primary-shade">{formatPeso(account.balance)}</p>
              </article>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="mb-3 text-lg text-primary">Recent transactions</h2>
        {data.recentTransactions.length === 0 ? (
          <Empty label="No transactions yet." />
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-neutral-0">
            {data.recentTransactions.map((item) => (
              <li key={item._id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  {item.label}
                  <span className="ml-2 text-neutral-500">{formatDate(item.transactionDate)}</span>
                </span>
                <span className={item.type === 'EXPENSE' ? 'text-primary-tint' : 'text-primary-shade'}>
                  {item.type === 'EXPENSE' ? '-' : '+'}
                  {formatPeso(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default DashboardPage;
