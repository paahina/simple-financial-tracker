import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import FormModal from '../../components/FormModal';
import Select from '../../components/Select';
import { Empty, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { addToDebtBalanceRequest, getDebtRequest } from '../../services/api';
import { categoryIdForDebt, categoryOptionValue, categoryOptions, payloadCategoryId } from '../../utils/debts';
import { formatPeso, toCentavos } from '../../utils/format';
import { hasErrors, requiredAmount, requiredChoice } from '../../utils/validate';

const DebtBalanceAddPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ categoryId: '', amount: '' });
  const [baseline] = useState(() => JSON.stringify(form));
  const [actionError, setActionError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const closeTo = `/debts/${id}?tab=additions`;

  const debtQuery = useQuery({
    queryKey: ['debts', id],
    queryFn: () => getDebtRequest(id, token),
    enabled: Boolean(token),
  });
  const debt = debtQuery.data?.debt;
  const slices = debt?.categories ?? [];
  const error = actionError || debtQuery.error?.message || '';
  useFormErrorToast(error);

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      categoryId: categoryOptions(slices).length > 1 ? requiredChoice(form.categoryId, 'Balance') : '',
      amount: requiredAmount(form.amount),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setActionError('');
    try {
      await afterSave(async () => {
        await addToDebtBalanceRequest(
          {
            debtId: id,
            categoryId: payloadCategoryId(form.categoryId || categoryIdForDebt(slices)),
            amount: toCentavos(form.amount),
          },
          token,
        );
        navigate(closeTo);
        invalidateFamilies('debts', 'dashboard');
        notify('Amount added');
      });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const dirty = JSON.stringify(form) !== baseline;
  const selectedId = form.categoryId || categoryIdForDebt(slices);
  const selected = slices.find((line) => categoryOptionValue(line.id) === String(selectedId));

  return (
    <FormModal dirty={dirty} closeTo={closeTo}>
      {error && !debt && <Empty label="Couldn't load this form." />}
      {!debt && !error && <Loading variant="form" />}
      {debt && (
        <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
          <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Add to a balance</h1>
          {selected ? (
            <p className="text-sm text-neutral-500">
              {selected.label} · remaining {formatPeso(selected.remainingAmount)} of {formatPeso(selected.amount)}
            </p>
          ) : null}
          {categoryOptions(slices).length > 1 ? (
            <Field label="Balance" error={fieldErrors.categoryId}>
              <Select
                value={form.categoryId || categoryIdForDebt(slices)}
                options={categoryOptions(slices)}
                onChange={(categoryId) => setForm({ ...form, categoryId })}
              />
            </Field>
          ) : null}
          <Field label="Amount to add (PHP)" error={fieldErrors.amount}>
            <input
              className={inputClass}
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
          </Field>
          <Button type="submit">Add amount</Button>
        </form>
      )}
    </FormModal>
  );
};

export default DebtBalanceAddPage;
