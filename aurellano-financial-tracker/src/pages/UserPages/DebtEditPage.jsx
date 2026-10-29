import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import PayerFields from '../../components/PayerFields';
import FormModal from '../../components/FormModal';
import SubBalanceFields, { emptySubBalanceRow } from '../../components/SubBalanceFields';
import { Empty, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { getDebtRequest, updateDebtRequest } from '../../services/api';
import { applySplit, emptyPayer, payerShareSum } from '../../utils/debts';
import { dateInput, formatPeso, fromCentavos, toCentavos, toIsoDate } from '../../utils/format';
import { useConfirmSave } from '../../hooks/useConfirmSave';
import { hasErrors, requiredAmount, requiredText } from '../../utils/validate';

const labeledBalances = (rows) =>
  rows
    .filter((row) => String(row.label || '').trim())
    .map((row) => ({
      ...(row._id ? { _id: row._id } : {}),
      label: row.label.trim(),
      amount: toCentavos(row.amount || 0),
    }));

const DebtEditPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const { notify } = useToast();
  const confirmSave = useConfirmSave();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  useFormErrorToast(error);
  const balanceTotal = form ? labeledBalances(form.balances || []).reduce((sum, item) => sum + item.amount, 0) : 0;

  useEffect(() => {
    let active = true;
    getDebtRequest(id, token)
      .then(({ debt }) => {
        if (!active) return;
        const slices = (debt.categories || []).filter((line) => line.id);
        const nextForm = {
          kind: debt.kind || 'INDIVIDUAL',
          personName: debt.personName,
          originalAmount: fromCentavos(debt.originalAmount || debt.totalAmount),
          dueDate: debt.dueDate ? dateInput(debt.dueDate) : '',
          description: debt.description || '',
          payers: (debt.participants || []).map((item) =>
            emptyPayer({
              _id: item.id || item._id,
              name: item.name,
              amount: fromCentavos(item.amount),
              touched: false,
            }),
          ),
          balances: slices.length
            ? slices.map((item) =>
                emptySubBalanceRow({
                  _id: item.id,
                  label: item.label,
                  amount: fromCentavos(item.amount),
                }),
              )
            : [
                emptySubBalanceRow({
                  label: 'Current',
                  amount: fromCentavos(debt.originalAmount || debt.totalAmount),
                }),
              ],
        };
        if (nextForm.kind === 'CONTRIBUTION' && nextForm.payers.length < 2) {
          nextForm.payers = applySplit(toCentavos(nextForm.originalAmount), [emptyPayer(), emptyPayer()]);
        }
        setForm(nextForm);
        setBaseline(JSON.stringify(nextForm));
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [id, token]);

  const setAmount = (originalAmount) => {
    const total = toCentavos(originalAmount);
    setForm((current) => ({
      ...current,
      originalAmount,
      payers:
        current.kind === 'CONTRIBUTION' && Number.isInteger(total) && total > 0
          ? applySplit(total, current.payers)
          : current.payers,
    }));
  };

  const setPayers = (nextPayers) => {
    const total = toCentavos(form.originalAmount);
    setForm({
      ...form,
      payers: Number.isInteger(total) && total > 0 ? applySplit(total, nextPayers) : nextPayers,
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const total = form.kind === 'CONTRIBUTION' ? toCentavos(form.originalAmount) : balanceTotal;
    const balances = labeledBalances(form.balances || []);
    const payerErrors = form.kind === 'CONTRIBUTION'
      ? form.payers.some((row) => requiredText(row.name, 'Payer') || requiredAmount(row.amount))
      : false;
    const nextErrors = {
      personName: requiredText(form.personName, 'Name', 2),
      originalAmount: form.kind === 'CONTRIBUTION' ? requiredAmount(form.originalAmount) : '',
      balances:
        form.kind === 'INDIVIDUAL' && (!balances.length || balanceTotal < 1)
          ? 'Add at least one labeled balance'
          : form.kind === 'INDIVIDUAL' && form.balances.some((row) => row.amount && !String(row.label || '').trim())
            ? 'Each balance needs a label'
            : '',
      payers:
        form.kind === 'CONTRIBUTION' && payerErrors
          ? 'Each payer needs a name and share'
          : form.kind === 'CONTRIBUTION' && payerShareSum(form.payers) !== total
            ? 'Payer shares must add up to the amount'
            : '',
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    const accepted = await confirmSave({
      title: 'Save debt?',
      message: 'This updates the debt record and balances owed.',
    });
    if (!accepted) return;
    setError('');
    const payload = {
      personName: form.personName,
      dueDate: form.dueDate ? toIsoDate(form.dueDate) : null,
      description: form.description,
      ...(form.kind === 'CONTRIBUTION'
        ? {
            originalAmount: total,
            participants: form.payers.map((row) => ({
              ...(row._id ? { _id: row._id } : {}),
              name: row.name.trim(),
              amount: toCentavos(row.amount),
            })),
          }
        : { subBalances: balances }),
    };
    try {
      await afterSave(async () => {
        await updateDebtRequest(id, payload, token);
        navigate(`/debts/${id}`);
        invalidateFamilies('debts', 'dashboard');
        notify('Debt updated');
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/debts">
      {error && !form && <Empty label="Couldn't load this form." />}
      {!form && !error && <Loading variant="form" />}
      {form && (
    <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <h1 className="pr-8 text-2xl font-semibold text-primary-shade">Edit debt</h1>
      <Field label={form.kind === 'CONTRIBUTION' ? 'Group name' : 'Name'} error={fieldErrors.personName}>
        <input className={inputClass} required minLength={2} value={form.personName} onChange={(event) => setForm({ ...form, personName: event.target.value })} />
      </Field>
      {form.kind === 'CONTRIBUTION' ? (
        <>
          <Field label="Amount (PHP)" error={fieldErrors.originalAmount}>
            <input className={inputClass} required type="number" min="0.01" step="0.01" value={form.originalAmount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <PayerFields rows={form.payers} error={fieldErrors.payers} onChange={setPayers} />
        </>
      ) : (
        <>
          <SubBalanceFields
            rows={form.balances}
            error={fieldErrors.balances}
            heading="Balances"
            itemName="balance"
            owner="the debt"
            addLabel="Add balance"
            onChange={(balances) => setForm({ ...form, balances })}
          />
          <p className="text-sm text-neutral-500">Total {formatPeso(balanceTotal)}</p>
        </>
      )}
      <Field label="Due date">
        <input className={inputClass} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
      </Field>
      <Field label="Description">
        <input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </Field>
      <Button type="submit">Save changes</Button>
    </form>
      )}
    </FormModal>
  );
};

export default DebtEditPage;
