import { useEffect, useState } from "react";
import { Assets, Texture } from "pixi.js";
import { getAllStalkerAssetPaths } from "@/constants/stalkerFloorLayout";

export function useBuggyTextures(): {
  textures: Map<string, Texture>;
  loaded: boolean;
  loadError: string | null;
  missingCount: number;
} {
  const [textures, setTextures] = useState<Map<string, Texture>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [missingCount, setMissingCount] = useState(0);

  useEffect(() => {
    const paths = getAllStalkerAssetPaths();
    let cancelled = false;

    const load = async () => {
      const map = new Map<string, Texture>();
      let missing = 0;
      await Promise.all(
        paths.map(async (path) => {
          try {
            const texture = await Assets.load<Texture>(path);
            if (!cancelled) {
              map.set(path, texture);
            }
          } catch {
            missing += 1;
          }
        }),
      );
      if (!cancelled) {
        setTextures(map);
        setMissingCount(missing);
        if (missing > 0 && map.size === 0) {
          setLoadError(
            "Buggy 에셋을 불러오지 못했습니다. buggy/ 링크를 확인하세요.",
          );
        } else if (missing > 0) {
          setLoadError(`${missing}개 에셋 누락 (일부만 표시)`);
        } else {
          setLoadError(null);
        }
        setLoaded(true);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { textures, loaded, loadError, missingCount };
}
