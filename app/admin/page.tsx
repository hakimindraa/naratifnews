import { FileText, Clock, Settings, Trash2 } from "lucide-react";
import UploadButton from "./UploadButton";
import DeleteButton from "./DeleteButton";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { desc } from "drizzle-orm";

export const instant = false;

export default async function AdminDashboard() {
  const dbArticles = await db.select().from(articles).orderBy(desc(articles.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Dashboard Redaksi</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola dan terbitkan artikel Naratif.</p>
        </div>
        <UploadButton />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Daftar Artikel ({dbArticles.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Judul Artikel</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Waktu Terbit</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dbArticles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Belum ada artikel yang diunggah. Silakan upload file .md Anda.
                  </td>
                </tr>
              ) : (
                dbArticles.map((article) => (
                  <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="line-clamp-1">{article.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      {article.category}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        article.status === 'published' ? 'bg-green-100 text-green-700' :
                        article.status === 'scheduled' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {article.publishAt ? new Date(article.publishAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short'}) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end items-center gap-1">
                      <a href={`/admin/edit/${article.id}`} className="text-gray-400 hover:text-blue-600 p-2 transition-colors" title="Edit Artikel">
                        <Settings className="w-4 h-4" />
                      </a>
                      <DeleteButton id={article.id} title={article.title} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
