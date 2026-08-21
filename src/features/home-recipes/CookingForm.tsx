import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { showNotice } from "../../lib/flash";
import type { Cooking, Home, MealType, Recipe } from "../../types/domain";
import { createCooking, deleteCooking, updateCooking } from "./homeRecipes";

const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const meals: { value: MealType; label: string }[] = [{ value: "DESAYUNO", label: "Desayuno" }, { value: "ALMUERZO", label: "Almuerzo" }, { value: "MERIENDA", label: "Merienda" }, { value: "CENA", label: "Cena" }];

export function CookingForm({ recipe, cooking, onClose, onSaved }: { recipe: Recipe; cooking?: Cooking; onClose: () => void; onSaved: (cooking: Cooking) => void }) {
  const qc = useQueryClient();
  const [home, setHome] = useState<Home>(cooking?.home ?? "TOMAS");
  const [cookedOn, setCookedOn] = useState(cooking?.cookedOn ?? today());
  const [mealType, setMealType] = useState<MealType>(cooking?.mealType ?? "CENA");
  const [servings, setServings] = useState(cooking?.servings ?? 2);
  const [confirming, setConfirming] = useState(false);
  const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: ["cookings"] }), qc.invalidateQueries({ queryKey: ["recipe", recipe.id] }), qc.invalidateQueries({ queryKey: ["recipes"] })]);
  const mutation = useMutation({ mutationFn: () => cooking ? updateCooking(cooking.id, { home, cookedOn, mealType, servings }) : createCooking(recipe.id, { home, cookedOn, mealType, servings }), onSuccess: async (saved) => { await invalidate(); showNotice(cooking ? "Actualizamos la cocinada." : "Cocinada registrada. Ya pueden sumar reseñas."); onSaved(saved); onClose(); } });
  const remove = useMutation({ mutationFn: () => deleteCooking(cooking!.id), onSuccess: async () => { await invalidate(); showNotice("Eliminamos la cocinada."); onClose(); } });
  if (confirming && cooking) return <ConfirmDialog title="¿Borrar esta cocinada?" message="También se eliminarán sus reseñas." confirmLabel="Borrar cocinada" pending={remove.isPending} onClose={() => setConfirming(false)} onConfirm={() => remove.mutate()} />;
  return <Modal onClose={onClose} confirmDiscard pending={mutation.isPending || remove.isPending}><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><p className="eyebrow">{cooking ? "EDITAR COCINADA" : "NUEVA COCINADA"}</p><h2>{recipe.name}</h2><fieldset className="home-picker"><legend>¿En qué casa?</legend>{(["TOMAS", "AVRIL"] as Home[]).map((value) => <label key={value}><input type="radio" checked={home === value} onChange={() => setHome(value)} /><span>{value === "TOMAS" ? "🏠 Casa de Tomás" : "🏡 Casa de Avril"}</span></label>)}</fieldset><div className="form-columns"><label>Fecha<input type="date" max={today()} value={cookedOn} onChange={(event) => setCookedOn(event.target.value)} required /></label><label>Comida<select value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>{meals.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}</select></label></div><label>Porciones<input type="number" min="1" max="100" value={servings} onChange={(event) => setServings(Number(event.target.value))} required /></label><Button icon={cooking ? "💾" : "📅"} disabled={mutation.isPending || remove.isPending}>{mutation.isPending ? "Guardando…" : cooking ? "Guardar cocinada" : "Registrar cocinada"}</Button>{cooking && <Button variant="destructive" icon="🗑️" type="button" onClick={() => setConfirming(true)}>Borrar cocinada</Button>}{(mutation.error || remove.error) && <p className="form-error">{(mutation.error || remove.error)!.message}</p>}</form></Modal>;
}
