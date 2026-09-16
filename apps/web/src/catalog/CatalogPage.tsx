import { useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { filterAnime, type Anime, type DiscoveryQuery } from '@hanacg/domain';
import type { DiscoveryRepository } from '@hanacg/api-client';
import { useDiscovery } from '@hanacg/feature-core';
import { AnimeCard, Button, EmptyState } from '@hanacg/ui';
import './catalog.css';
import { FilterRow } from './FilterRow';

const initialFilters: DiscoveryQuery = {
  keyword: '',
  genre: '全部',
  sort: 'recommended',
  year: 0,
  season: 0,
  minScore: 0,
};
const genres = [
  '全部',
  '奇幻',
  '日常',
  '治愈',
  '冒险',
  '青春',
  '悬疑',
  '科幻',
  '搞笑',
  '恋爱',
  '校园',
  '音乐',
  '运动',
  '战斗',
  '机战',
];

export function CatalogPage({
  repository,
  keyword,
  saved,
  onOpen,
  onToggleSave,
  onClearSearch,
  persistent,
}: {
  repository: DiscoveryRepository;
  keyword: string;
  saved: readonly Anime[];
  onOpen: (anime: Anime) => void;
  onToggleSave: (anime: Anime) => void;
  onClearSearch: () => void;
  persistent: boolean;
}) {
  const [refresh, setRefresh] = useState(0);
  const feed = useDiscovery(repository, 'ranking', keyword, refresh);
  const [filters, setFilters] = useState(initialFilters);
  const update = <K extends keyof DiscoveryQuery>(key: K, value: DiscoveryQuery[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const filtered = filterAnime(feed.items, { ...filters, keyword: feed.error ? keyword : '' });
  const years = [...new Set([...feed.items.map((anime) => anime.year), filters.year || 0])]
    .filter(Boolean)
    .sort((a, b) => b - a);
  const hasFilters =
    filters.genre !== '全部' ||
    filters.sort !== 'recommended' ||
    filters.year ||
    filters.season ||
    filters.minScore;
  return (
    <section className="catalog-page" aria-label="番剧目录">
      <div className="page-heading">
        <div>
          <h1>番剧</h1>
          <p>从一种心情，找到下一段故事。</p>
        </div>
        {hasFilters ? (
          <button className="catalog-reset" onClick={() => setFilters(initialFilters)}>
            <RotateCcw size={13} />
            重置筛选
          </button>
        ) : null}
      </div>
      <div className="catalog-filters">
        <FilterRow<DiscoveryQuery['sort']>
          label="排序"
          value={filters.sort}
          onChange={(value) => update('sort', value)}
          options={[
            { value: 'recommended', label: keyword ? '相关程度' : '综合排序' },
            { value: 'score', label: '最高评分' },
            { value: 'year', label: '最新年份' },
          ]}
        />
        <FilterRow
          label="风格"
          value={filters.genre}
          onChange={(value) => update('genre', value)}
          options={genres.map((value) => ({ value, label: value === '全部' ? '全部风格' : value }))}
        />
        <FilterRow
          label="年份"
          value={filters.year || 0}
          onChange={(value) => update('year', value)}
          options={[
            { value: 0, label: '全部年份' },
            ...years.map((value) => ({ value, label: `${value}` })),
          ]}
        />
        <FilterRow
          label="季度"
          value={filters.season || 0}
          onChange={(value) => update('season', value)}
          options={[
            { value: 0, label: '全部季度' },
            { value: 1, label: '1–3 月' },
            { value: 2, label: '4–6 月' },
            { value: 3, label: '7–9 月' },
            { value: 4, label: '10–12 月' },
          ]}
        />
        <FilterRow
          label="评分"
          value={filters.minScore || 0}
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
        <h2>{keyword ? `“${keyword}”的搜索结果` : '发现好故事'}</h2>
        <span role="status">{feed.loading ? '正在加载…' : `${filtered.length} 部番剧`}</span>
        <p>
          {feed.error ? '本地精选' : keyword ? 'Bangumi 搜索结果' : 'Bangumi 高分列表'} ·
          筛选当前已加载条目{!feed.error && '（最多 24 部）'}
        </p>
      </div>
      {!persistent && (
        <div className="data-notice" role="status">
          浏览器不允许保存数据，本次追番仅在当前页面保留。
        </div>
      )}
      {feed.error && (
        <div className="data-notice" role="status">
          <span>暂时无法连接 Bangumi，以下为本地精选中的结果。</span>
          <button onClick={() => setRefresh((value) => value + 1)}>重新加载</button>
        </div>
      )}
      {feed.loading ? (
        <div className="anime-grid" aria-label="正在加载番剧" role="status">
          {Array.from({ length: 12 }, (_, index) => (
            <div className="skeleton-card" key={index}>
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : filtered.length ? (
        <div className="anime-grid">
          {filtered.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              saved={saved.some((item) => item.id === anime.id)}
              onOpen={onOpen}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search />}
          title="还没有找到这部番剧"
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
