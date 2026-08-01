import { useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useInAppBackGuard(homePath: string) {
  const navigate = useNavigate();
  const location = useLocation();
  useLayoutEffect(() => {
    if (window.history.state?.key) return;
    navigate(homePath, { replace: true });
    navigate(location.pathname + location.search);
  }, [navigate, homePath, location.pathname, location.search]);
}
