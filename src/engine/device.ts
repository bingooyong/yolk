import { useEffect, useState } from "react";

export type Quality = "low" | "medium" | "high";

export type DeviceProfile = {
  iPhone: boolean;
  iPad: boolean;
  ios: boolean;
  touchUI: boolean;
  quality: Quality;
  portrait: boolean;
  coarse: boolean;
};

function read(): DeviceProfile {
  if (typeof window === "undefined") {
    return {
      iPhone: false,
      iPad: false,
      ios: false,
      touchUI: false,
      quality: "high",
      portrait: false,
      coarse: false,
    };
  }

  const ua = navigator.userAgent;
  const iPhone = /iPhone/.test(ua);
  const iPad =
    /iPad/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const ios = iPhone || iPad || /iPod/.test(ua);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const touchUI =
    coarse || ios || navigator.maxTouchPoints > 1 || window.innerWidth < 1100;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  let quality: Quality = "high";
  if (iPhone) quality = cores <= 4 ? "low" : "medium";
  else if (iPad) quality = cores <= 4 ? "medium" : "high";
  else if (coarse && window.innerWidth < 500) quality = "medium";
  if (mem !== undefined && mem <= 4) {
    quality = quality === "high" ? "medium" : "low";
  }

  return {
    iPhone,
    iPad,
    ios,
    touchUI,
    quality,
    portrait: window.innerHeight >= window.innerWidth,
    coarse,
  };
}

export function readDevice() {
  return read();
}

export function useDevice(): DeviceProfile {
  const [profile, setProfile] = useState(read);
  useEffect(() => {
    const up = () => setProfile(read());
    window.addEventListener("resize", up);
    window.addEventListener("orientationchange", up);
    const mq = window.matchMedia("(pointer: coarse)");
    mq.addEventListener("change", up);
    return () => {
      window.removeEventListener("resize", up);
      window.removeEventListener("orientationchange", up);
      mq.removeEventListener("change", up);
    };
  }, []);
  return profile;
}
