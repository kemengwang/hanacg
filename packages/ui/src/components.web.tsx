import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { Anime, AnimeCardProps } from '@hanacg/domain';

export function Poster({ anime, eager = false }: { anime: Anime; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="poster-image">
      {!failed && anime.cover ? (
        <img
          src={anime.cover}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="poster-fallback">
          <span>花</span>
          {anime.title}
        </span>
      )}
    </div>
  );
}
export function AnimeCard({ anime, saved, onOpen, onToggleSave }: AnimeCardProps) {
  return (
    <article className="anime-card">
      <div className="poster-wrap">
        <button
          className="poster-open"
          aria-label={`查看${anime.title}详情`}
          onClick={() => onOpen(anime)}
        >
          <Poster key={anime.cover} anime={anime} />
        </button>
        {anime.score > 0 && (
          <span className="score-badge">
            <span aria-hidden="true">★</span> {anime.score.toFixed(1)}
          </span>
        )}
        <button
          className={`save-poster ${saved ? 'is-saved' : ''}`}
          aria-label={`${saved ? '取消追番' : '追番'}：${anime.title}`}
          aria-pressed={saved}
          onClick={() => onToggleSave(anime)}
        >
          <svg
            viewBox="0 0 24 24"
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M6 20V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15l-6-4-6 4Z" />
          </svg>
        </button>
      </div>
      <button className="card-title" onClick={() => onOpen(anime)}>
        {anime.title}
      </button>
      <p className="card-meta">
        {anime.year || '年份待定'}
        <span />
        {anime.episodes ? `${anime.episodes} 话` : '话数待定'}
        {anime.tags[0] && (
          <>
            <span />
            {anime.tags[0]}
          </>
        )}
      </p>
    </article>
  );
}
export function Button({
  children,
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
