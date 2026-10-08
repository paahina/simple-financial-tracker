import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Button, { EditLink } from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import PagedGrid from '../../components/PagedGrid';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import {
  createTransferRequest,
  deleteTransferRequest,
  getAccountsRequest,
  getTransfersRequest,
} from '../../services/api';
import { datetimeLocalToIso, formatDateTime, formatPeso, nowDatetimeLocal, toCentavos } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice, requiredText } from '../../utils/validate';

const TransfersPage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [accounts, setAccounts] = useState([]);
  const [activeAccounts, setActiveAccounts] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    senderName: '',
    recipientName: '',
    amount: '',
    transactionDate: nowDatetimeLocal(),
  });

  useEffect(() => {
    getAccountsRequest(token)
      .then((accountList) => {
        setAccounts(accountList);
        setActiveAccounts(accountList.filter((account) => account.isActive));
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const load = useCallback(() => {
    setLoading(true);
    return getTransfersRequest(token, paginationModel.page + 1, paginationModel.pageSize)
      .then((transfers) => {
        setRows(transfers.data.map((item) => ({ ...item, id: item._id })));
        setTotal(transfers.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, paginationModel]);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (accountId) => accounts.find((account) => account._id === accountId)?.name || 'Account';

  const sourceOf = (item) => (item.senderName ? `other: ${item.senderName}` : nameOf(item.fromAccountId));

  const destinationOf = (item) =>
    item.recipientName ? `other: ${item.recipientName}` : nameOf(item.toAccountId);

  const transferBody = (values) => ({
    fromAccountId: values.fromAccountId === 'other' ? null : values.fromAccountId,
    senderName: values.fromAccountId === 'other' ? values.senderName.trim() : '',
    toAccountId: values.toAccountId === 'other' ? null : values.toAccountId,
    recipientName: values.toAccountId === 'other' ? values.recipientName.trim() : '',
    amount: toCentavos(values.amount),
    transactionDate: datetimeLocalToIso(values.transactionDate),
  });

  const onDelete = async (transferId) => {
    const accepted = await confirm({
      title: 'Delete transfer?',
      message: 'This removes the transfer and puts the money back where it came from.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    try {
      await deleteTransferRequest(transferId, token);
      notify('Transfer deleted');
      if (rows.length === 1 && paginationModel.page > 0) {
        setPaginationModel((model) => ({ ...model, page: model.page - 1 }));
        return;
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onCreate = async (event) => {
    event.preventDefault();
    const nextErrors = {
      fromAccountId: requiredChoice(form.fromAccountId, 'From'),
      toAccountId: requiredChoice(form.toAccountId, 'To'),
      senderName: form.fromAccountId === 'other' ? requiredText(form.senderName, 'Sender', 2) : '',
      recipientName: form.toAccountId === 'other' ? requiredText(form.recipientName, 'Recipient', 2) : '',
      amount: requiredAmount(form.amount),
      transactionDate: requiredChoice(form.transactionDate, 'Date'),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    if (form.fromAccountId === 'other' && form.toAccountId === 'other') {
      setError('One side must be one of your accounts');
      return;
    }
    setError('');
    try {
      await createTransferRequest(transferBody(form), token);
      notify('Transfer saved');
      setForm({ ...form, amount: '', transactionDate: nowDatetimeLocal() });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-primary-shade">Transfers</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Moving money between your accounts, in from someone else, or out to someone else, is not income or an expense.
        </p>
        <ErrorText message={error} />
        <div className="rounded-lg border border-neutral-200 bg-neutral-0">
          <PagedGrid
            rows={rows}
            rowCount={total}
            loading={loading}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            localeText={{ noRowsLabel: 'No transfers yet.' }}
            columns={[
              {
                field: 'movement',
                headerName: 'Transfer',
                flex: 1,
                minWidth: 180,
                sortable: false,
                filterable: false,
                renderCell: ({ row }) => `${sourceOf(row)} to ${destinationOf(row)}`,
              },
              {
                field: 'transactionDate',
                headerName: 'Date',
                flex: 1,
                minWidth: 170,
                sortable: false,
                filterable: false,
                renderCell: ({ row }) => formatDateTime(row.transactionDate),
              },
              {
                field: 'amount',
                headerName: 'Amount',
                width: 120,
                sortable: false,
                filterable: false,
                renderCell: ({ row }) => formatPeso(row.amount),
              },
              {
                field: 'actions',
                headerName: '',
                width: 210,
                sortable: false,
                filterable: false,
                renderCell: ({ row }) => (
                  <span className="flex items-center gap-2">
                    <EditLink to={`/transfers/${row.id}/edit`}>Edit</EditLink>
                    <Button variant="danger" icon={Trash2} onClick={() => onDelete(row.id)}>
                      Delete
                    </Button>
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>
      <form className="h-fit space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onCreate}>
        <h2 className="text-lg text-primary">Move money</h2>
        <Field label="From" error={fieldErrors.fromAccountId}>
          <select className={inputClass} required value={form.fromAccountId} onChange={(event) => setForm({ ...form, fromAccountId: event.target.value })}>
            <option value="">Select</option>
            {activeAccounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.name}
              </option>
            ))}
            <option value="other">From other</option>
          </select>
        </Field>
        {form.fromAccountId === 'other' && (
          <Field label="Sender" error={fieldErrors.senderName}>
            <input
              className={inputClass}
              required
              minLength={2}
              value={form.senderName}
              onChange={(event) => setForm({ ...form, senderName: event.target.value })}
            />
          </Field>
        )}
        <Field label="To" error={fieldErrors.toAccountId}>
          <select className={inputClass} required value={form.toAccountId} onChange={(event) => setForm({ ...form, toAccountId: event.target.value })}>
            <option value="">Select</option>
            {activeAccounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.name}
              </option>
            ))}
            <option value="other">To other</option>
          </select>
        </Field>
        {form.toAccountId === 'other' && (
          <Field label="Recipient" error={fieldErrors.recipientName}>
            <input
              className={inputClass}
              required
              minLength={2}
              value={form.recipientName}
              onChange={(event) => setForm({ ...form, recipientName: event.target.value })}
            />
          </Field>
        )}
        <Field label="Amount (PHP)" error={fieldErrors.amount}>
          <input className={inputClass} required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        </Field>
        <Field label="Date and time" error={fieldErrors.transactionDate}>
          <input className={inputClass} required type="datetime-local" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} />
        </Field>
        <Button onClick={onCreate}>Transfer</Button>
      </form>
    </section>
  );
};

export default TransfersPage;
