interface MultiSelectItem {id: string; name: string; hint?: string}

export function MultiSelect({label, items, value, onChange, disabled = false}: {
  label: string; items: MultiSelectItem[]; value: string[]; onChange: (ids: string[]) => void; disabled?: boolean;
}) {
  const selected = new Set(value);
  return (
    <fieldset>
      <legend className="b2b-label">{label}</legend>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-2">
        {items.length ? items.map((item) => (
          <label key={item.id} className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-white'}`}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-slate-900"
              checked={selected.has(item.id)}
              disabled={disabled}
              onChange={(event) => onChange(event.target.checked ? [...value, item.id] : value.filter((id) => id !== item.id))}
            />
            <span className="min-w-0"><span className="block text-sm font-semibold text-slate-700">{item.name}</span>{item.hint ? <span className="block truncate text-xs text-slate-400">{item.hint}</span> : null}</span>
          </label>
        )) : <p className="px-3 py-5 text-center text-xs text-slate-400">Список пока пуст</p>}
      </div>
    </fieldset>
  );
}
