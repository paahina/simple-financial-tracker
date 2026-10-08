import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button, { EditLink } from '../../components/Button';
import PagedGrid from '../../components/PagedGrid';
import { ErrorText } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { deleteTransferRequest, getAccountsRequest, getTransfersRequest } from '../../services/api';
import { formatDateTime, formatPeso } from '../../utils/format';

const TransfersPage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getAccountsRequest(token)
      .then(setAccounts)
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

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary-shade">Transfers</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Moving money between your accounts, in from someone else, or out to someone else, is not income or an expense.
          </p>
        </div>
        <Link className="rounded-md bg-primary px-4 py-2 text-sm text-neutral-0 hover:bg-primary-shade" to="/transfers/new">
          New transfer
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
    </section>
  );
};

export default TransfersPage;
