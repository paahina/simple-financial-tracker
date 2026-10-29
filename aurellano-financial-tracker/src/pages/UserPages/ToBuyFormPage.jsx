import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import FormModal from '../../components/FormModal';
import { Empty, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { createToBuyRequest, getToBuyItemRequest, updateToBuyRequest } from '../../services/api';
import { formatPeso, fromCentavos, toCentavos } from '../../utils/format';
import { useConfirmSave } from '../../hooks/useConfirmSave';
import { hasErrors, optionalAmount, requiredText } from '../../utils/validate';

const emptyForm = { name: '', quantity: '1', unitPrice: '', notes: '' };

const requiredQuantity = (value) => {
  if (value === '' || value == null) return 'Quantity is required';
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1) return 'Quantity must be a whole number of at least 1';
  return '';
};

const ToBuyFormPage = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const { token } = useAuth();
  const { notify } = useToast();
  const confirmSave = useConfirmSave();
  const navigate = useNavigate();
  const [form, setForm] = useState(editing ? null : emptyForm);
  const [baseline, setBaseline] = useState(editing ? '' : JSON.stringify(emptyForm));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  useFormErrorToast(error);

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    getToBuyItemRequest(id, token)
      .then((item) => {
        if (!active) return;
        const nextForm = {
          name: item.name,
          quantity: String(item.quantity),
          unitPrice: fromCentavos(item.unitPrice),
          notes: item.notes || '',
        };
        setForm(nextForm);
        setBaseline(JSON.stringify(nextForm));
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [editing, id, token]);

  const lineEstimate =
    form && Number.isInteger(Number(form.quantity)) && form.quantity !== '' && form.unitPrice !== ''
      ? Number(form.quantity) * toCentavos(form.unitPrice || 0)
      : 0;

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      name: requiredText(form.name, 'Item name'),
      quantity: requiredQuantity(form.quantity),
      unitPrice: form.unitPrice === '' || form.unitPrice == null ? 'Estimated unit price is required' : optionalAmount(form.unitPrice, 'Estimated unit price'),
    };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    const accepted = await confirmSave({
      title: editing ? 'Save item?' : 'Add item?',
      message: editing ? 'This updates the to-buy list item.' : 'This adds the item to your to-buy list.',
      confirmLabel: editing ? 'Save changes' : 'Add item',
    });
    if (!accepted) return;
    setError('');
    const payload = {
      name: form.name.trim(),
      quantity: Number(form.quantity),
      unitPrice: toCentavos(form.unitPrice),
      notes: form.notes.trim(),
    };
    try {
      await afterSave(async () => {
        if (editing) {
          await updateToBuyRequest(id, payload, token);
          notify('Item updated');
        } else {
          await createToBuyRequest(payload, token);
          notify('Item added');
        }
        navigate('/to-buy');
        invalidateFamilies('to-buy');
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/to-buy">
      {error && !form && <Empty label="Couldn't load this form." />}
      {!form && !error && <Loading variant="form" />}
      {form && (
        <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
          <h1 className="pr-8 text-2xl font-semibold text-primary-shade">{editing ? 'Edit item' : 'Add item'}</h1>
          <Field label="Item name" error={fieldErrors.name}>
            <input
              className={inputClass}
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Quantity" error={fieldErrors.quantity}>
            <input
              className={inputClass}
              required
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            />
          </Field>
          <Field label="Estimated unit price (PHP)" error={fieldErrors.unitPrice}>
            <input
              className={inputClass}
              required
              type="number"
              min="0"
              step="0.01"
              value={form.unitPrice}
              onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
            />
          </Field>
          <p className="text-sm text-neutral-500">Line estimate {formatPeso(lineEstimate)}</p>
          <Field label="Notes">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={500}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </Field>
          <Button type="submit">{editing ? 'Save changes' : 'Add item'}</Button>
        </form>
      )}
    </FormModal>
  );
};

export default ToBuyFormPage;
