import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Modal } from "../../components/ui/Modal";
import { useQuery } from "../../lib/locationQuery";
import { showNotice } from "../../lib/flash";
import { deleteJourneyPointType, getJourneyPointTypes, saveJourneyPointType, type JourneyPointType } from "./journey";
import { JourneyIcon } from "./JourneyIcon";
import { journeyPointIconOptions } from "./journeyPointIcons";

type PointTypeDraft = Pick<JourneyPointType, "name" | "icon" | "color">;
const emptyDraft: PointTypeDraft = { name: "", icon: "ACTIVITY", color: "#83D8F5" };

export function JourneyPointTypesPage() {
  const client = useQueryClient();
  const types = useQuery({ queryKey: ["journey-point-types"], queryFn: getJourneyPointTypes });
  const [draft, setDraft] = useState<PointTypeDraft>(emptyDraft);
  const [editing, setEditing] = useState<JourneyPointType>();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<JourneyPointType>();
  const save = useMutation({
    mutationFn: () => saveJourneyPointType(draft, editing?.code),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["journey-point-types"] });
      setEditing(undefined);
      setCreating(false);
      setDraft(emptyDraft);
      showNotice("Tipo de punto actualizado.");
    },
  });
  const remove = useMutation({
    mutationFn: deleteJourneyPointType,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["journey-point-types"] });
      setDeleting(undefined);
      showNotice("Tipo de punto eliminado.");
    },
  });
  const closeEditor = () => {
    setEditing(undefined);
    setCreating(false);
    setDraft(emptyDraft);
    save.reset();
  };

  return <section className="journey-page journey-point-types-page" aria-labelledby="journey-point-types-title">
    <Link className="section-back" to="/app/whither-journey">← Volver a viajes</Link>
    <h1 id="journey-point-types-title">Tipos de punto</h1>
    <p>Personalicen las categorías que aparecen en la agenda de todos sus viajes.</p>
    {types.error && <p className="form-error" role="alert">{types.error.message}</p>}
    <div className="journey-point-type-list" aria-busy={types.isLoading}>
      {types.isLoading && <LoadingSkeleton variant="list" section="journey" />}
      {types.data?.map((value) => <article className="journey-point-type-row" key={value.code}>
        <span className="journey-point-type-row__icon" style={{ color: value.color, backgroundColor: `${value.color}20` }}>
          <JourneyIcon name={value.icon} />
        </span>
        <div className="journey-point-type-row__copy">
          <h2>{value.name}</h2>
          <p>{value.builtIn ? "Tipo original" : "Tipo personalizado"}</p>
        </div>
        <div className="journey-point-type-row__actions">
          <Button variant="secondary" icon={<JourneyIcon name="EDIT" />} type="button" onClick={() => { setEditing(value); setDraft({ name: value.name, icon: value.icon, color: value.color }); save.reset(); }}>Editar</Button>
          {!value.builtIn && <Button variant="destructive" icon={<JourneyIcon name="DELETE" />} type="button" onClick={() => { remove.reset(); setDeleting(value); }}>Eliminar</Button>}
        </div>
      </article>)}
    </div>
    <Button className="journey-point-types-add" icon={<JourneyIcon name="LINK" />} type="button" onClick={() => { setEditing(undefined); setDraft(emptyDraft); setCreating(true); save.reset(); }}>Agregar tipo</Button>

    {(editing || creating) && <Modal className="journey-modal" size="standard" onClose={closeEditor} confirmDiscard pending={save.isPending} title={editing ? "Editar tipo de punto" : "Nuevo tipo de punto"}>
      <form className="journey-form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <h2>{editing ? "Editar tipo de punto" : "Agregar tipo de punto"}</h2>
        <div className="form-columns journey-point-type-form__fields">
          <label>Nombre<input autoFocus required maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Por ejemplo, Compras" /></label>
          <label>Ícono<select value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value })}>{journeyPointIconOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        </div>
        <label className="journey-point-type-color">Color<input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} /><span>{draft.color.toUpperCase()}</span></label>
        <div className="journey-point-type-preview" aria-live="polite">
          <span style={{ color: draft.color }}><JourneyIcon name={draft.icon} /></span>
          <strong>{draft.name || "Vista previa"}</strong>
        </div>
        {save.error && <p className="form-error" role="alert">{save.error.message}</p>}
        <Button disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar tipo"}</Button>
      </form>
    </Modal>}

    {deleting && <ConfirmDialog
      title={`¿Eliminar “${deleting.name}”?`}
      message={remove.error?.message ?? "Se quitará de la lista de tipos. No se puede borrar mientras haya puntos de viaje que lo usen."}
      confirmLabel="Eliminar tipo"
      pending={remove.isPending}
      onClose={() => setDeleting(undefined)}
      onConfirm={() => remove.mutate(deleting.code)}
    />}
  </section>;
}
