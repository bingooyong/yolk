import { createFileRoute, notFound } from "@tanstack/react-router";
import { DeveloperSkinPreview } from "@/components/DeveloperSkinPreview";
import { SKINS } from "@/game/skins";

/**
 * Dev-only skin preview route.
 *
 * URL: /dev/skin-preview?skin=<skinId>
 *
 * Guarded by `import.meta.env.DEV`. In a production build the route still
 * exists (TanStack Start compiles every file) but `beforeLoad` returns
 * `notFound()`, so the link 404s without exposing dev tooling to players.
 *
 * The Preview surface itself is R3F + GLTFLoader; the production bundle
 * tree-shakes both when this route never renders. The static `SKINS` array
 * is imported for parameter validation but does not pull the renderer into
 * the main game chunk.
 */
export const Route = createFileRoute("/dev/skin-preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    skin:
      typeof search.skin === "string" && search.skin.length > 0
        ? search.skin
        : "egg_demo_model",
  }),
  beforeLoad: ({ search }) => {
    if (!import.meta.env.DEV) {
      throw notFound();
    }
    if (!SKINS.find((s) => s.id === search.skin)) {
      throw notFound();
    }
  },
  component: PreviewPage,
});

function PreviewPage() {
  const { skin } = Route.useSearch();
  return <DeveloperSkinPreview skinId={skin} />;
}
