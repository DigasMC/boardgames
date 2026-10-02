import { AuthFormSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <AuthFormSkeleton />
      </div>
    </div>
  );
}
