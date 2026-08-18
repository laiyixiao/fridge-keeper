"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteFoodButton({ id }: { id: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function remove() {
    if (!confirm("确定删除这样食材吗？")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/foods/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/");
      router.refresh();
    } catch {
      setDeleting(false);
      alert("删除失败，请稍后再试");
    }
  }

  return (
    <button onClick={remove} disabled={deleting} className="btn btn-danger w-full">
      {deleting ? "删除中…" : "删除"}
    </button>
  );
}
