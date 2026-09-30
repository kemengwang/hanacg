import { animeStatusLabel } from '@hanacg/domain';
import { TruncatedTitle } from './TruncatedTitle.web';
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { Anime, AnimeCardProps, BookCardProps } from '@hanacg/domain';

export function Poster({
  anime,
  eager = false,
}: {
  anime: Pick<Anime, 'title' | 'cover'>;
  eager?: boolean;
}) {
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
          aria-label={`播放${anime.title}`}
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
      <TruncatedTitle title={anime.title} onClick={() => onOpen(anime)} />
      <p className="card-meta">{animeStatusLabel(anime)}</p>
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

/** Informational card until book details and reading are available. */
export function BookCard({ book }: BookCardProps) {
  return (
    <article className="book-card">
      <div className="poster-wrap">
        <Poster key={book.cover} anime={book} />
        {book.score > 0 && (
          <span className="score-badge">
            <span aria-hidden="true">★</span> {book.score.toFixed(1)}
          </span>
        )}
      </div>
      <h3 className="book-card-title" title={book.title}>
        {book.title}
      </h3>
      <p className="book-card-author" title={book.author}>
        {book.author || '作者未收录'}
      </p>
      <p className="card-meta">
        {book.year || '年份未收录'}
        <span />
        {book.status === 'unknown' ? '状态未收录' : book.status}
      </p>
    </article>
  );
}
