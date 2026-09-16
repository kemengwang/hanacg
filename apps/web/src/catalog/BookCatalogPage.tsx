import { useState } from 'react';
import { BookOpen, RotateCcw, Search } from 'lucide-react';
import { filterBooks, type BookKind, type BookQuery } from '@hanacg/domain';
import type { BookRepository } from '@hanacg/api-client';
import { useBooks } from '@hanacg/feature-core';
import { BookCard, Button, EmptyState } from '@hanacg/ui';
import { FilterRow } from './FilterRow';
import './catalog.css';

const initialFilters: BookQuery = {
  genre: '全部',
  sort: 'recommended',
  year: 0,
  status: 'all',
  minScore: 0,
};
const genres = {
  novel: [
    '全部',
    '奇幻',
    '恋爱',
    '校园',
    '青春',
    '冒险',
    '科幻',
    '悬疑',
    '推理',
    '日常',
    '治愈',
    '历史',
    '轻小说',
  ],
  manga: [
    '全部',
    '热血',
    '奇幻',
    '冒险',
    '恋爱',
    '校园',
    '日常',
    '搞笑',
    '悬疑',
    '科幻',
    '运动',
    '治愈',
    '历史',
  ],
};
export function BookCatalogPage({
  repository,
  kind,
  keyword,
  onClearSearch,
}: {
  repository: BookRepository;
  kind: BookKind;
  keyword: string;
  onClearSearch: () => void;
}) {
  const label = kind === 'novel' ? '小说' : '漫画';
  const [refresh, setRefresh] = useState(0);
  const feed = useBooks(repository, kind, keyword, refresh);
  const [filters, setFilters] = useState(initialFilters);
  const update = <K extends keyof BookQuery>(key: K, value: BookQuery[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const filtered = filterBooks(feed.items, filters);
  const years = [...new Set([...feed.items.map((book) => book.year), filters.year])]
    .filter(Boolean)
    .sort((a, b) => b - a);
  const hasFilters =
    filters.genre !== '全部' ||
    filters.sort !== 'recommended' ||
    filters.year ||
    filters.status !== 'all' ||
    filters.minScore;
  return (
    <section className="catalog-page" aria-label={`${label}目录`}>
      <div className="page-heading">
        <div>
          <h1>{label}</h1>
          <p>
            {kind === 'novel' ? '翻开文字，让想象慢慢展开。' : '在一格一页之间，遇见新的世界。'}
          </p>
        </div>
        {hasFilters ? (
          <button className="catalog-reset" onClick={() => setFilters(initialFilters)}>
            <RotateCcw size={13} />
            重置筛选
          </button>
        ) : null}
      </div>
      <div className="catalog-filters">
        <FilterRow<BookQuery['sort']>
          label="排序"
          value={filters.sort}
          onChange={(value) => update('sort', value)}
          options={[
            { value: 'recommended', label: keyword ? '相关程度' : '综合排序' },
            { value: 'score', label: '最高评分' },
            { value: 'year', label: '最新出版' },
          ]}
        />
        <FilterRow
          label="题材"
          value={filters.genre}
          onChange={(value) => update('genre', value)}
          options={genres[kind].map((value) => ({
            value,
            label: value === '全部' ? '全部题材' : value,
          }))}
        />
        <FilterRow
          label="年份"
          value={filters.year}
          onChange={(value) => update('year', value)}
          options={[
            { value: 0, label: '全部年份' },
            ...years.map((value) => ({ value, label: `${value}` })),
          ]}
        />
        <FilterRow<BookQuery['status']>
          label="状态"
          value={filters.status}
          onChange={(value) => update('status', value)}
          options={[
            { value: 'all', label: '全部状态' },
            { value: '连载中', label: '连载中' },
            { value: '已完结', label: '已完结' },
          ]}
        />
        <FilterRow
          label="评分"
          value={filters.minScore}
          onChange={(value) => update('minScore', value)}
          options={[
            { value: 0, label: '全部评分' },
            { value: 9, label: '9 分及以上' },
            { value: 8, label: '8 分及以上' },
            { value: 7, label: '7 分及以上' },
          ]}
        />
      </div>
      <div className="catalog-results-heading">
        <h2>
          {keyword
            ? `“${keyword}”的搜索结果`
            : kind === 'novel'
              ? '字里行间的好故事'
              : '下一本，想看什么？'}
        </h2>
        <span role="status">
          {feed.loading ? '正在加载…' : feed.error ? '加载失败' : `${filtered.length} 部${label}`}
        </span>
        <p>Bangumi 书籍资料 · 筛选当前已加载条目（最多 24 部）</p>
      </div>
      {feed.loading ? (
        <div className="anime-grid" aria-label={`正在加载${label}`} role="status">
          {Array.from({ length: 12 }, (_, index) => (
            <div className="skeleton-card" key={index}>
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : feed.error ? (
        <EmptyState
          icon={<BookOpen />}
          title={`${label}资料暂时未能加载`}
          description="暂时无法连接 Bangumi，请检查网络后重试。"
          action={<Button onClick={() => setRefresh((value) => value + 1)}>重新加载</Button>}
        />
      ) : filtered.length ? (
        <div className="anime-grid">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search />}
          title={`没有找到符合条件的${label}`}
          description="试试其他关键词，或清除筛选继续浏览。"
          action={
            <Button
              onClick={() => {
                setFilters(initialFilters);
                onClearSearch();
              }}
            >
              清除搜索与筛选
            </Button>
          }
        />
      )}
    </section>
  );
}
