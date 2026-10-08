const Tabs = ({ tabs, value, onChange }) => (
  <div className="flex flex-wrap gap-x-6 border-b border-neutral-200" role="tablist">
    {tabs.map((tab) => {
      const selected = tab.id === value;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={selected}
          className={`-mb-px border-b-2 px-1 pb-2 text-sm ${
            selected ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

export default Tabs;
