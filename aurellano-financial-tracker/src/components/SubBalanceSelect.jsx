import Field from './Field';
import Select from './Select';
import { pocketOptions } from '../utils/accounts';

const SubBalanceSelect = ({ account, value, onChange, error, label = 'Sub-balance' }) => {
  const options = pocketOptions(account);
  if (!options.length) return null;
  return (
    <Field label={label} error={error}>
      <Select value={value} options={options} onChange={onChange} />
    </Field>
  );
};

export default SubBalanceSelect;
