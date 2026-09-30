import { useEffect, useState } from 'react';
import { CalendarDays, Megaphone } from 'lucide-react';
import type { Anime } from '@hanacg/domain';
import type { DiscoveryRepository } from '@hanacg/api-client';
import { useDiscovery } from '@hanacg/feature-core';
import { AnimeCard, Button, EmptyState } from '@hanacg/ui';
import { browserNetwork } from '../platform';
import { catalogId } from '../catalog/migrate-ids';
import './discovery.css';
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
interface Announcement {
  id: string;
  title: string;
  content: string;
}
function parseAnnouncements(value: unknown): Announcement[] {
  const list = (value as { items?: unknown })?.items;
  if (
    !Array.isArray(list) ||
    !list.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.content === 'string',
    )
  )
    throw new Error('Invalid announcements');
  return list;
}
export function DiscoveryPage({
  repository,
  saved,
  onOpen,
  onToggleSave,
}: {
  repository: DiscoveryRepository;
  saved: readonly Anime[];
  onOpen: (anime: Anime) => void;
  onToggleSave: (anime: Anime) => void;
}) {
  const [refresh, setRefresh] = useState(0);
  const [weekday, setWeekday] = useState(() => ((new Date().getDay() + 6) % 7) + 1);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [noticeStatus, setNoticeStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const feed = useDiscovery(repository, 'calendar', '', refresh);
  useEffect(() => {
    const controller = new AbortController();
    setNoticeStatus('loading');
    browserNetwork
      .json('/api/announcements', { signal: controller.signal })
      .then(parseAnnouncements)
      .then((items) => {
        if (!controller.signal.aborted) {
          setAnnouncements(items);
          setNoticeStatus('ready');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setNoticeStatus('error');
      });
    return () => controller.abort();
  }, [refresh]);
  const items = feed.items.filter((a) => a.weekday === weekday);
  return (
    <div className="discovery-home">
      <section className="announcement-board" aria-labelledby="announcements-title">
        <h1 id="announcements-title">
          <Megaphone size={18} />
          全站公告
        </h1>
        {noticeStatus === 'loading' ? (
          <p role="status">正在加载公告…</p>
        ) : noticeStatus === 'error' ? (
          <p role="status">
            公告暂时无法加载。<button onClick={() => setRefresh((n) => n + 1)}>重试</button>
          </p>
        ) : announcements.length ? (
          <div className="announcement-list">
            {announcements.map((a) => (
              <article key={a.id}>
                <h2>{a.title}</h2>
                <p>{a.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <p>暂无公告。</p>
        )}
      </section>
      <section className="schedule-section" aria-labelledby="schedule-title">
        <div className="section-heading">
          <div>
            <h2 id="schedule-title">新番时间表</h2>
            <span>每周放送安排 · 播出日期以作品官方公告为准</span>
          </div>
        </div>
        <div className="weekdays" aria-label="选择放送日">
          {weekdays.map((label, i) => (
            <button
              key={label}
              className={weekday === i + 1 ? 'active' : ''}
              aria-pressed={weekday === i + 1}
              onClick={() => setWeekday(i + 1)}
            >
              {label}
              {i + 1 === ((new Date().getDay() + 6) % 7) + 1 && <small>今天</small>}
            </button>
          ))}
        </div>
        {feed.loading ? (
          <div className="anime-grid" role="status" aria-label="正在加载新番时间表">
            {Array.from({ length: 6 }, (_, i) => (
              <div className="skeleton-card" key={i}>
                <div />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : feed.error ? (
          <EmptyState
            icon={<CalendarDays />}
            title="新番时间表暂时无法加载"
            description="请稍后重试，放送安排不会使用离线数据替代。"
            action={<Button onClick={() => setRefresh((n) => n + 1)}>重新加载</Button>}
          />
        ) : items.length ? (
          <div className="anime-grid">
            {items.map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                saved={saved.some((a) => catalogId(a.id) === catalogId(anime.id))}
                onOpen={onOpen}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays />}
            title="这一天暂时没有放送记录"
            description="可以切换其他日期查看新番安排。"
          />
        )}
      </section>
    </div>
  );
}
