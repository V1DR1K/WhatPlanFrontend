import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { showNotice } from "../../lib/flash";
import { photoInputAccept, preparePhoto } from "../../lib/photos";
import type { Activity, ActivitySchedule } from "../../types/domain";
import { getFunCategories, saveActivity, uploadActivityProfilePhoto } from "./whyFun";

const days: ActivitySchedule["dayOfWeek"][] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const dayLabel: Record<ActivitySchedule["dayOfWeek"], string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};
const emptySchedule = (): ActivitySchedule => ({ dayOfWeek: "FRIDAY", opensAt: "20:00", closesAt: "23:00" });

export function ActivityForm({ activity, onClose }: { activity?: Activity; onClose: () => void }) {
  const qc = useQueryClient();
  const [categoryId, setCategoryId] = useState<number | undefined>(activity?.category.id);
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>(activity?.subcategory.id);
  const [schedules, setSchedules] = useState<ActivitySchedule[]>(
    activity?.schedules.length ? activity.schedules : [],
  );
  const [photo, setPhoto] = useState<File>();
  const [photoError, setPhotoError] = useState<string>();
  const categories = useQuery({ queryKey: ["fun-categories"], queryFn: getFunCategories });
  const roots = (categories.data ?? []).filter((value) => !value.parentId);
  const children = (categories.data ?? []).filter((value) => value.parentId === categoryId);
  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      if (!categoryId || !subcategoryId) throw new Error("Elegí categoría y subcategoría.");
      return saveActivity(
        {
          name: String(form.get("name")).trim(),
          address: String(form.get("address")).trim(),
          categoryId,
          subcategoryId,
          schedules,
        },
        activity?.id,
      );
    },
    onSuccess: async (saved) => {
      let photoUploadError: string | undefined;
      if (photo) {
        try {
          await uploadActivityProfilePhoto(saved.id, photo);
        } catch (error) {
          photoUploadError = error instanceof Error
            ? `La actividad se guardó, pero no pudimos subir la foto: ${error.message}`
            : "La actividad se guardó, pero no pudimos subir la foto.";
        }
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["activities"] }),
        qc.invalidateQueries({ queryKey: ["activity", saved.id] }),
      ]);
      showNotice(photoUploadError ?? (activity
        ? "Actualizamos la actividad compartida."
        : "Actividad agregada. Ya pueden registrar una salida."), photoUploadError ? "error" : "success");
      onClose();
    },
  });

  return (
    <Modal onClose={onClose} confirmDiscard pending={mutation.isPending}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(new FormData(event.currentTarget));
        }}
      >
        <p className="eyebrow">{activity ? "EDITAR ACTIVIDAD" : "NUEVA ACTIVIDAD"}</p>
        <h2>{activity ? "Ajustemos la actividad" : "¿Qué quieren hacer?"}</h2>
        <label>
          Actividad
          <input name="name" defaultValue={activity?.name} required autoFocus placeholder="Ej. Bowling del centro" />
        </label>
        <label>
          Dirección
          <input name="address" defaultValue={activity?.address} required placeholder="Calle 123, Rosario" />
        </label>
        <label>
          Foto de perfil <small className="tiny">JPG, PNG, WebP o HEIC · hasta 10 MB</small>
          <input
            type="file"
            accept={photoInputAccept}
            onChange={async (event) => {
              const selected = event.target.files?.[0];
              setPhotoError(undefined);
              if (!selected) {
                setPhoto(undefined);
                return;
              }
              try {
                setPhoto(await preparePhoto(selected));
              } catch (error) {
                setPhoto(undefined);
                setPhotoError(error instanceof Error ? error.message : "No pudimos preparar la foto.");
                event.currentTarget.value = "";
              }
            }}
          />
        </label>
        <small className="tiny">
          {photo
            ? `Se guardará ${photo.name} como foto de la actividad.`
            : activity?.profilePhoto
              ? "La foto actual se conservará si no elegís otra."
              : "Esta foto es independiente de las galerías de cada salida."}
        </small>
        {photoError && <p className="form-error">{photoError}</p>}
        <fieldset className="tag-picker">
          <legend>Categoría</legend>
          <div className="tag-options">
            {roots.map((value) => (
              <label className="tag-option" key={value.id}>
                <input
                  type="radio"
                  name="category"
                  checked={categoryId === value.id}
                  onChange={() => {
                    setCategoryId(value.id);
                    setSubcategoryId(undefined);
                  }}
                />
                <span>{value.icon} {value.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="tag-picker" disabled={!categoryId}>
          <legend>Subcategoría</legend>
          <div className="tag-options">
            {children.map((value) => (
              <label className="tag-option" key={value.id}>
                <input
                  type="radio"
                  name="subcategory"
                  checked={subcategoryId === value.id}
                  onChange={() => setSubcategoryId(value.id)}
                />
                <span>{value.icon} {value.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="tag-picker">
          <legend>Horarios <small className="tiny">Opcional</small></legend>
          {schedules.map((schedule, index) => (
            <div className="form-columns" key={`${schedule.dayOfWeek}-${index}`}>
              <label>
                Día
                <select
                  value={schedule.dayOfWeek}
                  onChange={(event) =>
                    setSchedules((current) =>
                      current.map((value, position) =>
                        position === index
                          ? { ...value, dayOfWeek: event.target.value as ActivitySchedule["dayOfWeek"] }
                          : value,
                      ),
                    )
                  }
                >
                  {days.map((day) => <option key={day} value={day}>{dayLabel[day]}</option>)}
                </select>
              </label>
              <label>
                Abre
                <input
                  type="time"
                  value={schedule.opensAt}
                  onChange={(event) =>
                    setSchedules((current) =>
                      current.map((value, position) =>
                        position === index ? { ...value, opensAt: event.target.value } : value,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Cierra
                <input
                  type="time"
                  value={schedule.closesAt}
                  onChange={(event) =>
                    setSchedules((current) =>
                      current.map((value, position) =>
                        position === index ? { ...value, closesAt: event.target.value } : value,
                      ),
                    )
                  }
                />
              </label>
              <button className="text-button" type="button" onClick={() => setSchedules((current) => current.filter((_, position) => position !== index))}>
                × Quitar
              </button>
            </div>
          ))}
          <button className="secondary-button" type="button" onClick={() => setSchedules((current) => [...current, emptySchedule()])}>
            ＋ Agregar horario
          </button>
        </fieldset>
        <button className="main-button" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : activity ? "✓ Guardar actividad" : "＋ Agregar actividad"}
        </button>
        {mutation.error && <p className="form-error">{mutation.error.message}</p>}
      </form>
    </Modal>
  );
}
