import { useQuery } from '@tanstack/react-query';
import { BarChart } from '@mui/x-charts/BarChart';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Field, { inputClass } from '../../components/Field';
import Tabs from '../../components/Tabs';
import PagedGrid from '../../components/PagedGrid';
import Pager from '../../components/Pager';
import { Loading } from '../../components/Skeleton';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { getMonthlyReportRequest, getYearlyReportRequest } from '../../services/api';
import { formatDate, formatPeso } from '../../utils/format';

const now = new Date();
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pesoFromChart = (value) => formatPeso(Math.round((Number(value) || 0) * 100));

const expenseColumns = [
  {
    field: 'transactionDate',
    headerName: 'Date',
    flex: 1,
    minWidth: 140,
    sortable: false,
    filterable: false,
    renderCell: ({ row }) => formatDate(row.transactionDate),
  },
  { field: 'categoryName', headerName: 'Category', flex: 1, minWidth: 140, sortable: false, filterable: false },
  { field: 'label', headerName: 'Label', flex: 1, minWidth: 140, sortable: false, filterable: false },
  {
    field: 'amount',
    headerName: 'Amount',
    width: 140,
    sortable: false,
    filterable: false,
    renderCell: ({ row }) => formatPeso(row.amount),
  },
];

const ReportsPage = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'expenses' ? 'expenses' : 'summary';
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [expenseModel, setExpenseModel] = useState({ page: 0, pageSize: 10 });
  const [incomePage, setIncomePage] = useState({ page: 0, pageSize: 10 });
  const [expenseCategoryPage, setExpenseCategoryPage] = useState({ page: 0, pageSize: 10 });
  const yearlyQuery = useQuery({
    queryKey: ['reports', 'year', { year }],
    queryFn: () => getYearlyReportRequest(token, year),
    enabled: Boolean(token),
  });
  const monthlyQuery = useQuery({
    queryKey: ['reports', 'month', { year, month, expenseModel, incomePage, expenseCategoryPage }],
    queryFn: () =>
      getMonthlyReportRequest(token, year, month, expenseModel.page + 1, expenseModel.pageSize, {
        incomePage: incomePage.page + 1,
        incomeLimit: incomePage.pageSize,
        expenseCategoryPage: expenseCategoryPage.page + 1,
        expenseCategoryLimit: expenseCategoryPage.pageSize,
      }),
    enabled: Boolean(token),
  });
  const yearly = yearlyQuery.data;
  const monthly = monthlyQuery.data;
  const error = yearlyQuery.error?.message || monthlyQuery.error?.message || '';
  const expenseLoading = monthlyQuery.isFetching;

  const onYearChange = (event) => {
    setYear(event.target.value);
    setExpenseModel((model) => ({ ...model, page: 0 }));
    setIncomePage((model) => ({ ...model, page: 0 }));
    setExpenseCategoryPage((model) => ({ ...model, page: 0 }));
  };

  const onMonthChange = (event) => {
    setMonth(event.target.value);
    setExpenseModel((model) => ({ ...model, page: 0 }));
    setIncomePage((model) => ({ ...model, page: 0 }));
    setExpenseCategoryPage((model) => ({ ...model, page: 0 }));
  };

  const expensesByMonth = yearly?.monthlyBreakdown.map((row) => row.expenses / 100) || [];

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary-shade">Reports</h1>
      <div className="flex gap-3">
        <Field label="Year">
          <input className={inputClass} type="number" value={year} onChange={onYearChange} />
        </Field>
        <Field label="Month">
          <input className={inputClass} type="number" min="1" max="12" value={month} onChange={onMonthChange} />
        </Field>
      </div>
      <Tabs
        value={tab}
        tabs={[
          { id: 'summary', label: 'Summary' },
          { id: 'expenses', label: 'Daily expenses' },
        ]}
        onChange={(id) => setSearchParams(id === 'expenses' ? { tab: 'expenses' } : {})}
      />
      <ErrorText message={error} />
      {tab === 'summary' && (
        <>
          {!monthly && !error && <Loading variant="reports" />}
          {monthly && (
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Income', monthly.income],
                ['Expenses', monthly.expenses],
                ['Net', monthly.net],
              ].map(([label, amount]) => (
                <article key={label} className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
                  <p className="text-sm text-neutral-500">{label}</p>
                  <p className="mt-2 text-xl text-primary-shade">{formatPeso(amount)}</p>
                </article>
              ))}
            </div>
          )}
          {monthly && (
            <div className="grid gap-4 lg:grid-cols-2">
              <CategoryList
                title="Income by category"
                rows={monthly.incomeByCategory}
                onPageChange={(page, pageSize) => setIncomePage({ page, pageSize })}
              />
              <CategoryList
                title="Expenses by category"
                rows={monthly.expensesByCategory}
                onPageChange={(page, pageSize) => setExpenseCategoryPage({ page, pageSize })}
              />
            </div>
          )}
          {yearly && (
            <article className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
              <h2 className="mb-3 text-primary">Expenses by month</h2>
              <BarChart
                height={320}
                xAxis={[{ data: monthLabels, scaleType: 'band' }]}
                yAxis={[{ valueFormatter: pesoFromChart }]}
                series={[
                  {
                    data: expensesByMonth,
                    label: 'Expenses',
                    color: '#3A3A3A',
                    valueFormatter: pesoFromChart,
                  },
                ]}
              />
            </article>
          )}
        </>
      )}
      {tab === 'expenses' && (
        <>
          {!monthly && !error && <Loading variant="reportExpenses" />}
          {monthly && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-0">
              <PagedGrid
                rows={monthly.dailyExpenses.data}
                columns={expenseColumns}
                rowCount={monthly.dailyExpenses.total}
                loading={expenseLoading}
                paginationModel={expenseModel}
                onPaginationModelChange={setExpenseModel}
                localeText={{ noRowsLabel: 'No expenses in this month.' }}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
};

const CategoryList = ({ title, rows, onPageChange }) => (
  <article className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
    <h2 className="mb-3 text-primary">{title}</h2>
    {rows.total === 0 ? (
      <p className="text-sm text-neutral-500">Nothing in this month.</p>
    ) : (
      <ul className="space-y-2 text-sm">
        {rows.data.map((row) => (
          <li key={row.categoryId} className="flex justify-between">
            <span>{row.categoryName}</span>
            <span>{formatPeso(row.total)}</span>
          </li>
        ))}
      </ul>
    )}
    <div className="mt-3">
      <Pager page={rows.page - 1} pageSize={rows.limit} total={rows.total} label="Categories" onPageChange={onPageChange} />
    </div>
  </article>
);

export default ReportsPage;
