import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import PayerFields from '../../components/PayerFields';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import SubBalanceFields, { emptySubBalanceRow } from '../../components/SubBalanceFields';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { createDebtRequest } from '../../services/api';
import { applySplit, debtKindOptions, emptyPayer, payerShareSum } from '../../utils/debts';
import { formatPeso, fromCentavos, toCentavos, toIsoDate } from '../../utils/format';
import { hasErrors, requiredAmount, requiredText } from '../../utils/validate';

const labeledBalances = (rows) =>
  rows
    .filter((row) => String(row.label || '').trim())
    .map((row) => ({ label: row.label.trim(), amount: toCentavos(row.amount || 0) }));

const emptyForm = {
  kind: 'INDIVIDUAL',
  personName: '',
  originalAmount: '',
  dueDate: '',
  description: '',
  payers: [emptyPayer(), emptyPayer()],
  balances: [emptySubBalanceRow({ label: 'Current', amount: fromCentavos(0) })],
};

const DebtCreatePage = () => {
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [baseline] = useState(JSON.stringify(emptyForm));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  useFormErrorToast(error);
  const balanceTotal = labeledBalances(form.balances).reduce((sum, item) => sum + item.amount, 0);

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

  const setKind = (kind) => {
    setForm((current) => {
      const total = toCentavos(current.originalAmount);
      const payers =
        kind === 'CONTRIBUTION' && Number.isInteger(total) && total > 0
          ? applySplit(total, current.payers.map((row) => ({ ...row, touched: false })))
          : current.payers;
      return { ...current, kind, payers };
    });
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
    const balances = labeledBalances(form.balances);
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
    setError('');
    try {
      await afterSave(async () => {
        await createDebtRequest(
          {
            personName: form.personName,
            kind: form.kind,
            ...(form.dueDate ? { dueDate: toIsoDate(form.dueDate) } : {}),
            description: form.description.trim(),
            ...(form.kind === 'CONTRIBUTION'
              ? {
                  originalAmount: total,
                  participants: form.payers.map((row) => ({
                    name: row.name.trim(),
                    amount: toCentavos(row.amount),
                  })),
                }
              : { subBalances: balances }),
          },
          token,
        );
        navigate('/debts');
        invalidateFamilies('debts', 'dashboard');
        notify('Debt saved');
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/debts">
      <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
        <h1 className="pr-8 text-2xl font-semibold text-primary-shade">New debt</h1>
        <Field label="Type">
          <Select value={form.kind} options={debtKindOptions} onChange={setKind} />
        </Field>
        <Field label={form.kind === 'CONTRIBUTION' ? 'Group name' : 'Name'} error={fieldErrors.personName}>
          <input
            className={inputClass}
            required
            minLength={2}
            value={form.personName}
            onChange={(event) => setForm({ ...form, personName: event.target.value })}
          />
        </Field>
        {form.kind === 'CONTRIBUTION' ? (
          <>
            <Field label="Amount (PHP)" error={fieldErrors.originalAmount}>
              <input
                className={inputClass}
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.originalAmount}
                onChange={(event) => setAmount(event.target.value)}
              />
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
        <Field label="Description">
          <input
            className={inputClass}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>
        <Field label="Due date">
          <input
            className={inputClass}
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
          />
        </Field>
        <Button type="submit">Save debt</Button>
      </form>
    </FormModal>
  );
};

export default DebtCreatePage;
