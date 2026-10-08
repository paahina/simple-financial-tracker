import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button, { EditLink } from '../../components/Button';
import PagedGrid from '../../components/PagedGrid';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { deleteTransactionRequest, getTransactionsRequest } from '../../services/api';
import { formatDateTime, formatPeso } from '../../utils/format';

const TransactionsPage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    return getTransactionsRequest(token, paginationModel.page + 1, paginationModel.pageSize)
      .then((transactions) => {
        setRows(transactions.data.map((item) => ({ ...item, id: item._id })));
        setTotal(transactions.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, paginationModel]);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = async (id) => {
    const accepted = await confirm({
      title: 'Delete transaction?',
      message: 'This removes the income or expense and updates the account balance.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      confirmIcon: Trash2,
    });
    if (!accepted) return;
    try {
      await deleteTransactionRequest(id, token);
      notify('Transaction deleted');
      if (rows.length === 1 && paginationModel.page > 0) {
        setPaginationModel((model) => ({ ...model, page: model.page - 1 }));
        return;
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primary-shade">Transactions</h1>
        <Link className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0 hover:bg-primary-shade" to="/transactions/new">
          New transaction
        </Link>
      </div>
      <ErrorText message={error} />
      <div className="rounded-lg border border-neutral-200 bg-neutral-0">
        <PagedGrid
          rows={rows}
          rowCount={total}
          loading={loading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          localeText={{ noRowsLabel: 'No income or expenses yet.' }}
          columns={[
            { field: 'label', headerName: 'Label', flex: 1, minWidth: 120, sortable: false, filterable: false },
            { field: 'type', headerName: 'Type', width: 110, sortable: false, filterable: false },
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
                  <EditLink to={`/transactions/${row.id}/edit`}>Edit</EditLink>
                  <Button variant="danger" icon={Trash2} onClick={() => onDelete(row.id)}>
                    Delete
                  </Button>
                </span>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
};

export default TransactionsPage;
