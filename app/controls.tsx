'use client';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
export function Choice({
  value,
  options,
  onChange,
  label,
  disabled = false,
}: {
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => v !== null && onChange(String(v))}
      disabled={disabled}
    >
      <SelectTrigger aria-label={label}>
        <SelectValue>
          {options.find((x) => x[0] === value)?.[1] || label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map(([id, text]) => (
          <SelectItem key={id} value={id}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export async function request<T = any>(
  path: string,
  data?: unknown,
): Promise<T> {
  const r = await fetch(
    path,
    data
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      : undefined,
  );
  const b = (await r.json()) as T & { error?: string };
  if (!r.ok) throw Error(b.error || 'Не удалось выполнить действие');
  return b;
}
export async function uploadFile(
  file: File,
): Promise<import('@/lib/model').Asset> {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch('/api/assets', { method: 'POST', body: form });
  const d = (await r.json()) as import('@/lib/model').Asset & { error: string };
  if (!r.ok) throw Error(d.error);
  return d;
}
