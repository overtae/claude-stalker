import { useEffect, useState } from "react";
import { Assets, Texture } from "pixi.js";
import {
  FREE_ISO_FLOOR_ACCENTS,
  FREE_ISO_PROPS,
} from "@/constants/freeIsoDecor";

export function useFreeIsoTextures(): {
  textures: Map<string, Texture>;
  loaded: boolean;
} {
  const [textures, setTextures] = useState<Map<string, Texture>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const paths = [
      ...FREE_ISO_PROPS.map((p) => p.texturePath),
      ...FREE_ISO_FLOOR_ACCENTS.map((p) => p.texturePath),
    ];
    const unique = [...new Set(paths)];

    let cancelled = false;

    const load = async () => {
      const map = new Map<string, Texture>();
      await Promise.all(
        unique.map(async (path) => {
          const texture = await Assets.load<Texture>(path);
          if (!cancelled) {
            map.set(path, texture);
          }
        }),
      );
      if (!cancelled) {
        setTextures(map);
        setLoaded(true);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { textures, loaded };
}
