import { useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-h-0 flex-col rounded-md border border-border bg-card shadow-[0_1px_2px_0_color-mix(in_oklab,var(--foreground)_6%,transparent)]", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/60 px-2 py-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">{title}</span>
          <div className="flex items-center gap-1">{actions}</div>
        </header>
      )}
      <div className="min-h-0 flex-1 overflow-auto p-2">{children}</div>
    </section>
  );
}

export function Btn({ variant = "secondary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return (
    <button
      type="button"
      {...p}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-[5px] px-2 text-[10px] font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" && "border border-border bg-card text-foreground hover:border-ring",
        variant === "danger" && "border border-err/30 bg-err-bg text-err hover:border-err",
        variant === "ghost" && "text-muted-foreground hover:text-foreground",
        className,
      )}
    />
  );
}

export function Field({ label, children, className, error }: { label: string; children: ReactNode; className?: string; error?: boolean }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className={cn("text-[9px] font-bold uppercase tracking-wide", error ? "text-err" : "text-muted-foreground")}>{label}</span>
      {children}
    </label>
  );
}

export const inputCls = "h-6 w-full min-w-0 rounded-[4px] border border-input bg-card px-1.5 text-[11px] uppercase text-foreground outline-none placeholder:text-subtle focus:border-ring disabled:bg-muted";

export function Input({ upper = true, className, onChange, ...p }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { upper?: boolean; onChange?: (v: string) => void }) {
  return <input {...p} className={cn(inputCls, !upper && "normal-case", className)} onChange={(e) => onChange?.(upper ? e.target.value.toUpperCase() : e.target.value)} />;
}

export function Select({ value, onChange, options, placeholder = "SELECIONE", className, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; className?: string; disabled?: boolean }) {
  return (
    <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, className)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Campo digitável controlado: só aceita valores da lista; atalho [+ NOVO] opcional. */
export function Combo({ value, onChange, options, onNovo, placeholder = "DIGITE PARA BUSCAR", disabled, invalid }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
  onNovo?: (texto: string) => string | void; placeholder?: string; disabled?: boolean; invalid?: boolean;
}) {
  const atual = options.find((o) => o.value === value);
  const [q, setQ] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const texto = q ?? atual?.label ?? "";
  const filtrados = useMemo(() => {
    const t = (q ?? "").trim();
    return (t ? options.filter((o) => o.label.includes(t)) : options).slice(0, 60);
  }, [q, options]);
  const escolher = (v: string) => { onChange(v); setQ(null); setOpen(false); };
  return (
    <div className="relative flex min-w-0 gap-1">
      <input
        ref={ref}
        disabled={disabled}
        className={cn(inputCls, invalid && "border-err", value && !atual && "border-err")}
        value={texto}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value.toUpperCase()); setOpen(true); }}
        onBlur={() => setTimeout(() => { setOpen(false); setQ(null); }, 150)}
        onKeyDown={(e) => { if (e.key === "Enter" && filtrados[0]) { e.preventDefault(); escolher(filtrados[0].value); } }}
      />
      {onNovo && !disabled && (
        <button type="button" title="CADASTRAR NOVO" className="h-6 shrink-0 rounded-[4px] border border-border px-1.5 text-[9px] font-bold text-muted-foreground hover:border-ring hover:text-foreground"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const t = (q ?? "").trim() || window.prompt("NOVO VALOR:")?.toUpperCase().trim();
            if (!t) return; const v = onNovo(t); if (v) escolher(v);
          }}>+ NOVO</button>
      )}
      {open && !disabled && (
        <div className="absolute left-0 top-7 z-30 max-h-56 w-full min-w-48 overflow-auto rounded-[4px] border border-border bg-popover shadow-md">
          {filtrados.length === 0 && <div className="px-2 py-1 text-subtle">NENHUM VALOR NA LISTA</div>}
          {filtrados.map((o) => (
            <div key={o.value} onMouseDown={(e) => { e.preventDefault(); escolher(o.value); }}
              className={cn("cursor-pointer px-2 py-1 uppercase hover:bg-muted", o.value === value && "font-bold")}>{o.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Tag({ tone = "neutral", children }: { tone?: "ok" | "warn" | "err" | "neutral"; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-4 items-center rounded-[3px] px-1.5 text-[9px] font-bold uppercase tracking-wide",
      tone === "ok" && "bg-ok-bg text-ok", tone === "warn" && "bg-warn-bg text-warn", tone === "err" && "bg-err-bg text-err",
      tone === "neutral" && "bg-muted text-muted-foreground")}>{children}</span>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead className="sticky top-0 bg-muted">
        <tr>{head.map((h, i) => <th key={i} className="border-b border-border px-1.5 py-1 text-left text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr>
      </thead>
      <tbody className="[&_td]:border-b [&_td]:border-border [&_td]:px-1.5 [&_td]:py-0.5 [&_tr:hover]:bg-muted/50">
        {children}
        {empty && <tr><td colSpan={head.length} className="py-3 text-center text-subtle">NENHUM REGISTRO</td></tr>}
      </tbody>
    </table>
  );
}

export const brl = (v?: number) => v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataBR = (iso: string) => iso ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("pt-BR") : "—";
export const dataHoraBR = (iso: string) => new Date(iso).toLocaleString("pt-BR");
