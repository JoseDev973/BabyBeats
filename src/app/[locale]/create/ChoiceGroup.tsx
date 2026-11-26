import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

interface ChoiceGroupProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function ChoiceGroup({ label, options, selected, onChange, disabled }: ChoiceGroupProps) {
  const t = useTranslations("create");
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.filter((option, i) => i < 6 || option.value === selected);

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div id={id} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map(({ value, label: optionLabel }) => (
          <label key={value} className="relative">
            <input className="peer sr-only" type="radio" name={id} value={value}
              checked={selected === value} onChange={() => onChange(value)} />
            <span className="flex h-full cursor-pointer items-center justify-center rounded-xl border-2 border-border px-4 py-3 text-center text-sm font-semibold hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
              {optionLabel}
            </span>
          </label>
        ))}
      </div>
      <button type="button" aria-expanded={expanded} aria-controls={id}
        onClick={() => setExpanded(!expanded)}
        className="mt-2 inline-flex items-center gap-1 rounded px-1 py-1 text-sm font-semibold text-primary hover:underline">
        {t(expanded ? "showLess" : "showMore")}
        <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
    </fieldset>
  );
}
