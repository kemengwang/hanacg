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
  region: 'all',
};
const newestYear = new Date().getFullYear() + 1;
const years = Array.from({ length: 11 }, (_, i) => newestYear - i);
const oldestYear = years[years.length - 1]!;
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
  const [filters, setFilters] = useState(initialFilters);
  const feed = useDiscovery(repository, 'ranking', keyword, refresh, filters.region);
  const update = <K extends keyof DiscoveryQuery>(key: K, value: DiscoveryQuery[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const filtered = filterAnime(feed.items, {
    ...filters,
    year: filters.year === -1 ? 0 : filters.year,
    yearBefore: filters.year === -1 ? oldestYear : undefined,
    keyword: feed.error ? keyword : '',
  });
  const hasFilters =
    filters.region !== 'all' ||
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
        <FilterRow<NonNullable<DiscoveryQuery['region']>>
          label="地区"
          value={filters.region || 'all'}
          onChange={(value) => update('region', value)}
          options={[
            { value: 'all', label: '全部地区' },
            { value: 'japan', label: '日漫' },
            { value: 'china', label: '国漫' },
            { value: 'western', label: '欧美' },
            { value: 'korea', label: '韩漫' },
            { value: 'other', label: '其他' },
            { value: 'unknown', label: '未标注' },
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
            { value: -1, label: `${oldestYear - 1} 及以前` },
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
          {feed.error
            ? '本地精选 · 筛选当前条目'
            : `${keyword ? '搜索结果' : '高分列表'} · 地区筛选全库，其他条件筛选当前条目`}
          {!feed.error && '（最多 24 部）'}
        </p>
      </div>
      {!persistent && (
        <div className="data-notice" role="status">
          浏览器不允许保存数据，本次追番仅在当前页面保留。
        </div>
      )}
      {feed.error && (
        <div className="data-notice" role="status">
          <span>暂时无法连接资料库，以下为本地精选中的结果。</span>
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
