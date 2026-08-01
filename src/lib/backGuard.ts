import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useInAppBackGuard(homePath: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const seeded = useRef(false);
  useLayoutEffect(() => {
    if (seeded.current || location.pathname === homePath || location.state?.whatplanBackGuard) return;
    seeded.current = true;
    const state = { whatplanBackGuard: true };
    navigate(homePath, { replace: true, state });
    navigate(location.pathname + location.search + location.hash, { state });
  }, [navigate, homePath, location.hash, location.pathname, location.search, location.state]);
}
