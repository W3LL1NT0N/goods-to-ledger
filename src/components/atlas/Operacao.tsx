import { useMemo, useState } from "react";
import { toast } from "sonner";
import { calcularEstoque, novoRecebimento, uid, update, useDB, usuarioAtual } from "@/lib/atlas/store";
import { pode } from "@/lib/atlas/rules";
import type { Recebimento } from "@/lib/atlas/types";
import { Btn, Combo, Field, Input, Panel, Table, Tag, dataBR, dataHoraBR } from "./ui";
import { nomeGalpao, nomeProjeto, optGalpoes, optProjetos, optSkus, skuDe } from "./lists";
import { EntradaEditor } from "./Entrada";
import { cn } from "@/lib/utils";

/* ---------------- RECEBIMENTOS (lista + editor) ---------------- */
export function Recebimentos() {
  const d = useDB();
  const [edit, setEdit] = useState<Recebimento | null>(null);
  const [q, setQ] = useState("");
  const podeCriar = pode(usuarioAtual(d).papel, "RECEBIMENTO_CRIAR");
  const lista = useMemo(() => d.recebimentos.filter((r) => {
    if (!q) return true;
    const blob = [r.numero, nomeGalpao(d, r.galpaoId), nomeProjeto(d, r.projetoId), r.modalidade,
      ...r.romaneios.flatMap((ro) => [ro.codigo, ...ro.docs.flatMap((dc) => [dc.numero, ...dc.docsCliente, ...dc.nfs.flatMap((n) => [n.numero, n.chave]),
        ...dc.itens.flatMap((it) => [skuDe(d, it.skuId)?.codigo ?? "", ...it.unidades.flatMap((u) => [u.serial, ...u.docsAparelho])])])])].join(" ");
    return blob.toUpperCase().includes(q);
  }), [d, q]);

  if (edit) return <EntradaEditor inicial={edit} onClose={() => setEdit(null)} />;
  return (
    <Panel title={`RECEBIMENTOS (${lista.length})`} className="h-full"
      actions={<>
        <Input className="w-72" placeholder="BUSCAR Nº, ROMANEIO, DOC, NF, CHAVE, DOC CLIENTE, SKU, SERIAL" value={q} onChange={setQ} />
        {podeCriar && <Btn variant="primary" onClick={() => setEdit(novoRecebimento())}>+ NOVO RECEBIMENTO</Btn>}
      </>}>
      <Table empty={lista.length === 0} head={["Nº", "DATA", "GALPÃO", "PROJETO", "MODALIDADE", "ROMANEIOS", "DOCS", "QTD", "STATUS", "CRIADO POR", ""]}>
        {lista.map((r) => {
          const docs = r.romaneios.flatMap((x) => x.docs);
          return (
            <tr key={r.id}>
              <td className="font-bold">{r.numero}</td><td>{dataBR(r.data)}</td><td>{nomeGalpao(d, r.galpaoId)}</td>
              <td>{nomeProjeto(d, r.projetoId)}</td><td>{r.modalidade}</td>
              <td>{r.romaneios.map((x) => x.codigo).join(", ")}</td><td>{docs.length}</td>
              <td>{docs.flatMap((x) => x.itens).reduce((a, b) => a + b.qtd, 0)}</td>
              <td><Tag tone={r.status === "FINALIZADO" ? "ok" : "warn"}>{r.status}</Tag></td><td>{r.criadoPor}</td>
              <td className="text-right"><Btn onClick={() => setEdit(r)}>{r.status === "RASCUNHO" && podeCriar ? "RETOMAR" : "ABRIR"}</Btn></td>
            </tr>
          );
        })}
      </Table>
    </Panel>
  );
}

/* ---------------- CONFERÊNCIA ---------------- */
export function Conferencia() {
  const d = useDB();
  const u = usuarioAtual(d);
  const podeConf = pode(u.papel, "CONFERIR");
  const recs = d.recebimentos.filter((r) => r.status === "FINALIZADO");
  const [sel, setSel] = useState<{ r: string; ro: string; doc: string } | null>(null);
  const rec = recs.find((r) => r.id === sel?.r);
  const rom = rec?.romaneios.find((x) => x.id === sel?.ro);
  const doc = rom?.docs.find((x) => x.id === sel?.doc);

  const mutDoc = (fn: (doc: NonNullable<typeof doc>) => void, acao: string, det: string) =>
    update((db) => {
      const dd = db.recebimentos.find((r) => r.id === sel!.r)!.romaneios.find((x) => x.id === sel!.ro)!.docs.find((x) => x.id === sel!.doc)!;
      fn(dd);
    }, { acao, detalhe: `REC ${rec!.numero} / ${rom!.codigo} / ${doc!.numero}: ${det}` });

  const pendDoc = (dc: NonNullable<typeof doc>) => dc.itens.reduce((a, it) => {
    const s = skuDe(d, it.skuId);
    return a + (s?.tipo === "SERIALIZADO" ? it.unidades.filter((x) => x.status === "PENDENTE").length : it.qtdConferida == null ? 1 : 0);
  }, 0);

  return (
    <div className="grid h-full min-h-0 grid-cols-[320px_1fr] gap-2">
      <Panel title="DOCUMENTOS PARA CONFERÊNCIA">
        {recs.length === 0 && <div className="text-subtle">NENHUM RECEBIMENTO FINALIZADO</div>}
        {recs.map((r) => (
          <div key={r.id} className="mb-2">
            <div className="text-[10px] font-bold">REC {r.numero} · {nomeGalpao(d, r.galpaoId)}</div>
            {r.romaneios.map((ro) => ro.docs.map((dc) => {
              const p = pendDoc(dc);
              return (
                <div key={dc.id} onClick={() => setSel({ r: r.id, ro: ro.id, doc: dc.id })}
                  className={cn("mt-1 flex cursor-pointer items-center justify-between rounded-[4px] border px-1.5 py-1", sel?.doc === dc.id ? "border-ring bg-muted" : "border-border")}>
                  <span>{ro.codigo} › {dc.numero}</span>
                  <Tag tone={p ? "warn" : "ok"}>{p ? `${p} PEND.` : "CONFERIDO"}</Tag>
                </div>
              );
            }))}
          </div>
        ))}
      </Panel>
      <Panel title={doc ? `CONFERÊNCIA · ${rom!.codigo} › ${doc.numero}` : "CONFERÊNCIA"}
        actions={doc && podeConf && <FsdBtn onAdd={(skuId, qtd, serial, obs) => mutDoc((x) => { x.fsd.push({ id: uid(), skuId, qtd, serial, obs, em: new Date().toISOString(), por: u.nome }); }, "NC FSD", `${skuDe(d, skuId)?.codigo} x${qtd}`)} />}>
        {!doc ? <div className="text-subtle">SELECIONE UM DOCUMENTO À ESQUERDA</div> : (
          <div className="flex flex-col gap-3">
            {!podeConf && <div className="rounded-[4px] bg-warn-bg p-1.5 text-warn">SEU PAPEL ({u.papel}) NÃO PERMITE CONFERIR — SOMENTE LEITURA</div>}
            {doc.itens.map((it, ii) => {
              const sku = skuDe(d, it.skuId)!;
              if (sku.tipo === "MISCELANEA") return (
                <div key={it.id} className="rounded-[4px] border border-border p-2">
                  <div className="mb-1 font-bold">{sku.codigo} — {sku.descricao} <Tag>MISCELÂNEA</Tag></div>
                  <div className="flex items-end gap-2">
                    <Field label="ESPERADO"><div className="h-6 pt-1 font-bold">{it.qtd} {sku.unidade}</div></Field>
                    <Field label="CONFERIDO (TOTAL)"><MiscInput disabled={!podeConf} valor={it.qtdConferida} onSave={(v) => mutDoc((x) => { x.itens[ii].qtdConferida = v; x.itens[ii].conferidoEm = new Date().toISOString(); }, "CONFERÊNCIA MISC", `${sku.codigo} ${v}/${it.qtd}`)} /></Field>
                    {it.qtdConferida != null && (it.qtdConferida < it.qtd ? <Tag tone="err">NC FNF: {it.qtd - it.qtdConferida}</Tag> : <Tag tone="ok">OK</Tag>)}
                  </div>
                </div>
              );
              return (
                <div key={it.id} className="rounded-[4px] border border-border p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-bold">{sku.codigo} — {sku.descricao} <Tag>SERIALIZADO</Tag></span>
                    {podeConf && <Btn onClick={() => mutDoc((x) => { x.itens[ii].unidades.forEach((un) => { if (un.status === "PENDENTE" && un.serial) un.status = "CONFERIDO"; }); }, "CONFERÊNCIA EM LOTE", sku.codigo)}>CONFERIR TODOS COM SERIAL</Btn>}
                  </div>
                  <Table head={["#", "SERIAL", "DOC APARELHO (0..N)", "STATUS", ""]}>
                    {it.unidades.map((un, ui) => (
                      <tr key={un.id}>
                        <td>{ui + 1}</td>
                        <td className="w-48"><Input disabled={!podeConf || un.status !== "PENDENTE"} value={un.serial} placeholder="SERIAL"
                          onChange={(v) => update((db) => { db.recebimentos.find((r) => r.id === sel!.r)!.romaneios.find((x) => x.id === sel!.ro)!.docs.find((x) => x.id === sel!.doc)!.itens[ii].unidades[ui].serial = v; })} /></td>
                        <td>
                          <div className="flex flex-wrap items-center gap-1">
                            {un.docsAparelho.map((da) => <Tag key={da}>{da}</Tag>)}
                            {podeConf && <Btn variant="ghost" onClick={() => { const v = window.prompt("DOC APARELHO:")?.toUpperCase().trim(); if (v) mutDoc((x) => { x.itens[ii].unidades[ui].docsAparelho.push(v); }, "DOC APARELHO", `${un.serial} ${v}`); }}>+ DOC</Btn>}
                          </div>
                        </td>
                        <td><Tag tone={un.status === "CONFERIDO" ? "ok" : un.status === "FNF" ? "err" : "warn"}>{un.status === "FNF" ? "NC FNF" : un.status}</Tag></td>
                        <td className="text-right">
                          {podeConf && un.status === "PENDENTE" && <>
                            <Btn disabled={!un.serial} onClick={() => mutDoc((x) => { x.itens[ii].unidades[ui].status = "CONFERIDO"; }, "CONFERIDO", un.serial)}>CONFERIR</Btn>{" "}
                            <Btn variant="danger" onClick={() => mutDoc((x) => { x.itens[ii].unidades[ui].status = "FNF"; }, "NC FNF", `${sku.codigo} UN ${ui + 1}`)}>FNF</Btn>
                          </>}
                          {podeConf && un.status !== "PENDENTE" && <Btn variant="ghost" onClick={() => mutDoc((x) => { x.itens[ii].unidades[ui].status = "PENDENTE"; }, "CONFERÊNCIA DESFEITA", un.serial)}>DESFAZER</Btn>}
                        </td>
                      </tr>
                    ))}
                  </Table>
                </div>
              );
            })}
            {doc.fsd.length > 0 && (
              <div className="rounded-[4px] border border-err/30 p-2">
                <div className="mb-1 font-bold text-err">NC FSD — FÍSICO SEM DOCUMENTAÇÃO</div>
                <Table head={["SKU", "QTD", "SERIAL", "OBS", "POR", "EM"]}>
                  {doc.fsd.map((f) => <tr key={f.id}><td>{skuDe(d, f.skuId)?.codigo}</td><td>{f.qtd}</td><td>{f.serial || "—"}</td><td>{f.obs}</td><td>{f.por}</td><td>{dataHoraBR(f.em)}</td></tr>)}
                </Table>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function MiscInput({ valor, onSave, disabled }: { valor?: number; onSave: (v: number) => void; disabled?: boolean }) {
  const [v, setV] = useState(valor == null ? "" : String(valor));
  return (
    <div className="flex gap-1">
      <Input disabled={disabled} className="w-24" type="number" min={0} value={v} onChange={setV} />
      <Btn disabled={disabled || v === ""} variant="primary" onClick={() => onSave(Number(v))}>CONFIRMAR</Btn>
    </div>
  );
}

function FsdBtn({ onAdd }: { onAdd: (skuId: string, qtd: number, serial: string, obs: string) => void }) {
  const d = useDB();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ skuId: "", qtd: "1", serial: "", obs: "" });
  if (!open) return <Btn variant="danger" onClick={() => setOpen(true)}>+ NC FSD</Btn>;
  return (
    <div className="flex items-end gap-1">
      <div className="w-52"><Combo value={f.skuId} onChange={(v) => setF({ ...f, skuId: v })} options={optSkus(d)} placeholder="SKU" /></div>
      <Input className="w-14" type="number" value={f.qtd} onChange={(v) => setF({ ...f, qtd: v })} />
      <Input className="w-28" placeholder="SERIAL" value={f.serial} onChange={(v) => setF({ ...f, serial: v })} />
      <Input className="w-36" placeholder="OBSERVAÇÃO" value={f.obs} onChange={(v) => setF({ ...f, obs: v })} />
      <Btn variant="primary" disabled={!f.skuId || !(Number(f.qtd) > 0)} onClick={() => { onAdd(f.skuId, Number(f.qtd), f.serial, f.obs); setOpen(false); setF({ skuId: "", qtd: "1", serial: "", obs: "" }); }}>REGISTRAR</Btn>
      <Btn onClick={() => setOpen(false)}>×</Btn>
    </div>
  );
}

/* ---------------- ESTOQUE ---------------- */
export function Estoque() {
  const d = useDB();
  const [g, setG] = useState("");
  const rows = calcularEstoque(d).filter((r) => !g || r.galpaoId === g);
  return (
    <Panel title="ESTOQUE POR GALPÃO / SKU" className="h-full" actions={<div className="w-60"><Combo value={g} onChange={setG} options={optGalpoes(d)} placeholder="TODOS OS GALPÕES" /></div>}>
      <Table empty={rows.length === 0} head={["GALPÃO", "SKU", "DESCRIÇÃO", "TIPO", "ESPERADO", "DISPONÍVEL", "PENDENTE CONF.", "NC FNF", "NC FSD (BLOQ.)"]}>
        {rows.map((r) => { const s = skuDe(d, r.skuId); return (
          <tr key={r.galpaoId + r.skuId}>
            <td>{nomeGalpao(d, r.galpaoId)}</td><td className="font-bold">{s?.codigo}</td><td>{s?.descricao}</td><td>{s?.tipo}</td>
            <td>{r.esperado}</td><td className="font-bold text-ok">{r.disponivel}</td><td>{r.pendente || "—"}</td>
            <td>{r.fnf ? <Tag tone="err">{r.fnf}</Tag> : "—"}</td><td>{r.fsd ? <Tag tone="err">{r.fsd}</Tag> : "—"}</td>
          </tr>); })}
      </Table>
    </Panel>
  );
}

/* ---------------- REQUISIÇÕES ---------------- */
export function Requisicoes() {
  const d = useDB();
  const u = usuarioAtual(d);
  const aprova = pode(u.papel, "REQUISICAO_APROVAR");
  const [f, setF] = useState({ origemId: "", destinoId: "", projetoId: "", skuId: "", qtd: "1", motivo: "" });
  const est = calcularEstoque(d);
  const disp = est.find((e) => e.galpaoId === f.origemId && e.skuId === f.skuId)?.disponivel ?? 0;

  const criar = () => {
    const q = Number(f.qtd);
    if (!f.origemId || !f.destinoId || !f.skuId || !f.projetoId) return toast.error("PREENCHA TODOS OS CAMPOS");
    if (f.origemId === f.destinoId) return toast.error("ORIGEM E DESTINO DEVEM SER DIFERENTES");
    if (!(q > 0) || q > disp) return toast.error(`QUANTIDADE INVÁLIDA (DISPONÍVEL: ${disp})`);
    update((db) => { db.requisicoes.unshift({ id: uid(), numero: ++db.seq.requisicao, ...f, qtd: q, status: "PENDENTE", solicitante: u.nome, criadoEm: new Date().toISOString() }); },
      { acao: "REQUISIÇÃO CRIADA", detalhe: `${skuDe(d, f.skuId)?.codigo} x${q}` });
    toast.success("REQUISIÇÃO ENVIADA PARA APROVAÇÃO");
    setF({ ...f, qtd: "1", motivo: "" });
  };
  const decidir = (id: string, status: "APROVADA" | "REJEITADA") => {
    const rq = d.requisicoes.find((x) => x.id === id)!;
    if (status === "APROVADA") {
      const dd = est.find((e) => e.galpaoId === rq.origemId && e.skuId === rq.skuId)?.disponivel ?? 0;
      if (rq.qtd > dd) return toast.error(`SALDO INSUFICIENTE NA ORIGEM (${dd})`);
    }
    update((db) => { const x = db.requisicoes.find((y) => y.id === id)!; x.status = status; x.aprovador = u.nome; x.decididoEm = new Date().toISOString(); },
      { acao: `REQUISIÇÃO ${status}`, detalhe: `Nº ${rq.numero}` });
  };

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-2">
      <Panel title="NOVA REQUISIÇÃO DE MOVIMENTAÇÃO" actions={<Btn variant="primary" onClick={criar}>ENVIAR</Btn>}>
        <div className="grid grid-cols-[1fr_1fr_1fr_1.4fr_80px_1fr] gap-2">
          <Field label="GALPÃO ORIGEM *"><Combo value={f.origemId} onChange={(v) => setF({ ...f, origemId: v })} options={optGalpoes(d)} /></Field>
          <Field label="GALPÃO DESTINO *"><Combo value={f.destinoId} onChange={(v) => setF({ ...f, destinoId: v })} options={optGalpoes(d)} /></Field>
          <Field label="PROJETO *"><Combo value={f.projetoId} onChange={(v) => setF({ ...f, projetoId: v })} options={optProjetos(d)} /></Field>
          <Field label={`SKU * ${f.skuId && f.origemId ? `· DISPONÍVEL: ${disp}` : ""}`}><Combo value={f.skuId} onChange={(v) => setF({ ...f, skuId: v })} options={optSkus(d)} /></Field>
          <Field label="QTD *"><Input type="number" value={f.qtd} onChange={(v) => setF({ ...f, qtd: v })} /></Field>
          <Field label="MOTIVO"><Input value={f.motivo} onChange={(v) => setF({ ...f, motivo: v })} /></Field>
        </div>
      </Panel>
      <Panel title={`CONSULTAR REQUISIÇÕES (${d.requisicoes.length})`}>
        <Table empty={d.requisicoes.length === 0} head={["Nº", "DATA", "ORIGEM", "DESTINO", "PROJETO", "SKU", "QTD", "MOTIVO", "SOLICITANTE", "STATUS", "APROVADOR", ""]}>
          {d.requisicoes.map((r) => (
            <tr key={r.id}>
              <td className="font-bold">{r.numero}</td><td>{dataHoraBR(r.criadoEm)}</td><td>{nomeGalpao(d, r.origemId)}</td><td>{nomeGalpao(d, r.destinoId)}</td>
              <td>{nomeProjeto(d, r.projetoId)}</td><td>{skuDe(d, r.skuId)?.codigo}</td><td>{r.qtd}</td><td>{r.motivo}</td><td>{r.solicitante}</td>
              <td><Tag tone={r.status === "APROVADA" ? "ok" : r.status === "REJEITADA" ? "err" : "warn"}>{r.status}</Tag></td><td>{r.aprovador ?? "—"}</td>
              <td className="text-right">{aprova && r.status === "PENDENTE" && r.solicitante !== u.nome && <>
                <Btn variant="primary" onClick={() => decidir(r.id, "APROVADA")}>APROVAR</Btn>{" "}
                <Btn variant="danger" onClick={() => decidir(r.id, "REJEITADA")}>REJEITAR</Btn></>}
                {aprova && r.status === "PENDENTE" && r.solicitante === u.nome && <span className="text-[9px] text-subtle">AGUARDA OUTRO APROVADOR</span>}
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}
