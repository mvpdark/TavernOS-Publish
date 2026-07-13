import type { ThemeOption, ThemeTone } from '../canvas-types';

type CssVars = Record<string, string | number>;

type ThemeSettingsProps = {
  themes: ThemeOption[];
  activeTheme: ThemeTone;
  onSelectTheme: (theme: ThemeTone) => void;
  onClose: () => void;
};

export function ThemeSettings({ themes, activeTheme, onSelectTheme, onClose }: ThemeSettingsProps) {
  return (
    <div className="canvas-library-scrim hidden-settings-scrim" onPointerDown={onClose}>
      <section
        className="hidden-settings"
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="主题设置"
      >
        <div className="canvas-library__top">
          <div>
            <span className="canvas-library__eyebrow">主题设置</span>
            <h2>主题切换</h2>
          </div>
          <button className="canvas-library__close" type="button" onClick={onClose} aria-label="关闭主题设置">
            ×
          </button>
        </div>
        <div className="theme-choice-list">
          {themes.map((theme, index) => (
            <button
              key={theme.id}
              className={`theme-choice ${activeTheme === theme.id ? 'is-active' : ''}`}
              style={{ '--theme-swatch': theme.swatch, '--card-index': index } as CssVars}
              type="button"
              onClick={() => onSelectTheme(theme.id)}
            >
              <span className="theme-choice__swatch" />
              <span className="theme-choice__copy">
                <strong>{theme.name}</strong>
                <small>{theme.desc}</small>
              </span>
              <span className="theme-choice__check">{activeTheme === theme.id ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
