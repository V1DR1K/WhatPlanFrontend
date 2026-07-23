import { Button } from "./Button";

export function LoadMore({enabled,onClick,loading,label='Ver más lugares'}:{enabled:boolean;onClick:()=>void;loading:boolean;label?:string}){return enabled?<Button className="load-more" icon="🔽" variant="secondary" type="button" onClick={onClick} disabled={loading}>{loading?'Cargando…':label}</Button>:null}
