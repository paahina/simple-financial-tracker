import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field, { inputClass } from '../../components/Field';
import { ErrorText, Loading } from '../../components/StatusMessage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { createCategoryRequest, getCategoryRequest, updateCategoryRequest } from '../../services/api';

const CategoryFormPage = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const { token } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(editing ? null : { name: '', type: 'EXPENSE', isActive: true });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    getCategoryRequest(id, token)
      .then((category) => {
        if (!active) return;
        setForm({ name: category.name, type: category.type, isActive: category.isActive });
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
    setError('');
    try {
      if (editing) {
        await updateCategoryRequest(id, { name: form.name, isActive: form.isActive }, token);
        notify('Category updated');
      } else {
        await createCategoryRequest({ name: form.name, type: form.type }, token);
        notify('Category created');
      }
      navigate('/categories');
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !form) return <ErrorText message={error} />;
  if (!form) return <Loading />;

  return (
    <form className="mx-auto max-w-lg space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4" onSubmit={onSubmit}>
      <Link className="text-sm text-primary-shade underline" to="/categories">
        Back to categories
      </Link>
      <h1 className="text-2xl font-semibold text-primary-shade">{editing ? 'Edit category' : 'New category'}</h1>
      <ErrorText message={error} />
      <Field label="Name">
        <input className={inputClass} required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </Field>
      <Field label="Type">
        <select className={inputClass} value={form.type} disabled={editing} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </select>
      </Field>
      {editing && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
          Active
        </label>
      )}
      <Button onClick={onSubmit}>{editing ? 'Save changes' : 'Create category'}</Button>
    </form>
  );
};

export default CategoryFormPage;
