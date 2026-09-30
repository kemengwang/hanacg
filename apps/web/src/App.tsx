import { DiscoveryPage } from './discovery/DiscoveryPage';
import { catalogId } from './catalog/migrate-ids';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  LibraryBig,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  History,
  Tv,
  Monitor,
  Moon,
  Settings2,
  Sun,
} from 'lucide-react';
import { AnimeCard, Button, EmptyState, Poster } from '@hanacg/ui';
import { type Anime, type ThemePreference } from '@hanacg/domain';
import { createCatalogRepository, createCatalogBookRepository } from '@hanacg/api-client';
import { useSavedAnime, useWatchHistory } from '@hanacg/feature-core';
import { browserNetwork, browserStorage } from './platform';
import { useTheme } from './theme';
import { Modal } from './Modal';
import { Topbar } from './Topbar';
import { CatalogPage } from './catalog/CatalogPage';
import { BookCatalogPage } from './catalog/BookCatalogPage';
const PlaybackPage = lazy(() =>
  import('./playback/PlaybackPage').then((module) => ({ default: module.PlaybackPage })),
);
import './playback/playback.css';
import { useNavigation } from './playback/navigation';

const repository = createCatalogRepository(browserNetwork);
const bookRepository = createCatalogBookRepository(browserNetwork);
type Page = 'discover' | 'anime' | 'novel' | 'manga' | 'saved' | 'history';

export function App() {
  const { route, go } = useNavigation();
  const page = route.page;
  const {
    history,
    save: saveProgress,
    persistent: historyPersistent,
  } = useWatchHistory(browserStorage);
  const [collapsed, setCollapsed] = useState(
    () =>
      browserStorage.getItem('hana:sidebar') === 'collapsed' ||
      matchMedia('(max-width: 760px)').matches,
  );
  const isCatalog = page === 'anime' || page === 'novel' || page === 'manga';
  const searchCategory = page === 'novel' ? '小说' : page === 'manga' ? '漫画' : '番剧';
  const keyword = isCatalog ? route.keyword : '';
  function search(keyword: string) {
    const target = isCatalog ? page : 'anime';
    go(`/${target}${keyword ? `?${new URLSearchParams({ q: keyword })}` : ''}`, isCatalog);
    contentRef.current?.scrollTo({ top: 0 });
    if (matchMedia('(max-width: 760px)').matches) setCollapsed(true);
  }
  const [watchSeed, setWatchSeed] = useState<Anime>();
  function openAnime(anime: Anime) {
    setWatchSeed(anime);
    go(`/watch/${anime.id}`);
    contentRef.current?.scrollTo({ top: 0 });
    if (matchMedia('(max-width: 760px)').matches) setCollapsed(true);
  }
  const [settings, setSettings] = useState(false);
  const [about, setAbout] = useState(false);
  const [toast, setToast] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const { theme, resolved, setTheme } = useTheme();
  const { saved, toggle: toggleStored, persistent } = useSavedAnime(browserStorage);
  const toggle = (anime: Anime) => toggleStored({ ...anime, id: catalogId(anime.id) });
  const isSaved = (anime: Anime) =>
    saved.some((item) => catalogId(item.id) === catalogId(anime.id));
  const title =
    page === 'watch'
      ? '播放'
      : page === 'saved'
        ? '我的追番'
        : page === 'history'
          ? '观看历史'
          : isCatalog
            ? searchCategory
            : '发现';
  function navigate(nextPage: Page) {
    go(nextPage === 'discover' ? '/' : `/${nextPage}`);
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
      <Topbar
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed((value) => !value)}
        onHome={() => navigate('discover')}
        keyword={keyword}
        searchCategory={searchCategory}
        onSearch={search}
        searchRef={searchRef}
        dark={resolved === 'dark'}
        onToggleTheme={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
      />
      {!collapsed && (
        <button
          className="sidebar-scrim"
          aria-label="收起导航栏"
          onClick={() => setCollapsed(true)}
        />
      )}
      <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="主导航">
        <div className="nav-group">
          <p className="nav-caption">探索</p>
          <button
            className={`nav-item ${page === 'discover' ? 'active' : ''}`}
            aria-current={page === 'discover' ? 'page' : undefined}
            title="发现"
            onClick={() => navigate('discover')}
          >
            <Compass size={18} />
            <span>发现</span>
            <span className="nav-dot" />
          </button>
          <button
            className={`nav-item ${page === 'anime' ? 'active' : ''}`}
            aria-current={page === 'anime' ? 'page' : undefined}
            title="番剧"
            onClick={() => navigate('anime')}
          >
            <Tv size={18} />
            <span>番剧</span>
          </button>
          {(
            [
              { id: 'novel', label: '小说', icon: BookOpen },
              { id: 'manga', label: '漫画', icon: LibraryBig },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              aria-current={page === id ? 'page' : undefined}
              title={label}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
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
        <main id="main-content" tabIndex={-1} ref={contentRef} className="main-scroll">
          <div className="content">
            {page === 'watch' && route.animeId ? (
              <Suspense fallback={<p role="status">正在打开播放页…</p>}>
                <PlaybackPage
                  key={route.animeId}
                  animeId={route.animeId}
                  seed={watchSeed?.id === route.animeId ? watchSeed : undefined}
                  saved={saved.some((a) => catalogId(a.id) === catalogId(Number(route.animeId)))}
                  onSave={toggleSaved}
                  onBack={() => navigate('discover')}
                  history={history.find(
                    (e) => catalogId(e.anime.id) === catalogId(Number(route.animeId)),
                  )}
                  onProgress={(entry) =>
                    saveProgress({
                      ...entry,
                      anime: { ...entry.anime, id: catalogId(entry.anime.id) },
                    })
                  }
                  persistent={historyPersistent}
                />
              </Suspense>
            ) : page === 'novel' || page === 'manga' ? (
              <BookCatalogPage
                key={`${page}:${keyword}`}
                repository={bookRepository}
                kind={page}
                keyword={keyword}
                onClearSearch={() => search('')}
              />
            ) : page === 'anime' ? (
              <CatalogPage
                key={keyword}
                repository={repository}
                keyword={keyword}
                saved={saved}
                onOpen={openAnime}
                onToggleSave={toggleSaved}
                onClearSearch={() => search('')}
                persistent={persistent}
              />
            ) : page === 'discover' ? (
              <DiscoveryPage
                repository={repository}
                saved={saved}
                onOpen={openAnime}
                onToggleSave={toggleSaved}
              />
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <h1>{title}</h1>
                    <p>
                      {page === 'saved' ? '把喜欢的故事，留在这里。' : '每一段旅程，都值得记得。'}
                    </p>
                  </div>
                </div>
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
                      description="观看记录会在播放番剧后出现在这里。"
                      action={<Button onClick={() => navigate('anime')}>浏览番剧</Button>}
                    />
                  )
                ) : saved.length ? (
                  <div className="anime-grid">
                    {saved.map((anime) => (
                      <AnimeCard
                        key={anime.id}
                        anime={anime}
                        saved={true}
                        onOpen={openAnime}
                        onToggleSave={toggleSaved}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Bookmark />}
                    title="为喜欢的故事留个位置"
                    description="点击海报上的收藏图标，把想看的番剧加入追番。"
                    action={<Button onClick={() => navigate('anime')}>浏览番剧</Button>}
                  />
                )}
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
              精选为本地资料快照，搜索、高分佳作与每日放送由 Hana
              资料库提供。海报版权归各作品权利人所有。
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
