const TableSubtitleSpacer = ({ className = 'mb-1' }) => (
  <p className={`text-xs text-neutral-500 invisible ${className}`.trim()} aria-hidden="true">
    {'\u00A0'}
  </p>
);

export default TableSubtitleSpacer;
