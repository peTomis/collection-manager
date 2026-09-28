import { useState, useEffect } from "react";

export function useIsLg() {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsLg(window.innerWidth >= 1024); // Tailwind's lg is 1024px by default
    };

    checkSize();
    window.addEventListener("resize", checkSize);

    return () => window.removeEventListener("resize", checkSize);
  }, []);

  return isLg;
}

export function useIsXl() {
  const [isXl, useIsXl] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      useIsXl(window.innerWidth >= 1280); // Tailwind's xl is 1280px by default
    };

    checkSize();
    window.addEventListener("resize", checkSize);

    return () => window.removeEventListener("resize", checkSize);
  }, []);

  return isXl;
}

export function useIs2xl() {
  const [is2xl, setIs2xl] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIs2xl(window.innerWidth >= 1536); // Tailwind's 2xl is 1536px by default
    };

    checkSize();
    window.addEventListener("resize", checkSize);

    return () => window.removeEventListener("resize", checkSize);
  }, []);

  return is2xl;
}
