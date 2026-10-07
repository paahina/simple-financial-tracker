import { useEffect, useState } from 'react';
import Field, { inputClass } from '../../components/Field';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { getMonthlyReportRequest, getYearlyReportRequest } from '../../services/api';
import { formatPeso } from '../../utils/format';

const now = new Date();

const ReportsPage = () => {
  const { token } = useAuth();
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [monthly, setMonthly] = useState(null);
  const [yearly, setYearly] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      getMonthlyReportRequest(token, year, month),
      getYearlyReportRequest(token, year),
    ])
      .then(([monthReport, yearReport]) => {
        if (!active) return;
        setError('');
        setMonthly(monthReport);
        setYearly(yearReport);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [token, year, month]);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary-shade">Reports</h1>
      <div className="flex gap-3">
        <Field label="Year">
          <input className={inputClass} type="number" value={year} onChange={(event) => setYear(event.target.value)} />
        </Field>
        <Field label="Month">
          <input className={inputClass} type="number" min="1" max="12" value={month} onChange={(event) => setMonth(event.target.value)} />
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
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary text-neutral-0">
              <tr>
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Income</th>
                <th className="px-3 py-2">Expenses</th>
                <th className="px-3 py-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {yearly.monthlyBreakdown.map((row) => (
                <tr key={row.month} className="border-t border-neutral-200">
                  <td className="px-3 py-2">{row.month}</td>
                  <td className="px-3 py-2">{formatPeso(row.income)}</td>
                  <td className="px-3 py-2">{formatPeso(row.expenses)}</td>
                  <td className="px-3 py-2">{formatPeso(row.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
