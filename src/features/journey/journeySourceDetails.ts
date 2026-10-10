import { getFilm } from "../films/films";
import { getRecipe } from "../home-recipes/homeRecipes";
import { getPlace } from "../places/places";
import { getActivity } from "../why-fun/whyFun";
import type { JourneyPointAction, Source } from "./journey";

export type JourneySourceDetails = {
  address?: string | null;
  mapsUrl?: string | null;
  actions: JourneyPointAction[];
};

export async function getJourneySourceDetails(source: Source): Promise<JourneySourceDetails> {
  switch (source.section) {
    case "FOOD": {
      const place = await getPlace(source.entityId);
      return {
        address: place.address,
        mapsUrl: place.mapsUrl,
        actions: place.sourceUrl
          ? [{ label: "Ver referencia", icon: "WEB", url: place.sourceUrl }]
          : [],
      };
    }
    case "FILM": {
      const film = await getFilm(source.entityId);
      const actions: JourneyPointAction[] = [];
      if (film.tmdb?.trailerUrl) {
        actions.push({ label: "Ver tráiler", icon: "FILM", url: film.tmdb.trailerUrl });
      }
      if (film.tmdbId) {
        actions.push({
          label: "Ver en TMDB",
          icon: "WEB",
          url: `https://www.themoviedb.org/movie/${film.tmdbId}`,
        });
      }
      return { actions };
    }
    case "COOK": {
      const recipe = await getRecipe(source.entityId);
      return {
        actions: recipe.sourceUrl
          ? [{ label: "Ver fuente original", icon: "WEB", url: recipe.sourceUrl }]
          : [],
      };
    }
    case "FUN": {
      const activity = await getActivity(source.entityId);
      return { address: activity.address, actions: [] };
    }
  }
}
