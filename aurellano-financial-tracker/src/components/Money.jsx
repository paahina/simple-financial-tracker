import { usePrivacy } from '../hooks/usePrivacy';
import { formatPeso } from '../utils/format';

const Money = ({ centavos, className = '' }) => {
  const { amountsHidden } = usePrivacy();
  if (amountsHidden) {
    return (
      <span className={className} aria-label="Hidden amount">
        ₱ ••••
      </span>
    );
  }
  return <span className={className}>{formatPeso(centavos)}</span>;
};

export default Money;
