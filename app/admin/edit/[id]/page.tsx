import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import EditForm from "./EditForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const instant = false;

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const articleId = parseInt(id, 10);
  
  const article = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  
  if (article.length === 0) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Edit Artikel</h1>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <EditForm article={article[0]} />
      </div>
    </div>
  );
}
