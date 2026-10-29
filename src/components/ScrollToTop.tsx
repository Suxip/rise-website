import {useEffect} from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
    const {pathname: urlLink} = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [urlLink]);

  return null;
}