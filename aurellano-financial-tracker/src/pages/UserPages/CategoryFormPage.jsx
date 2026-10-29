import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import Select from '../../components/Select';
import FormModal from '../../components/FormModal';
import { Empty, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useFormErrorToast } from '../../hooks/useFormErrorToast';
import { useToast } from '../../hooks/useToast';
import { afterSave, invalidateFamilies } from '../../query/cache';
import { createCategoryRequest, getCategoryRequest, updateCategoryRequest } from '../../services/api';
import { useConfirmSave } from '../../hooks/useConfirmSave';
import { hasErrors, requiredText } from '../../utils/validate';

const CategoryFormPage = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const { token } = useAuth();
  const { notify } = useToast();
  const confirmSave = useConfirmSave();
  const navigate = useNavigate();
  const emptyForm = { name: '', type: 'EXPENSE', isActive: true };
  const [form, setForm] = useState(editing ? null : emptyForm);
  const [baseline, setBaseline] = useState(editing ? '' : JSON.stringify(emptyForm));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  useFormErrorToast(error);

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    getCategoryRequest(id, token)
      .then((category) => {
        if (!active) return;
        const nextForm = { name: category.name, type: category.type, isActive: category.isActive };
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

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = { name: requiredText(form.name, 'Name', 2) };
    setFieldErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    const accepted = await confirmSave({
      title: editing ? 'Save category?' : 'Create category?',
      message: editing ? 'This updates the category.' : 'This adds a new category for transactions.',
      confirmLabel: editing ? 'Save changes' : 'Create category',
    });
    if (!accepted) return;
    setError('');
    try {
      await afterSave(async () => {
        if (editing) {
          await updateCategoryRequest(id, { name: form.name, isActive: form.isActive }, token);
          notify('Category updated');
        } else {
          await createCategoryRequest({ name: form.name, type: form.type }, token);
          notify('Category created');
        }
        navigate('/categories');
        invalidateFamilies('categories');
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;

  return (
    <FormModal dirty={dirty} closeTo="/categories">
      {error && !form && <Empty label="Couldn't load this form." />}
      {!form && !error && <Loading variant="form" />}
      {form && (
    <form className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <h1 className="pr-8 text-2xl font-semibold text-primary-shade">{editing ? 'Edit category' : 'New category'}</h1>
      <Field label="Name" error={fieldErrors.name}>
        <input className={inputClass} required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </Field>
      <Field label="Type">
        <Select
          value={form.type}
          disabled={editing}
          options={[
            { value: 'EXPENSE', label: 'Expense' },
            { value: 'INCOME', label: 'Income' },
          ]}
          onChange={(type) => setForm({ ...form, type })}
        />
      </Field>
      {editing && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
          Active
        </label>
      )}
      <Button type="submit">{editing ? 'Save changes' : 'Create category'}</Button>
    </form>
      )}
    </FormModal>
  );
};

export default CategoryFormPage;
