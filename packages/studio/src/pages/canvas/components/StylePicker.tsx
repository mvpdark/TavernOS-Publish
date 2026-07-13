import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStyleLabel } from '../styleLibrary';
import type { NodeStyleRef, StyleLibraryState } from '../canvas-types';

function coverStyle(cover: string) {
  return cover.startsWith('data:')
    ? { backgroundImage: `url("${cover}")` }
    : { background: cover };
}

type StylePickerProps = {
  library: StyleLibraryState;
  value?: NodeStyleRef;
  onChange: (presetId: string) => void;
};

export function StylePicker({ library, value, onChange }: StylePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [submenuCategoryId, setSubmenuCategoryId] = useState<string | null>(null);
  const [submenuState, setSubmenuState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const [submenuDirection, setSubmenuDirection] = useState<'left' | 'right'>('left');
  const submenuCloseTimerRef = useRef<number | null>(null);
  const panelLeaveTimerRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const hasVisibleSubmenu = submenuCategoryId !== null || submenuState !== 'closed';

  const activeCategory = library.categories.find((category) => category.id === submenuCategoryId) ?? null;
  const activePresets = useMemo(
    () => library.presets.filter((preset) => preset.categoryId === submenuCategoryId),
    [submenuCategoryId, library.presets],
  );

  useEffect(() => () => {
    if (submenuCloseTimerRef.current) window.clearTimeout(submenuCloseTimerRef.current);
    if (panelLeaveTimerRef.current) window.clearTimeout(panelLeaveTimerRef.current);
  }, []);

  const cancelPendingClose = useCallback(() => {
    if (panelLeaveTimerRef.current) {
      window.clearTimeout(panelLeaveTimerRef.current);
      panelLeaveTimerRef.current = null;
    }
  }, []);

  const schedulePanelClose = useCallback(() => {
    cancelPendingClose();
    panelLeaveTimerRef.current = window.setTimeout(() => {
      setActiveCategoryId(null);
      panelLeaveTimerRef.current = null;
    }, 90);
  }, [cancelPendingClose]);

  useEffect(() => {
    cancelPendingClose();

    if (!isOpen) {
      setActiveCategoryId(null);
      setSubmenuCategoryId(null);
      setSubmenuState('closed');
      return;
    }

    if (activeCategoryId) {
      setSubmenuCategoryId(activeCategoryId);
      setSubmenuState('opening');
      const openTimer = window.setTimeout(() => setSubmenuState('open'), 24);
      return () => window.clearTimeout(openTimer);
    }

    if (submenuCategoryId) {
      setSubmenuState('closing');
      submenuCloseTimerRef.current = window.setTimeout(() => {
        setSubmenuCategoryId(null);
        setSubmenuState('closed');
        submenuCloseTimerRef.current = null;
      }, 220);
    }
  }, [activeCategoryId, cancelPendingClose, isOpen, submenuCategoryId]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    panel.addEventListener('mouseenter', cancelPendingClose);
    panel.addEventListener('mouseleave', schedulePanelClose);
    return () => {
      panel.removeEventListener('mouseenter', cancelPendingClose);
      panel.removeEventListener('mouseleave', schedulePanelClose);
    };
  }, [cancelPendingClose, schedulePanelClose]);

  useEffect(() => {
    if (!isOpen) return;

    const updateSubmenuDirection = () => {
      const panelRect = panelRef.current?.getBoundingClientRect();
      if (!panelRect) return;
      const submenuWidth = 388;
      const gap = 14;
      const spaceLeft = panelRect.left;
      const spaceRight = window.innerWidth - panelRect.right;

      if (spaceRight >= submenuWidth + gap || spaceRight >= spaceLeft) {
        setSubmenuDirection('right');
        return;
      }

      setSubmenuDirection('left');
    };

    updateSubmenuDirection();
    window.addEventListener('resize', updateSubmenuDirection);
    return () => window.removeEventListener('resize', updateSubmenuDirection);
  }, [isOpen]);

  function toggleOpen() {
    setIsOpen((current) => {
      if (current) setActiveCategoryId(null);
      return !current;
    });
  }

  return (
    <div className={`style-picker ${isOpen ? 'is-open' : ''} ${hasVisibleSubmenu ? 'has-submenu' : ''}`}>
      <button className="style-pill" type="button" onClick={toggleOpen}>
        <span className="style-pill__label">{getStyleLabel(library, value)}</span>
        <span className="style-pill__caret">{isOpen ? '▴' : '▾'}</span>
      </button>
      {isOpen ? (
        <div ref={panelRef} className="style-picker__panel">
          <div className="style-picker__folders">
            {library.categories.map((category) => (
              <button
                key={category.id}
                className={`style-folder ${activeCategoryId === category.id ? 'is-active' : ''}`}
                type="button"
                onMouseEnter={() => setActiveCategoryId(category.id)}
                onFocus={() => setActiveCategoryId(category.id)}
                onClick={() => setActiveCategoryId(category.id)}
              >
                <span className="style-folder__icon">▣</span>
                <span className="style-folder__text">
                  <strong>{category.name}</strong>
                  <small>{category.description}</small>
                </span>
              </button>
            ))}
          </div>

          {activeCategory ? (
            <div
              className={`style-picker__submenu style-picker__submenu--${submenuDirection} is-${submenuState}`}
              onWheel={(event) => event.stopPropagation()}
            >
              <div className="style-picker__submenu-head">
                <strong>{activeCategory.name}</strong>
                <span>选择子风格</span>
              </div>
              <div className="style-picker__cards">
                {activePresets.map((preset) => (
                  <button
                    key={preset.id}
                    className={`style-card ${value?.presetId === preset.id ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => {
                      onChange(preset.id);
                      setIsOpen(false);
                      setActiveCategoryId(null);
                    }}
                  >
                    <span className="style-card__cover" style={coverStyle(preset.cover)} />
                    <span className="style-card__meta">
                      <strong>{preset.name}</strong>
                      <small>{preset.summary}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
