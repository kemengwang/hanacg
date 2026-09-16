import type { RefObject } from 'react';
import { Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from 'lucide-react';

export function Topbar({
  collapsed,
  onToggleSidebar,
  onHome,
  keyword,
  onSearch,
  searchRef,
  dark,
  onToggleTheme,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onHome: () => void;
  keyword: string;
  onSearch: (keyword: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <button
          className="icon-button"
          aria-label={collapsed ? '展开导航栏' : '收起导航栏'}
          aria-expanded={!collapsed}
          onClick={onToggleSidebar}
        >
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
        <button className="brand" onClick={onHome} aria-label="Hana ACG 首页">
          <span className="brand-mark">
            h<span>✳</span>
          </span>
          <span className="brand-label">
            Hana <span>ACG</span>
          </span>
        </button>
      </div>
      <form
        className="search-field topbar-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(keyword);
        }}
      >
        <Search size={17} />
        <input
          ref={searchRef}
          aria-label="搜索番剧"
          placeholder="搜索番剧、关键词…"
          value={keyword}
          onChange={(event) => onSearch(event.target.value)}
        />
        {keyword ? (
          <button
            type="button"
            className="icon-button"
            aria-label="清空搜索"
            onClick={() => {
              onSearch('');
              searchRef.current?.focus();
            }}
          >
            <X size={15} />
          </button>
        ) : (
          <kbd>⌘ K</kbd>
        )}
      </form>
      <button
        className="icon-button"
        aria-label={dark ? '切换到亮色模式' : '切换到暗色模式'}
        title={dark ? '亮色模式' : '暗色模式'}
        onClick={onToggleTheme}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
