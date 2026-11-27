import { Suspense } from "react";
import { CollectionView } from "@/components/CollectionView";
import { CollectionPageSkeleton } from "@/components/skeletons";

/** Shell only — collection data hydrates from IndexedDB (local-first). */
export default function CollectionPage() {
  return (
    <Suspense fallback={<CollectionPageSkeleton />}>
      <CollectionView />
    </Suspense>
  );
}
