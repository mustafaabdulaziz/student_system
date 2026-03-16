import React, { useState, useEffect } from 'react';
import { NewsItem as NewsItemType, User } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { Newspaper, Plus, Send } from 'lucide-react';

interface NewsAndUpdatesProps {
  currentUser: User | null;
}

export const NewsAndUpdates: React.FC<NewsAndUpdatesProps> = ({ currentUser }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<NewsItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCreate = currentUser && ['ADMIN', 'USER'].includes((currentUser.role || '').toString().toUpperCase());

  const loadNews = async () => {
    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !currentUser?.id || !canCreate) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          createdBy: currentUser.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTitle('');
        setContent('');
        setItems(prev => [{ ...data, createdByName: data.createdByName ?? currentUser.name }, ...prev]);
      } else {
        alert(data.message || 'Failed to create news');
      }
    } catch {
      alert('Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Newspaper size={28} className="text-blue-600" />
          {t.newsAndUpdates}
        </h2>
        <p className="text-gray-500 text-sm mt-1">{t.newsAndUpdatesSubtitle}</p>
      </div>

      {canCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Plus size={20} />
            {t.addNews}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.newsTitle}</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t.newsTitle}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.newsContent}</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                placeholder={t.newsContent}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              {t.save}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <p className="text-gray-500">{t.loading}</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">{t.noNews}</p>
        ) : (
          <ul className="space-y-4">
            {items.map(item => (
              <li key={item.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <h4 className="font-bold text-gray-900 text-lg">{item.title}</h4>
                {item.content && /<[a-z][\s\S]*>/i.test(item.content) ? (
                  <div className="text-gray-600 text-sm mt-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline" dangerouslySetInnerHTML={{ __html: item.content }} />
                ) : (
                  <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{item.content || ''}</p>
                )}
                <p className="text-gray-400 text-xs mt-2">
                  {t.createdBy} {item.createdByName || '—'} · {formatDate(item.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
