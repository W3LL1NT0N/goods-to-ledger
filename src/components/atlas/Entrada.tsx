import { useState } from "react";
import { toast } from "sonner";
import { getDB, salvarRecebimento, uid, update, useDB, usuarioAtual } from "@/lib/atlas/store";
import { podeAdicionarRomaneio, UFS, validarDoc, validarNF } from "@/lib/atlas/rules";
import type { DocEntrada, NotaFiscal, Recebimento } from "@/lib/atlas/types";
import { Btn, Combo, Field, Input, Panel, Select, Tag, brl } from "./ui";
import { optGalpoes, optProjetos, optSkus, skuDe } from "./lists";
import { cn } from "@/lib/utils";

const novoDoc = (): DocEntrada => ({ id: uid(), numero: "", nfs: [], docsCliente: [], itens: [], fsd: [] });
const novaNF = (): NotaFiscal => ({ id: uid(), numero: "", serie: "", chave: "", natureza: "", uf: "", cidade: "", razaoSocial: "", dataEmissao: "" });

export function EntradaEditor({ inicial, onClose }: { inicial: Recebimento; onClose: () => void }) {
  const d = useDB();
  const [r, setR] = useState<Recebimento>(() => structuredClone(inicial));
  const [ri, setRi] = useState(0);
  const [di, setDi] = useState(0);
  const [tentou, setTentou] = useState(false);
  const mut = (fn: (x: Recebimento) => void) => setR((p) => { const n = structuredClone(p); fn(n); return n; });

  const rom = r.romaneios[ri];
  const doc = rom?.docs[di];
  const errosCab = [!r.galpaoId && "GALPÃO", !r.projetoId && "PROJETO", !r.modalidade && "MODALIDADE", !r.data && "DATA"].filter(Boolean) as string[];

  const addRomaneio = () => {
    if (!podeAdicionarRomaneio(r.romaneios.map((x) => x.codigo))) return toast.error("JÁ EXISTE UMA LINHA DE ROMANEIO EM BRANCO");
    mut((x) => { x.romaneios.push({ id: uid(), codigo: "", docs: [] }); }); setRi(r.romaneios.length); setDi(0);
  };
  const mutDoc = (fn: (doc: DocEntrada) => void) => mut((x) => fn(x.romaneios[ri].docs[di]));

  const salvar = (finalizar: boolean) => {
    setTentou(true);
    if (errosCab.length) return toast.error("PREENCHA: " + errosCab.join(", "));
    if (finalizar) {
      if (r.romaneios.length === 0) return toast.error("INFORME AO MENOS UM ROMANEIO");
      const erros: string[] = [];
      r.romaneios.forEach((ro, i) => {
        if (!ro.codigo.trim()) erros.push(`ROMANEIO ${i + 1}: CÓDIGO OBRIGATÓRIO`);
        if (ro.docs.length === 0) erros.push(`ROMANEIO ${ro.codigo || i + 1}: SEM DOCUMENTO DE ENTRADA`);
        ro.docs.forEach((doc) => validarDoc(doc, getDB()).forEach((e) => erros.push(`${ro.codigo} / ${doc.numero || "DOC"}: ${e}`)));
      });
      if (erros.length) { toast.error(`${erros.length} PENDÊNCIA(S)`, { description: erros.slice(0, 6).join("\n") }); return; }
    }
    salvarRecebimento(r, finalizar);
    toast.success(finalizar ? `RECEBIMENTO ${r.numero} ENVIADO PARA CONFERÊNCIA` : `RASCUNHO ${r.numero} SALVO`);
    if (finalizar) onClose();
  };

  const bloqueado = r.status === "FINALIZADO";

  return (
    <div className="grid h-full min-h-0 grid-cols-[260px_240px_1fr] gap-2">
      <Panel title={`1. RECEBIMENTO ${r.numero || "NOVO"}`} actions={<Tag tone={bloqueado ? "ok" : "warn"}>{r.status}</Tag>}>
        <div className="mb-2 flex flex-wrap gap-1">
          {!bloqueado && <Btn variant="primary" onClick={() => salvar(true)}>SALVAR E FECHAR</Btn>}
          {!bloqueado && <Btn onClick={() => salvar(false)}>RASCUNHO</Btn>}
          <Btn onClick={onClose}>{bloqueado ? "FECHAR" : "CANCELAR"}</Btn>
        </div>
        <div className="flex flex-col gap-1.5">
          <Field label="DATA DE RECEBIMENTO *" error={tentou && !r.data}>
            <input type="date" disabled={bloqueado} className="h-6 rounded-[4px] border border-input bg-card px-1.5" value={r.data} onChange={(e) => mut((x) => { x.data = e.target.value; })} />
          </Field>
          <Field label="GALPÃO DE DESTINO *" error={tentou && !r.galpaoId}>
            <Combo disabled={bloqueado} value={r.galpaoId} onChange={(v) => mut((x) => { x.galpaoId = v; })} options={optGalpoes(d)}
              onNovo={(t) => { const id = uid(); update((db) => { db.galpoes.push({ id, nome: t, ativo: true }); }, { acao: "CADASTRO GALPÃO", detalhe: t }); return id; }} />
          </Field>
          <Field label="CLIENTE › PROJETO / SUBPROJETO *" error={tentou && !r.projetoId}>
            <Combo disabled={bloqueado} value={r.projetoId} onChange={(v) => mut((x) => { x.projetoId = v; })} options={optProjetos(d)} />
          </Field>
          <Field label="MODALIDADE DE CHEGADA *" error={tentou && !r.modalidade}>
            <Combo disabled={bloqueado} value={r.modalidade} onChange={(v) => mut((x) => { x.modalidade = v; })} options={d.modalidades.map((m) => ({ value: m, label: m }))}
              onNovo={(t) => { update((db) => { if (!db.modalidades.includes(t)) db.modalidades.push(t); }, { acao: "CADASTRO MODALIDADE", detalhe: t }); return t; }} />
          </Field>
        </div>
        <div className="mt-3 flex items-center justify-between border-b border-border pb-1">
          <span className="text-[10px] font-bold">2. ROMANEIOS</span>
          {!bloqueado && <Btn onClick={addRomaneio}>+ ROMANEIO</Btn>}
        </div>
        <div className="mt-1 flex flex-col gap-1">
          {r.romaneios.length === 0 && <div className="py-2 text-subtle">NENHUM ROMANEIO</div>}
          {r.romaneios.map((ro, i) => (
            <div key={ro.id} onClick={() => { setRi(i); setDi(0); }}
              className={cn("flex cursor-pointer items-center gap-1 rounded-[4px] border px-1.5 py-1", i === ri ? "border-ring bg-muted" : "border-border")}>
              <Input disabled={bloqueado} placeholder="CÓDIGO DO ROMANEIO" value={ro.codigo} onChange={(v) => mut((x) => { x.romaneios[i].codigo = v; })} />
              <span className="shrink-0 text-[9px] text-muted-foreground">{ro.docs.length} DOC</span>
              {!bloqueado && <Btn variant="ghost" onClick={(e) => { e.stopPropagation(); mut((x) => { x.romaneios.splice(i, 1); }); setRi(0); }}>×</Btn>}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={`3. DOC. ENTRADA ${rom ? "· " + (rom.codigo || "SEM CÓDIGO") : ""}`}
        actions={rom && !bloqueado && <Btn onClick={() => { mut((x) => { x.romaneios[ri].docs.push(novoDoc()); }); setDi(rom.docs.length); }}>+ NOVO DOC</Btn>}>
        {!rom && <div className="text-subtle">SELECIONE OU CRIE UM ROMANEIO</div>}
        <div className="flex flex-col gap-1">
          {rom?.docs.map((dc, i) => {
            const erros = validarDoc(dc, d);
            return (
              <div key={dc.id} onClick={() => setDi(i)} className={cn("cursor-pointer rounded-[4px] border p-1.5", i === di ? "border-ring bg-muted" : "border-border")}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{dc.numero || "SEM NÚMERO"}</span>
                  <div className="flex items-center gap-1">
                    <Tag tone={erros.length ? "warn" : "ok"}>{erros.length ? `${erros.length} PEND.` : "OK"}</Tag>
                    {!bloqueado && <Btn variant="ghost" onClick={(e) => { e.stopPropagation(); mut((x) => { x.romaneios[ri].docs.splice(i, 1); }); setDi(0); }}>×</Btn>}
                  </div>
                </div>
                <div className="mt-0.5 grid grid-cols-3 text-[9px] text-muted-foreground">
                  <span>NF: {dc.nfs.length}</span><span>DOC CLI: {dc.docsCliente.length}</span>
                  <span>QTD: {dc.itens.reduce((a, b) => a + (b.qtd || 0), 0)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title={`4. EDIÇÃO DO DOCUMENTO ${doc ? "· " + (doc.numero || "NOVO") : ""}`}>
        {!doc ? <div className="text-subtle">SELECIONE OU CRIE UM DOCUMENTO DE ENTRADA</div> : (
          <fieldset disabled={bloqueado} className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-2">
              <Field label="Nº DOCUMENTO DE ENTRADA *"><Input value={doc.numero} onChange={(v) => mutDoc((x) => { x.numero = v; })} /></Field>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between border-b border-border pb-1">
                <span className="text-[10px] font-bold">4.1 NOTAS FISCAIS ({doc.nfs.length}) <span className="font-normal text-subtle">· OPCIONAL</span></span>
                <Btn onClick={() => mutDoc((x) => { x.nfs.push(novaNF()); })}>+ NF</Btn>
              </div>
              {doc.nfs.map((nf, i) => <NFRow key={nf.id} nf={nf} onChange={(n) => mutDoc((x) => { x.nfs[i] = n; })} onRemove={() => mutDoc((x) => { x.nfs.splice(i, 1); })} />)}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between border-b border-border pb-1">
                <span className="text-[10px] font-bold">4.2 DOCUMENTOS DO CLIENTE ({doc.docsCliente.length}) <span className="font-normal text-subtle">· OPCIONAL</span></span>
                <Btn onClick={() => mutDoc((x) => { x.docsCliente.push(""); })}>+ DOC CLIENTE</Btn>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {doc.docsCliente.map((dc, i) => (
                  <div key={i} className="flex gap-1">
                    <Input placeholder="IDENTIFICADOR" value={dc} onChange={(v) => mutDoc((x) => { x.docsCliente[i] = v; })} />
                    <Btn variant="ghost" onClick={() => mutDoc((x) => { x.docsCliente.splice(i, 1); })}>×</Btn>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between border-b border-border pb-1">
                <span className="text-[10px] font-bold">4.3 PRODUTOS ({doc.itens.length}) *</span>
                <Btn onClick={() => mutDoc((x) => { x.itens.push({ id: uid(), skuId: "", qtd: 1, unidades: [] }); })}>+ PRODUTO</Btn>
              </div>
              <div className="flex flex-col gap-1">
                {doc.itens.map((it, i) => {
                  const sku = skuDe(d, it.skuId);
                  return (
                    <div key={it.id} className="grid grid-cols-[1fr_70px_60px_80px_100px_90px_24px] items-end gap-1">
                      <Field label="SKU *"><Combo value={it.skuId} onChange={(v) => mutDoc((x) => { x.itens[i].skuId = v; })} options={optSkus(d)} /></Field>
                      <Field label="TIPO"><div className="h-6 pt-1 text-[9px]">{sku ? <Tag>{sku.tipo === "SERIALIZADO" ? "SERIAL" : "MISC"}</Tag> : "—"}</div></Field>
                      <Field label="UN"><div className="h-6 pt-1">{sku?.unidade ?? "—"}</div></Field>
                      <Field label="QTD *"><Input type="number" step={sku?.fracionavel ? "0.001" : "1"} min={0} value={String(it.qtd)} onChange={(v) => mutDoc((x) => { x.itens[i].qtd = Number(v); })} /></Field>
                      <Field label={doc.nfs.length ? "VALOR UNIT. *" : "VALOR UNIT."} error={doc.nfs.length > 0 && !(it.valorUnit! > 0)}>
                        <Input type="number" step="0.01" min={0} value={it.valorUnit == null ? "" : String(it.valorUnit)} onChange={(v) => mutDoc((x) => { x.itens[i].valorUnit = v === "" ? undefined : Number(v); })} />
                      </Field>
                      <Field label="TOTAL"><div className="h-6 pt-1">{brl(it.valorUnit != null ? it.valorUnit * it.qtd : undefined)}</div></Field>
                      <Btn variant="ghost" className="mb-0" onClick={() => mutDoc((x) => { x.itens.splice(i, 1); })}>×</Btn>
                    </div>
                  );
                })}
              </div>
            </div>

            {validarDoc(doc, d).length > 0 && (
              <div className="rounded-[4px] bg-warn-bg p-2 text-[10px] text-warn">
                {validarDoc(doc, d).map((e) => <div key={e}>· {e}</div>)}
              </div>
            )}
          </fieldset>
        )}
      </Panel>
    </div>
  );
}

function NFRow({ nf, onChange, onRemove }: { nf: NotaFiscal; onChange: (n: NotaFiscal) => void; onRemove: () => void }) {
  const d = useDB();
  const set = <K extends keyof NotaFiscal>(k: K, v: NotaFiscal[K]) => onChange({ ...nf, [k]: v });
  const erros = validarNF(nf, d);
  const quem = usuarioAtual(d).nome;
  return (
    <div className="mb-1 grid grid-cols-[70px_50px_1fr_140px_50px_130px_160px_110px_24px] items-end gap-1 rounded-[4px] border border-border p-1">
      <Field label="Nº NF *" error={!nf.numero}><Input value={nf.numero} onChange={(v) => set("numero", v.replace(/\D/g, ""))} /></Field>
      <Field label="SÉRIE *" error={!nf.serie}><Input value={nf.serie} onChange={(v) => set("serie", v)} /></Field>
      <Field label={`CHAVE DE ACESSO * (${nf.chave.length}/44)`} error={nf.chave.length !== 44}><Input maxLength={44} value={nf.chave} onChange={(v) => set("chave", v.replace(/\D/g, ""))} /></Field>
      <Field label="NATUREZA *"><Combo value={nf.natureza} onChange={(v) => set("natureza", v)} options={d.naturezas.map((n) => ({ value: n, label: n }))} /></Field>
      <Field label="UF *"><Select placeholder="—" value={nf.uf} onChange={(v) => onChange({ ...nf, uf: v, cidade: "" })} options={UFS.map((u) => ({ value: u, label: u }))} /></Field>
      <Field label="CIDADE *">
        <Combo disabled={!nf.uf} value={nf.cidade} onChange={(v) => set("cidade", v)} options={d.cidades.filter((c) => c.uf === nf.uf).map((c) => ({ value: c.nome, label: c.nome }))}
          onNovo={(t) => { update((db) => { if (!db.cidades.some((c) => c.uf === nf.uf && c.nome === t)) db.cidades.push({ uf: nf.uf, nome: t, custom: true }); }, { acao: "CIDADE CUSTOMIZADA", detalhe: `${t}/${nf.uf}` }); return t; }} />
      </Field>
      <Field label="RAZÃO SOCIAL DESTINO *">
        <Combo value={nf.razaoSocial} onChange={(v) => set("razaoSocial", v)} options={d.razoesSociais.map((r) => ({ value: r.nome, label: r.nome }))}
          onNovo={(t) => { update((db) => { if (!db.razoesSociais.some((r) => r.nome === t)) db.razoesSociais.push({ nome: t, por: quem, em: new Date().toISOString() }); }, { acao: "RAZÃO SOCIAL SUGERIDA", detalhe: t }); return t; }} />
      </Field>
      <Field label="EMISSÃO *"><input type="date" className="h-6 rounded-[4px] border border-input bg-card px-1" value={nf.dataEmissao} onChange={(e) => set("dataEmissao", e.target.value)} /></Field>
      <Btn variant="ghost" onClick={onRemove} title={erros.join("\n")}>×</Btn>
    </div>
  );
}
