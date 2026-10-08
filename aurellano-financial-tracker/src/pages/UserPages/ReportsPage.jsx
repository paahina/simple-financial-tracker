import { BarChart } from '@mui/x-charts/BarChart';
import { useEffect, useState } from 'react';
import Field, { inputClass } from '../../components/Field';
import PagedGrid from '../../components/PagedGrid';
import { ErrorText, Loading } from '../../components/StatusMessage';
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
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [monthly, setMonthly] = useState(null);
  const [yearly, setYearly] = useState(null);
  const [error, setError] = useState('');
  const [expenseLoading, setExpenseLoading] = useState(true);
  const [expenseModel, setExpenseModel] = useState({ page: 0, pageSize: 10 });

  useEffect(() => {
    let active = true;
    getYearlyReportRequest(token, year)
      .then((yearReport) => {
        if (active) setYearly(yearReport);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [token, year]);

  useEffect(() => {
    let active = true;
    setExpenseLoading(true);
    getMonthlyReportRequest(token, year, month, expenseModel.page + 1, expenseModel.pageSize)
      .then((monthReport) => {
        if (!active) return;
        setError('');
        setMonthly(monthReport);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setExpenseLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, year, month, expenseModel]);

  const onYearChange = (event) => {
    setYear(event.target.value);
    setExpenseModel((model) => ({ ...model, page: 0 }));
  };

  const onMonthChange = (event) => {
    setMonth(event.target.value);
    setExpenseModel((model) => ({ ...model, page: 0 }));
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
      <ErrorText message={error} />
      {!monthly && !error && <Loading />}
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
          <CategoryList title="Income by category" rows={monthly.incomeByCategory} />
          <CategoryList title="Expenses by category" rows={monthly.expensesByCategory} />
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
      {monthly && (
        <div>
          <h2 className="mb-3 text-primary">Daily expenses</h2>
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
        </div>
      )}
    </section>
  );
};

const CategoryList = ({ title, rows }) => (
  <article className="rounded-lg border border-neutral-200 bg-neutral-0 p-4">
    <h2 className="mb-3 text-primary">{title}</h2>
    {rows.length === 0 ? (
      <p className="text-sm text-neutral-500">Nothing in this month.</p>
    ) : (
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.categoryId} className="flex justify-between">
            <span>{row.categoryName}</span>
            <span>{formatPeso(row.total)}</span>
          </li>
        ))}
      </ul>
    )}
  </article>
);

export default ReportsPage;
