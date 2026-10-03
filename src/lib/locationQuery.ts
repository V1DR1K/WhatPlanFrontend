import {
  useQuery as useBaseQuery,
  type UseQueryOptions,
  type QueryKey,
} from "@tanstack/react-query";
import { useZoneContext } from "./zoneContext";
export function useQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
>(options: UseQueryOptions<TQueryFnData, TError, TData, QueryKey>) {
  const { coupleId, selectedZoneId } = useZoneContext();
  const prefix = String(options.queryKey[0]);
  const cityScoped = [
    "places",
    "films",
    "recipes",
    "cookings",
    "activities",
    "when-dates",
    "when-date",
  ].includes(prefix);
  return useBaseQuery({
    ...options,
    queryKey: [
      ...options.queryKey,
      { coupleId, ...(cityScoped ? { cityId: selectedZoneId } : {}) },
    ],
  });
}
