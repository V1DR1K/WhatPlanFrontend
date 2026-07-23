import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useDeferredValue, useState } from "react";
import { mediaUrl } from "../../lib/api";
import type { Home } from "../../types/domain";
import { RecipeForm } from "./RecipeForm";
import { EntityCreateButton } from "../../components/ui/EntityCreateButton";
import { getCookings, getRecipes } from "./homeRecipes";

export function HomeRecipesPage() {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [home, setHome] = useState<Home | "ALL">("ALL");
  const deferredSearch = useDeferredValue(search);
  const recipes = useQuery({
    queryKey: ["recipes", deferredSearch],
    queryFn: () => getRecipes(deferredSearch || undefined),
  });
  const cookings = useQuery({ queryKey: ["cookings"], queryFn: () => getCookings() });
  const cookingsByRecipe = new Map<number, Home[]>();
  for (const cooking of cookings.data ?? []) {
    const homes = cookingsByRecipe.get(cooking.recipe.id) ?? [];
    if (!homes.includes(cooking.home)) homes.push(cooking.home);
    cookingsByRecipe.set(cooking.recipe.id, homes);
  }
  const visibleRecipes = (recipes.data ?? []).filter((recipe) => home === "ALL" || cookingsByRecipe.get(recipe.id)?.includes(home));

  return (
    <section className="home-recipes">
      <section className="home-recipes__hero">
        <div>
          <p className="eyebrow">WHOCOOK · RECETAS PARA REPETIR</p>
          <h1>¿Qué <em>cocinamos</em> hoy?</h1>
          <p>Guarden una receta una vez y registren cada cocinada con sus propios recuerdos.</p>
        </div>
        <span aria-hidden="true">🍳</span>
      </section>
      <nav className="quick-nav quick-nav-action">
        <EntityCreateButton
          eyebrow="Nueva receta"
          icon="🍳"
          label="Agregar receta"
          onClick={() => setCreating(true)}
        />
      </nav>
      <label className="home-recipe-search">
        Buscar receta
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej. risotto, pasta, arroz…" />
      </label>
      <section className="home-recipe-section">
        <div className="section-title">
          <div><p className="eyebrow">CATÁLOGO COMPARTIDO</p><h2>Recetas guardadas</h2></div>
          <strong>{visibleRecipes.length} recetas</strong>
        </div>
        <div className="home-recipe-home-filters" aria-label="Filtrar recetas por casa">
          <button aria-pressed={home === "ALL"} className={home === "ALL" ? "selected" : ""} type="button" onClick={() => setHome("ALL")}>Todas</button>
          <button aria-pressed={home === "TOMAS"} className={home === "TOMAS" ? "selected" : ""} type="button" onClick={() => setHome("TOMAS")}>🏠 Tomás</button>
          <button aria-pressed={home === "AVRIL"} className={home === "AVRIL" ? "selected" : ""} type="button" onClick={() => setHome("AVRIL")}>🏡 Avril</button>
        </div>
        {recipes.isError ? <p className="form-error">{recipes.error.message}</p> : recipes.isLoading || cookings.isLoading ? <p className="muted" aria-busy="true">Cargando recetas…</p> : visibleRecipes.length ? (
          <div className="home-recipe-grid">
            {visibleRecipes.map((recipe) => {
              const photo = recipe.thumbnailUrl ?? recipe.photoUrl;
              const homes = cookingsByRecipe.get(recipe.id) ?? [];
              return (
                <Link className="home-recipe-card-link" key={recipe.id} to={`/how-cook/${recipe.id}`}>
                  <article className="home-recipe-card">
                    {photo ? <img className="home-recipe-card__image" src={mediaUrl(photo)} alt={`Foto de ${recipe.name}`} loading="lazy" /> : <div className="home-recipe-card__empty">🍲</div>}
                    <div className="home-recipe-card__body">
                      <div className="home-recipe-card__heading">
                        <div><p>{recipe.ingredients.length} ingredientes · {recipe.steps.length} pasos</p><h3>{recipe.name}</h3></div>
                      </div>
                      <footer className="recipe-card-actions"><small>{homes.length ? homes.map((value) => value === "TOMAS" ? "🏠 Tomás" : "🏡 Avril").join(" · ") : "Sin cocinadas"}</small><span>Ver receta →</span></footer>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        ) : <p className="empty-state">{home === "ALL" ? "Todavía no hay recetas. Agreguen la primera para poder repetirla." : "Todavía no hay recetas registradas para esta casa."}</p>}
      </section>
      {creating && <RecipeForm onClose={() => setCreating(false)} />}
    </section>
  );
}
