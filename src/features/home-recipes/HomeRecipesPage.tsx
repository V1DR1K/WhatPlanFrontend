import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useDeferredValue, useState } from "react";
import { mediaUrl } from "../../lib/api";
import { RecipeForm } from "./RecipeForm";
import { getCookings, getRecipes } from "./homeRecipes";

const mealName = (meal: string) =>
  ({ DESAYUNO: "Desayuno", ALMUERZO: "Almuerzo", MERIENDA: "Merienda", CENA: "Cena" })[
    meal as "DESAYUNO"
  ] ?? meal;

export function HomeRecipesPage() {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const recipes = useQuery({
    queryKey: ["recipes", deferredSearch],
    queryFn: () => getRecipes(deferredSearch || undefined),
  });
  const cookings = useQuery({ queryKey: ["cookings"], queryFn: () => getCookings() });

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
        <button className="add-cook-button" type="button" onClick={() => setCreating(true)}>
          <span className="add-cook-icon">＋</span>
          <span><small>NUEVA RECETA</small>Agregar receta</span>
          <b>🥘</b>
        </button>
      </nav>
      <label className="home-recipe-search">
        Buscar receta
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej. risotto, pasta, arroz…" />
      </label>
      <section className="home-recipe-section">
        <div className="section-title">
          <div><p className="eyebrow">CATÁLOGO COMPARTIDO</p><h2>Recetas guardadas</h2></div>
          <strong>{recipes.data?.length ?? 0} recetas</strong>
        </div>
        {recipes.isError ? <p className="form-error">{recipes.error.message}</p> : recipes.isLoading ? <p className="muted" aria-busy="true">Cargando recetas…</p> : recipes.data?.length ? (
          <div className="home-recipe-grid">
            {recipes.data.map((recipe) => {
              const photo = recipe.thumbnailUrl ?? recipe.photoUrl;
              return (
                <Link className="home-recipe-card-link" key={recipe.id} to={`/how-cook/${recipe.id}`}>
                  <article className="home-recipe-card">
                    {photo ? <img className="home-recipe-card__image" src={mediaUrl(photo)} alt={`Foto de ${recipe.name}`} loading="lazy" /> : <div className="home-recipe-card__empty">🍲</div>}
                    <div className="home-recipe-card__body">
                      <div className="home-recipe-card__heading">
                        <div><p>{recipe.ingredients.length} ingredientes · {recipe.steps.length} pasos</p><h3>{recipe.name}</h3></div>
                      </div>
                      <footer className="recipe-card-actions"><small>Creada por {recipe.createdBy}</small><span>Ver receta →</span></footer>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        ) : <p className="empty-state">Todavía no hay recetas. Agreguen la primera para poder repetirla.</p>}
      </section>
      <section className="home-recipe-section">
        <div className="section-title">
          <div><p className="eyebrow">ÚLTIMAS COCINADAS</p><h2>Lo que salió de la cocina</h2></div>
          <strong>{cookings.data?.length ?? 0} cocinadas</strong>
        </div>
        {cookings.isError ? <p className="form-error">{cookings.error.message}</p> : cookings.isLoading ? <p className="muted" aria-busy="true">Cargando cocinadas…</p> : cookings.data?.length ? (
          <div className="home-recipe-grid">
            {cookings.data.map((cooking) => (
              <Link className="home-recipe-card-link" key={cooking.id} to={`/how-cook/${cooking.recipe.id}`}>
                <article className="home-recipe-card">
                  {cooking.coverPhoto ? <img className="home-recipe-card__image" src={mediaUrl(cooking.coverPhoto.thumbnailUrl || cooking.coverPhoto.url)} alt={`Cocinada de ${cooking.recipe.name}`} loading="lazy" /> : <div className="home-recipe-card__empty">🍳</div>}
                  <div className="home-recipe-card__body">
                    <div className="home-recipe-card__heading"><div><p>{mealName(cooking.mealType)} · {cooking.home === "TOMAS" ? "Casa de Tomás" : "Casa de Avril"}</p><h3>{cooking.recipe.name}</h3></div></div>
                    <footer className="recipe-card-actions"><small>{cooking.cookedOn}</small><span>Ver receta →</span></footer>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : <p className="empty-state">Todavía no registraron una cocinada.</p>}
      </section>
      {creating && <RecipeForm onClose={() => setCreating(false)} />}
    </section>
  );
}
