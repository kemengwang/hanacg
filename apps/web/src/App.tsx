import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  History,
  Menu,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { AnimeCard, Button, EmptyState, Poster } from '@hanacg/ui';
import { filterAnime, type Anime, type DiscoveryTab, type ThemePreference } from '@hanacg/domain';
import { createBangumiRepository, curatedAnime } from '@hanacg/api-client';
import { useDiscovery, useSavedAnime, useWatchHistory } from '@hanacg/feature-core';
import { browserNetwork, browserStorage } from './platform';
import { useTheme } from './theme';
import { Modal } from './Modal';
const PlaybackPage = lazy(() =>
  import('./playback/PlaybackPage').then((module) => ({ default: module.PlaybackPage })),
);
import './playback/playback.css';
import { useNavigation } from './playback/navigation';

const repository = createBangumiRepository(
  browserNetwork,
  import.meta.env.VITE_BANGUMI_API_BASE || 'https://api.bgm.tv',
);
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const genres = ['全部', '奇幻', '日常', '治愈', '冒险', '青春', '悬疑', '科幻'];
const tabs: { id: DiscoveryTab; name: string }[] = [
  { id: 'recommended', name: '为你推荐' },
  { id: 'calendar', name: '每日放送' },
  { id: 'ranking', name: '高分佳作' },
];
type Page = 'discover' | 'saved' | 'history';
const heroCopy = [
  {
    line: '在旅途的终点，重新出发。',
    caption: '关于时间、相遇，和那些后知后觉的温柔。',
    image: '/artwork/hero-frieren.jpg',
  },
  {
    line: '冒险，也要好好吃饭。',
    caption: '跟随莱欧斯一行，走进美味又危险的地下城。',
    image: '/artwork/dungeon.jpg',
  },
  {
    line: '从一个人，到一支乐队。',
    caption: '把说不出口的心事，都交给吉他和摇滚。',
    image: '/artwork/bocchi.jpg',
  },
];

export function App() {
  const { route, go } = useNavigation();
  const page = route.page;
  const {
    history,
    save: saveProgress,
    persistent: historyPersistent,
  } = useWatchHistory(browserStorage);
  const [tab, setTab] = useState<DiscoveryTab>('recommended');
  const [collapsed, setCollapsed] = useState(
    () =>
      browserStorage.getItem('hana:sidebar') === 'collapsed' ||
      matchMedia('(max-width: 760px)').matches,
  );
  const [keyword, setKeyword] = useState('');
  const [genre, setGenre] = useState('全部');
  const [sort, setSort] = useState<'recommended' | 'score' | 'year'>('recommended');
  const [weekday, setWeekday] = useState(() => ((new Date().getDay() + 6) % 7) + 1);
  const [heroIndex, setHeroIndex] = useState(0);
  const [watchSeed, setWatchSeed] = useState<Anime>();
  function openAnime(anime: Anime) {
    setWatchSeed(anime);
    go(`/watch/${anime.id}`);
    contentRef.current?.scrollTo({ top: 0 });
    if (matchMedia('(max-width: 760px)').matches) setCollapsed(true);
  }
  const [settings, setSettings] = useState(false);
  const [about, setAbout] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [visible, setVisible] = useState(6);
  const [toast, setToast] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const { theme, resolved, setTheme } = useTheme();
  const { saved, toggle, persistent } = useSavedAnime(browserStorage);
  const feed = useDiscovery(
    repository,
    page === 'discover' ? tab : 'recommended',
    page === 'discover' ? keyword : '',
    refresh,
  );
  const hero = curatedAnime[heroIndex]!;
  const heroText = heroCopy[heroIndex]!;
  const isSaved = (anime: Anime) => saved.some((item) => item.id === anime.id);
  const title =
    page === 'watch'
      ? '播放'
      : page === 'saved'
        ? '我的追番'
        : page === 'history'
          ? '观看历史'
          : '发现';
  const showingHero = page === 'discover' && tab === 'recommended' && !keyword;
  const items = page === 'saved' ? saved : feed.items;
  const filtered = filterAnime(
    tab === 'calendar' && page === 'discover' && !keyword
      ? items.filter((item) => item.weekday === weekday)
      : items,
    {
      keyword: page === 'saved' || feed.error ? keyword : '',
      genre,
      sort: tab === 'ranking' && sort === 'recommended' ? 'score' : sort,
    },
  );

  function navigate(nextPage: Page, nextTab: DiscoveryTab = 'recommended') {
    go(nextPage === 'discover' ? '/' : `/${nextPage}`);
    setTab(nextTab);
    setKeyword('');
    setGenre('全部');
    setSort('recommended');
    setVisible(6);
    if (matchMedia('(max-width: 760px)').matches) setCollapsed(true);
    contentRef.current?.scrollTo({ top: 0 });
  }
  function toggleSaved(anime: Anime) {
    toggle(anime);
    setToast(isSaved(anime) ? `已取消追番《${anime.title}》` : `已加入追番《${anime.title}》`);
  }
  useEffect(() => {
    browserStorage.setItem('hana:sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);
  useEffect(() => {
    document.title = `${title} · Hana ACG`;
  }, [title]);
  useEffect(() => {
    setVisible(6);
  }, [keyword, genre, tab, page]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 2600);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        navigate('discover');
        requestAnimationFrame(() => searchRef.current?.focus());
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setCollapsed((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`app ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
      >
        跳到主要内容
      </a>
      {!collapsed && (
        <button
          className="sidebar-scrim"
          aria-label="收起导航栏"
          onClick={() => setCollapsed(true)}
        />
      )}
      <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="主导航">
        <div className="brand-row">
          <button className="brand" onClick={() => navigate('discover')} aria-label="Hana ACG 首页">
            <span className="brand-mark">
              h<span>✳</span>
            </span>
            <span className="brand-label">
              Hana <span>ACG</span>
            </span>
          </button>
          <button
            className="icon-button sidebar-toggle"
            aria-label={collapsed ? '展开导航栏' : '收起导航栏'}
            aria-expanded={!collapsed}
            title={collapsed ? '展开导航栏' : '收起导航栏'}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <button
          className="sidebar-search"
          title="搜索番剧"
          onClick={() => {
            navigate('discover');
            requestAnimationFrame(() => searchRef.current?.focus());
          }}
        >
          <Search size={17} />
          <span>搜索番剧</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="nav-group">
          <p className="nav-caption">探索</p>
          <button
            className={`nav-item ${page === 'discover' && tab !== 'calendar' ? 'active' : ''}`}
            aria-current={page === 'discover' && tab !== 'calendar' ? 'page' : undefined}
            title="发现"
            onClick={() => navigate('discover')}
          >
            <Compass size={18} />
            <span>发现</span>
            <span className="nav-dot" />
          </button>
          <button
            className={`nav-item ${page === 'discover' && tab === 'calendar' ? 'active' : ''}`}
            aria-current={page === 'discover' && tab === 'calendar' ? 'page' : undefined}
            title="每日放送"
            onClick={() => navigate('discover', 'calendar')}
          >
            <CalendarDays size={18} />
            <span>每日放送</span>
          </button>
        </div>
        <div className="nav-group">
          <p className="nav-caption">资料库</p>
          <button
            className={`nav-item ${page === 'saved' ? 'active' : ''}`}
            aria-current={page === 'saved' ? 'page' : undefined}
            title="我的追番"
            aria-label="我的追番"
            onClick={() => navigate('saved')}
          >
            <Bookmark size={18} />
            <span>我的追番</span>
            <span className="nav-count">{saved.length || ''}</span>
          </button>
          <button
            className={`nav-item ${page === 'history' ? 'active' : ''}`}
            aria-current={page === 'history' ? 'page' : undefined}
            title="观看历史"
            onClick={() => navigate('history')}
          >
            <History size={18} />
            <span>观看历史</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="little-note">
            <span className="note-star">✳</span>
            <p>
              给日常，留一点想象。<span>你的下一段旅程，从这里开始。</span>
            </p>
          </div>
          <button className="nav-item" title="外观与偏好" onClick={() => setSettings(true)}>
            <Settings2 size={18} />
            <span>外观与偏好</span>
          </button>
          <button className="nav-item" title="关于 Hana ACG" onClick={() => setAbout(true)}>
            <CircleHelp size={18} />
            <span>关于 Hana ACG</span>
            <ArrowUpRight size={14} className="nav-end" />
          </button>
          <div className="profile">
            <span className="avatar">H</span>
            <div>
              <strong>本地空间</strong>
              <span>好故事，慢慢看</span>
            </div>
            <span className="local-dot" title="资料保存在此设备" />
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="展开导航栏"
              onClick={() => setCollapsed(false)}
            >
              <Menu size={19} />
            </button>
            <span>Hana ACG</span>
            <ChevronRight size={12} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="local-mode">
              <span />
              自己的追番时光
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label={resolved === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
              title={resolved === 'dark' ? '亮色模式' : '暗色模式'}
              onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
            >
              {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} ref={contentRef} className="main-scroll">
          <div className="content">
            {page === 'watch' && route.animeId ? (
              <Suspense fallback={<p role="status">正在打开播放页…</p>}>
                <PlaybackPage
                  key={route.animeId}
                  animeId={route.animeId}
                  seed={watchSeed?.id === route.animeId ? watchSeed : undefined}
                  saved={saved.some((a) => a.id === route.animeId)}
                  onSave={toggleSaved}
                  onBack={() => navigate('discover')}
                  history={history.find((e) => e.anime.id === route.animeId)}
                  onProgress={saveProgress}
                  persistent={historyPersistent}
                />
              </Suspense>
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <h1>{page === 'discover' ? '今天，看点什么？' : title}</h1>
                    <p>
                      {page === 'discover'
                        ? '在熟悉的日常之外，发现一个新世界。'
                        : page === 'saved'
                          ? '把喜欢的故事，留在这里。'
                          : '每一段旅程，都值得记得。'}
                    </p>
                  </div>
                  {page !== 'history' && (
                    <div className="search-field">
                      <Search size={16} />
                      <input
                        ref={searchRef}
                        aria-label={page === 'saved' ? '搜索我的追番' : '搜索番剧'}
                        placeholder={page === 'saved' ? '搜索我的追番…' : '搜索番剧、关键词…'}
                        value={keyword}
                        onChange={(event) => {
                          setKeyword(event.target.value);
                          setGenre('全部');
                        }}
                      />
                      {keyword ? (
                        <button
                          className="icon-button"
                          aria-label="清空搜索"
                          onClick={() => setKeyword('')}
                        >
                          <X size={14} />
                        </button>
                      ) : (
                        <kbd>⌘ K</kbd>
                      )}
                    </div>
                  )}
                </div>

                {page === 'discover' && (
                  <div className="discovery-tabs" role="tablist" aria-label="发现分类">
                    {tabs.map((item) => (
                      <button
                        role="tab"
                        id={`tab-${item.id}`}
                        aria-controls="discovery-panel"
                        aria-selected={tab === item.id}
                        tabIndex={tab === item.id ? 0 : -1}
                        key={item.id}
                        className={tab === item.id ? 'selected' : ''}
                        onClick={() => {
                          setTab(item.id);
                          setGenre('全部');
                          setSort('recommended');
                        }}
                        onKeyDown={(event) => {
                          const direction =
                            event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                          if (direction) {
                            event.preventDefault();
                            const next =
                              tabs[
                                (tabs.findIndex((entry) => entry.id === tab) +
                                  direction +
                                  tabs.length) %
                                  tabs.length
                              ]!;
                            setTab(next.id);
                            setGenre('全部');
                            document.getElementById(`tab-${next.id}`)?.focus();
                          }
                        }}
                      >
                        {item.name}
                      </button>
                    ))}
                    <span className="tab-note">
                      {tab === 'recommended' ? '总有一个故事，与你共鸣' : '数据来自 Bangumi'}
                    </span>
                  </div>
                )}

                <div
                  id="discovery-panel"
                  role={page === 'discover' ? 'tabpanel' : undefined}
                  aria-labelledby={page === 'discover' ? `tab-${tab}` : undefined}
                >
                  {showingHero && (
                    <section className={`hero hero-${heroIndex}`} aria-label="精选番剧">
                      <img
                        className="hero-art"
                        src={heroText.image}
                        alt=""
                        onError={(event) => {
                          if (!event.currentTarget.src.endsWith(hero.cover))
                            event.currentTarget.src = hero.cover;
                        }}
                      />
                      <div className="hero-shade" />
                      <div className="hero-content">
                        <span className="hero-label">
                          <Sparkles size={13} /> 值得相遇的故事
                        </span>
                        <h2>{hero.title}</h2>
                        <p className="hero-line">{heroText.line}</p>
                        <p className="hero-caption">{heroText.caption}</p>
                        <div className="hero-meta">
                          <span className="hero-score">★ {hero.score.toFixed(1)}</span>
                          <span>{hero.year}</span>
                          <span>{hero.tags.slice(0, 2).join(' / ')}</span>
                          <span>全 {hero.episodes} 话</span>
                        </div>
                        <div className="hero-buttons">
                          <button className="hero-primary" onClick={() => openAnime(hero)}>
                            查看番剧 <ChevronRight size={16} />
                          </button>
                          <button
                            className={`hero-save ${isSaved(hero) ? 'saved' : ''}`}
                            onClick={() => toggleSaved(hero)}
                            aria-pressed={isSaved(hero)}
                          >
                            {isSaved(hero) ? <Check size={16} /> : <Plus size={16} />}
                            {isSaved(hero) ? '已追番' : '加入追番'}
                          </button>
                        </div>
                      </div>
                      <div className="hero-pagination">
                        <div className="hero-dots">
                          {heroCopy.map((_, index) => (
                            <button
                              key={index}
                              aria-label={`精选第 ${index + 1} 部`}
                              aria-pressed={heroIndex === index}
                              className={heroIndex === index ? 'active' : ''}
                              onClick={() => setHeroIndex(index)}
                            />
                          ))}
                        </div>
                        <span className="hero-page">{heroIndex + 1} / 3</span>
                        <button
                          aria-label="上一部精选"
                          onClick={() => setHeroIndex((heroIndex + 2) % 3)}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          aria-label="下一部精选"
                          onClick={() => setHeroIndex((heroIndex + 1) % 3)}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </section>
                  )}

                  {page === 'history' ? (
                    history.length ? (
                      <div className="history-list">
                        {history.map((entry) => (
                          <button
                            className="history-entry"
                            key={entry.anime.id}
                            onClick={() => openAnime(entry.anime)}
                          >
                            <Poster anime={entry.anime} />
                            <span>
                              <strong>{entry.anime.title}</strong>
                              <small>
                                {entry.episodeTitle} · 已观看 {Math.floor(entry.position / 60)} 分钟
                              </small>
                              <progress value={entry.position} max={entry.duration || 1} />
                            </span>
                            <ChevronRight size={18} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<History />}
                        title="故事，还没开始"
                        description="观看记录会在播放番剧后出现在这里。选择番剧和分集，开始你的第一段旅程。"
                        action={<Button onClick={() => navigate('discover')}>去发现好故事</Button>}
                      />
                    )
                  ) : (
                    <>
                      <section
                        className="catalog-section"
                        aria-label={page === 'saved' ? '我的追番列表' : '番剧列表'}
                      >
                        <div className="section-heading">
                          <div>
                            <h2>
                              {keyword
                                ? `“${keyword}”的搜索结果`
                                : page === 'saved'
                                  ? '已加入追番'
                                  : tab === 'calendar'
                                    ? '一周放送表'
                                    : tab === 'ranking'
                                      ? '经得起时间的佳作'
                                      : '下一部，选哪部'}
                            </h2>
                            <span>
                              {page === 'saved'
                                ? `${saved.length} 部番剧`
                                : keyword
                                  ? feed.loading
                                    ? '正在搜索'
                                    : `${filtered.length} 部番剧`
                                  : tab === 'recommended'
                                    ? '编辑精选，慢慢挑选'
                                    : tab === 'calendar'
                                      ? '播出日期以作品官方公告为准'
                                      : '按 Bangumi 评分发现好故事'}
                            </span>
                          </div>
                          <label className="sort-control">
                            <ArrowDownWideNarrow size={14} />
                            <select
                              aria-label="番剧排序"
                              value={sort}
                              onChange={(event) => setSort(event.target.value as typeof sort)}
                            >
                              <option value="recommended">
                                {tab === 'ranking' ? '评分优先' : '推荐排序'}
                              </option>
                              <option value="score">评分从高到低</option>
                              <option value="year">年份从新到旧</option>
                            </select>
                            <ChevronDown size={13} />
                          </label>
                        </div>
                        {tab === 'calendar' && page === 'discover' && !keyword ? (
                          <div className="weekdays" aria-label="选择放送日">
                            {weekdays.map((day, index) => (
                              <button
                                key={day}
                                aria-pressed={weekday === index + 1}
                                className={weekday === index + 1 ? 'active' : ''}
                                onClick={() => setWeekday(index + 1)}
                              >
                                {day}
                                {index + 1 === ((new Date().getDay() + 6) % 7) + 1 && (
                                  <small>今天</small>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="genre-row" aria-label="番剧类型">
                            {genres.map((item) => (
                              <button
                                key={item}
                                aria-pressed={genre === item}
                                className={genre === item ? 'active' : ''}
                                onClick={() => setGenre(item)}
                              >
                                {item}
                              </button>
                            ))}
                            <SlidersHorizontal
                              size={15}
                              className="genre-decoration"
                              aria-hidden="true"
                            />
                          </div>
                        )}
                        {!persistent && (
                          <div className="data-notice" role="status">
                            浏览器不允许保存数据，本次追番仅在当前页面保留。
                          </div>
                        )}
                        {page === 'discover' && feed.error && (
                          <div className="data-notice" role="status">
                            <span>
                              {tab === 'calendar' && !keyword
                                ? '暂时无法获取在线放送表，请稍后重试。'
                                : '暂时无法连接 Bangumi，以下为本地精选中的结果。'}
                            </span>
                            <button onClick={() => setRefresh((value) => value + 1)}>
                              重新加载
                            </button>
                          </div>
                        )}
                        {page === 'discover' && feed.loading ? (
                          <div className="anime-grid" aria-label="正在加载番剧" role="status">
                            {Array.from({ length: 6 }, (_, i) => (
                              <div className="skeleton-card" key={i}>
                                <div />
                                <span />
                                <span />
                              </div>
                            ))}
                          </div>
                        ) : filtered.length ? (
                          <>
                            <div className="anime-grid">
                              {filtered.slice(0, visible).map((anime) => (
                                <AnimeCard
                                  key={anime.id}
                                  anime={anime}
                                  saved={isSaved(anime)}
                                  onOpen={openAnime}
                                  onToggleSave={toggleSaved}
                                />
                              ))}
                            </div>
                            {filtered.length > visible && (
                              <div className="load-more">
                                <button onClick={() => setVisible((value) => value + 12)}>
                                  发现更多番剧 <ChevronDown size={14} />
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <EmptyState
                            icon={
                              page === 'saved' ? (
                                <Bookmark />
                              ) : tab === 'calendar' ? (
                                <CalendarDays />
                              ) : (
                                <Search />
                              )
                            }
                            title={
                              page === 'saved' && !saved.length
                                ? '为喜欢的故事留个位置'
                                : tab === 'calendar' && !keyword
                                  ? feed.error
                                    ? '放送表暂时未能抵达'
                                    : '这一天暂时没有放送记录'
                                  : '还没有找到这部番剧'
                            }
                            description={
                              page === 'saved' && !saved.length
                                ? '点击海报上的收藏图标，把想看的番剧加入追番。'
                                : tab === 'calendar' && !keyword
                                  ? '可以切换其他日期，或先看看为你精选的作品。'
                                  : '试试其他关键词，或清除类型筛选继续发现。'
                            }
                            action={
                              <Button
                                onClick={() => {
                                  if ((page === 'saved' && !saved.length) || tab === 'calendar')
                                    navigate('discover');
                                  else {
                                    setKeyword('');
                                    setGenre('全部');
                                  }
                                }}
                              >
                                {(page === 'saved' && !saved.length) || tab === 'calendar'
                                  ? '浏览精选番剧'
                                  : '清除筛选'}
                              </Button>
                            }
                          />
                        )}
                      </section>
                      {showingHero && (
                        <section className="discovery-bottom">
                          <div>
                            <CalendarDays size={22} />
                            <div>
                              <h3>让期待，有个日程。</h3>
                              <p>看看这一周，有哪些故事正在发生。</p>
                            </div>
                          </div>
                          <button onClick={() => navigate('discover', 'calendar')}>
                            查看每日放送 <ChevronRight size={15} />
                          </button>
                        </section>
                      )}
                    </>
                  )}
                </div>
                <footer className="page-footer">
                  <span className="footer-brand">
                    hana<span> acg</span>
                  </span>
                  <span>一处安静的番剧角落</span>
                  <span className="footer-source">
                    番剧资料来自{' '}
                    <a href="https://bgm.tv" target="_blank" rel="noreferrer">
                      Bangumi <ArrowUpRight size={10} />
                    </a>
                    {showingHero && ' · 精选资料快照'}
                  </span>
                </footer>
              </>
            )}
          </div>
        </main>
      </div>

      {settings && (
        <Modal title="外观与偏好" onClose={() => setSettings(false)} className="settings-modal">
          <span className="settings-icon">
            <Settings2 size={22} />
          </span>
          <h2>外观与偏好</h2>
          <p>让这个小小的空间，更像你。</p>
          <h3>外观模式</h3>
          <div className="theme-options">
            {(
              [
                { id: 'light', label: '亮色', icon: Sun },
                { id: 'dark', label: '暗色', icon: Moon },
                { id: 'system', label: '跟随系统', icon: Monitor },
              ] satisfies { id: ThemePreference; label: string; icon: typeof Sun }[]
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-pressed={theme === id}
                className={theme === id ? 'active' : ''}
                onClick={() => setTheme(id)}
              >
                <Icon size={21} />
                <span>{label}</span>
                {theme === id && <Check size={13} />}
              </button>
            ))}
          </div>
          <div className="settings-note">
            <Bookmark size={17} />
            <p>追番与外观偏好保存在当前浏览器，无需登录。</p>
          </div>
        </Modal>
      )}
      {about && (
        <Modal title="关于 Hana ACG" onClose={() => setAbout(false)} className="settings-modal">
          <span className="about-mark">h✳</span>
          <h2>Hana ACG</h2>
          <p>一处安静的番剧角落。</p>
          <div className="about-copy">
            <p>
              从一个故事，走向另一个世界。这里是 Hana
              的第一个版本，从发现喜欢的番剧，到选择来源继续观看。
            </p>
            <p>
              精选为本地资料快照，搜索、高分佳作与每日放送由 Bangumi
              提供在线元数据。海报版权归各作品权利人所有。
            </p>
          </div>
          <span className="version">播放预览版 0.1.0</span>
        </Modal>
      )}
      <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">
        {toast && (
          <>
            <Check size={15} />
            {toast}
          </>
        )}
      </div>
    </div>
  );
}
