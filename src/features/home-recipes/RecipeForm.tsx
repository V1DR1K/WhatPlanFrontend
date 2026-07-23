import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { showNotice } from "../../lib/flash";
import { photoInputAccept, preparePhoto } from "../../lib/photos";
import type { Recipe, RecipeIngredient, RecipeStep } from "../../types/domain";
import { saveRecipe, uploadRecipePhoto } from "./homeRecipes";

const emptyIngredient = (): RecipeIngredient => ({ name: "", quantity: 1, unit: "unidad" });
const emptyStep = (): RecipeStep => ({ instruction: "" });

export function RecipeForm({ recipe, onClose }: { recipe?: Recipe; onClose: () => void }) {
  const qc = useQueryClient();
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    recipe?.ingredients.length ? recipe.ingredients : [emptyIngredient()],
  );
  const [steps, setSteps] = useState<RecipeStep[]>(
    recipe?.steps.length ? recipe.steps : [emptyStep()],
  );
  const [photo, setPhoto] = useState<File>();
  const [photoError, setPhotoError] = useState<string>();
  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const cleanIngredients = ingredients
        .filter((item) => item.name.trim())
        .map((item) => ({ ...item, name: item.name.trim() }));
      const cleanSteps = steps
        .filter((step) => step.instruction.trim())
        .map((step) => ({ instruction: step.instruction.trim() }));
      if (!cleanIngredients.length || !cleanSteps.length) {
        throw new Error("Agregá al menos un ingrediente y un paso.");
      }
      return saveRecipe(
        {
          name: String(form.get("name")).trim(),
          sourceUrl: String(form.get("sourceUrl")).trim() || undefined,
          ingredients: cleanIngredients,
          steps: cleanSteps,
        },
        recipe?.id,
      );
    },
    onSuccess: async (saved) => {
      let photoUploadError: string | undefined;
      if (photo) {
        try {
          await uploadRecipePhoto(saved.id, photo);
        } catch (error) {
          photoUploadError = error instanceof Error
            ? `La receta se guardó, pero no pudimos subir la foto: ${error.message}`
            : "La receta se guardó, pero no pudimos subir la foto.";
        }
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["recipes"] }),
        qc.invalidateQueries({ queryKey: ["recipe", saved.id] }),
      ]);
      showNotice(photoUploadError ?? (recipe
        ? "Actualizamos la receta compartida."
        : "Receta guardada. Ya pueden registrar una cocinada."), photoUploadError ? "error" : "success");
      onClose();
    },
  });

  return (
    <Modal onClose={onClose} confirmDiscard pending={mutation.isPending}>
      <form
        className="home-recipe-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(new FormData(event.currentTarget));
        }}
      >
        <p className="eyebrow">{recipe ? "EDITAR RECETA" : "NUEVA RECETA"}</p>
        <h2>{recipe ? "Ajustemos la receta" : "¿Qué quieren cocinar?"}</h2>
        <label>
          Nombre
          <input name="name" defaultValue={recipe?.name} required autoFocus />
        </label>
        <label>
          Fuente <small className="tiny">Opcional</small>
          <input name="sourceUrl" type="url" defaultValue={recipe?.sourceUrl ?? undefined} placeholder="https://…" />
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
            ? `Se guardará ${photo.name} como foto de la receta.`
            : recipe?.photoUrl
              ? "La foto actual se conservará si no elegís otra."
              : "Esta foto es independiente de cada galería de cocinadas."}
        </small>
        {photoError && <p className="form-error">{photoError}</p>}
        <fieldset className="ingredient-fields">
          <legend>Ingredientes</legend>
          {ingredients.map((ingredient, index) => (
            <div className="ingredient-row ingredient-row--units" key={index}>
              <label>
                Cantidad
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={ingredient.quantity}
                  onChange={(event) =>
                    setIngredients((current) =>
                      current.map((value, position) =>
                        position === index ? { ...value, quantity: Number(event.target.value) } : value,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Unidad
                <input
                  value={ingredient.unit}
                  maxLength={30}
                  onChange={(event) =>
                    setIngredients((current) =>
                      current.map((value, position) =>
                        position === index ? { ...value, unit: event.target.value } : value,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Ingrediente
                <input
                  value={ingredient.name}
                  maxLength={160}
                  onChange={(event) =>
                    setIngredients((current) =>
                      current.map((value, position) =>
                        position === index ? { ...value, name: event.target.value } : value,
                      ),
                    )
                  }
                />
              </label>
              <Button variant="tertiary" icon="✕" type="button" onClick={() => setIngredients((current) => current.filter((_, position) => position !== index))}>
                Quitar
              </Button>
            </div>
          ))}
          <Button variant="secondary" icon="➕" type="button" onClick={() => setIngredients((current) => [...current, emptyIngredient()])}>
            Agregar ingrediente
          </Button>
        </fieldset>
        <fieldset className="ingredient-fields">
          <legend>Pasos</legend>
          {steps.map((step, index) => (
            <div className="recipe-step-input" key={index}>
              <label>
                Paso {index + 1}
                <textarea
                  value={step.instruction}
                  maxLength={2000}
                  onChange={(event) =>
                    setSteps((current) =>
                      current.map((value, position) =>
                        position === index ? { instruction: event.target.value } : value,
                      ),
                    )
                  }
                />
              </label>
              <Button variant="tertiary" icon="✕" type="button" onClick={() => setSteps((current) => current.filter((_, position) => position !== index))}>
                Quitar
              </Button>
            </div>
          ))}
          <Button variant="secondary" icon="➕" type="button" onClick={() => setSteps((current) => [...current, emptyStep()])}>
            Agregar paso
          </Button>
        </fieldset>
        <Button icon={recipe ? "💾" : "➕"} disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : recipe ? "Guardar receta" : "Agregar receta"}
        </Button>
        {mutation.error && <p className="form-error">{mutation.error.message}</p>}
      </form>
    </Modal>
  );
}
