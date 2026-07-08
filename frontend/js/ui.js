/**
 * Financial Health Score — shared UI components
 */
const FHS = (() => {
  const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    portfolio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    assess: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>',
    loans: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    schemes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/></svg>',
    review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
    api: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    score: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    risk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  };

  const PORTALS = {
    bank: {
      theme: 'theme-bank',
      portalLabel: 'Bank Portal',
      portalSub: 'IDBI MSME Lending',
      nav: [
        { id: 'dashboard', href: '/app/bank/dashboard.html', label: 'Dashboard', icon: 'dashboard' },
        { id: 'portfolio', href: '/app/bank/portfolio.html', label: 'Portfolio', icon: 'portfolio' },
        { id: 'loans', href: '/app/bank/loans.html', label: 'Loan Applications', icon: 'loans' },
        { id: 'api', href: '/api/v1/health', label: 'API Health', icon: 'api', external: true },
      ],
    },
    msme: {
      theme: 'theme-msme',
      portalLabel: 'MSME Portal',
      portalSub: 'Your Business Health',
      nav: [
        { id: 'dashboard', href: '/app/msme/dashboard.html', label: 'Dashboard', icon: 'dashboard' },
        { id: 'import', href: '/app/msme/import.html', label: 'Import Data', icon: 'portfolio' },
        { id: 'assess', href: '/app/msme/assess.html', label: 'Run Assessment', icon: 'assess' },
        { id: 'report', href: '/app/msme/report.html', label: 'My Report', icon: 'report' },
        { id: 'loans', href: '/app/msme/loans.html', label: 'Loan Applications', icon: 'loans' },
      ],
    },
    govt: {
      theme: 'theme-govt',
      portalLabel: 'MSME Intelligence',
      portalSub: 'Government Portal',
      nav: [
        { id: 'dashboard', href: '/app/govt/dashboard.html', label: 'Dashboard', icon: 'dashboard' },
        { id: 'schemes', href: '/app/govt/schemes.html', label: 'Scheme Advisory', icon: 'schemes' },
      ],
    },
    regulatory: {
      theme: 'theme-regulatory',
      portalLabel: 'Regulatory Intelligence',
      portalSub: 'RBI · GSTN · MCA',
      nav: [
        { id: 'dashboard', href: '/app/regulatory/dashboard.html', label: 'Dashboard', icon: 'dashboard' },
        { id: 'review', href: '/app/regulatory/review.html', label: 'Compliance Review', icon: 'review' },
      ],
    },
  };

  function scoreColor(score) {
    if (score == null) return 'var(--muted)';
    if (score >= 80) return 'var(--score-excellent)';
    if (score >= 70) return 'var(--score-good)';
    if (score >= 60) return 'var(--score-fair)';
    if (score >= 50) return 'var(--score-warn)';
    return 'var(--score-poor)';
  }

  function gradeClass(grade) {
    if (!grade) return '';
    const g = grade.replace('+', 'plus').replace('-', 'minus');
    return `grade-badge grade-${g}`;
  }

  function initials(name) {
    if (!name) return '?';
    return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function renderSidebar(portalKey, activeId, user) {
    const portal = PORTALS[portalKey];
    if (!portal) return '';
    const navHtml = portal.nav.map(item => {
      const active = item.id === activeId ? ' active' : '';
      const ext = item.external ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${item.href}" class="nav-link${active}"${ext}>
        <span class="nav-icon">${ICONS[item.icon] || ''}</span>${item.label}
      </a>`;
    }).join('');

    const roleLabel = user?.role?.replace(/_/g, ' ') || '';
    return `
      <aside class="sidebar ${portal.theme}">
        <div class="sidebar-brand">
          <img src="/app/assets/logo.svg" alt="Financial Health Score" class="logo-img" width="44" height="44" />
          <div>
            <div class="brand-title">Financial Health Score</div>
            <div class="brand-sub">${portal.portalSub}</div>
          </div>
        </div>
        <div class="portal-pill">${portal.portalLabel}</div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar">${initials(user?.full_name)}</div>
            <div class="user-meta">
              <div class="user-name">${user?.full_name || 'User'}</div>
              <div class="user-role">${roleLabel}</div>
            </div>
          </div>
          <button type="button" class="btn-logout" onclick="logout()">
            ${ICONS.logout}<span>Sign Out</span>
          </button>
        </div>
      </aside>`;
  }

  function renderPageHeader({ title, subtitle, badge }) {
    return `
      <header class="page-header">
        <div class="page-header-text">
          <p class="page-eyebrow">Financial Health Score Platform</p>
          <h1 class="page-title">${title}</h1>
          ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
        </div>
        ${badge ? `<div class="page-header-badge">${badge}</div>` : ''}
      </header>`;
  }

  function renderScoreRing(score, { size = 'lg', grade, label } = {}) {
    const pct = score != null ? Math.min(100, Math.max(0, score)) : 0;
    const color = scoreColor(score);
    const sizeClass = size === 'sm' ? 'score-ring-sm' : size === 'md' ? 'score-ring-md' : 'score-ring-lg';
    return `
      <div class="score-ring-wrap ${sizeClass}" style="--pct:${pct};--ring-color:${color}">
        <div class="score-ring">
          <div class="score-ring-inner">
            <span class="score-value">${score != null ? score.toFixed(1) : '—'}</span>
            ${grade ? `<span class="${gradeClass(grade)}">${grade}</span>` : ''}
            ${label ? `<span class="score-label">${label}</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  function renderScoreHero({ score, grade, riskLevel, title, subtitle, ctaHtml }) {
    return `
      <div class="score-hero-card">
        ${renderScoreRing(score, { grade, label: 'out of 100' })}
        <div class="score-hero-body">
          <h2>${title || 'Financial Health Score'}</h2>
          <div class="score-hero-meta">
            ${riskLevel ? riskBadge(riskLevel) : ''}
            ${grade ? `<span class="${gradeClass(grade)}">${grade} Grade</span>` : ''}
          </div>
          ${subtitle ? `<p class="score-hero-sub">${subtitle}</p>` : ''}
          ${ctaHtml || ''}
        </div>
      </div>`;
  }

  function renderStatCard(label, value, { icon = 'score', trend, variant } = {}) {
    const variantClass = variant ? ` stat-${variant}` : '';
    return `
      <div class="stat-card${variantClass}">
        <div class="stat-icon">${ICONS[icon] || ICONS.score}</div>
        <div class="stat-body">
          <div class="stat-label">${label}</div>
          <div class="stat-value">${value ?? '—'}</div>
          ${trend ? `<div class="stat-trend">${trend}</div>` : ''}
        </div>
      </div>`;
  }

  function renderDimensionBars(dimensions, limit = 5) {
    if (!dimensions?.length) return '';
    const sorted = [...dimensions].sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, limit);
    const bottom = sorted.slice(-limit).reverse();
    const bar = (d, type) => `
      <div class="dim-bar-row">
        <span class="dim-name" title="${d.dimension}">${formatDimName(d.dimension)}</span>
        <div class="dim-bar-track"><div class="dim-bar-fill dim-${type}" style="width:${d.score}%"></div></div>
        <span class="dim-score">${d.score.toFixed(1)}</span>
      </div>`;
    return `
      <div class="dim-bars-grid">
        <div><h4 class="dim-section-title">Top Strengths</h4>${top.map(d => bar(d, 'strong')).join('')}</div>
        <div><h4 class="dim-section-title">Areas to Improve</h4>${bottom.map(d => bar(d, 'weak')).join('')}</div>
      </div>`;
  }

  function formatDimName(id) {
    return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function renderWelcomeBanner(portalKey) {
    const messages = {
      bank: { title: 'Portfolio Intelligence', text: 'Monitor MSME credit health, run assessments, and manage loan pipelines with AI-powered insights.' },
      msme: { title: 'Know Your Business Health', text: 'Your 20-dimension Financial Health Score helps you access credit, schemes, and growth capital.' },
      govt: { title: 'National MSME Oversight', text: 'Track registered MSMEs, scheme uptake, and AI-powered policy recommendations.' },
      regulatory: { title: 'Supervisory Compliance', text: 'Review high-risk assessments and regulatory submissions across RBI, GSTN, and MCA.' },
    };
    const m = messages[portalKey] || messages.bank;
    return `
      <div class="welcome-banner">
        <div class="welcome-banner-glow"></div>
        <div class="welcome-banner-content">
          <h2>${m.title}</h2>
          <p>${m.text}</p>
        </div>
        <div class="welcome-banner-badge">
          <img src="/app/assets/logo.svg" alt="" width="56" height="56" />
          <span>IDBI Innovate 2026</span>
        </div>
      </div>`;
  }

  function mountLayout(portalKey, activeId) {
    const user = typeof getUser === 'function' ? getUser() : null;
    const portal = PORTALS[portalKey];
    if (portal) document.body.classList.add(portal.theme);
    const layout = document.querySelector('.layout');
    if (!layout) return;
    const oldSidebar = layout.querySelector('.sidebar');
    if (oldSidebar) {
      oldSidebar.outerHTML = renderSidebar(portalKey, activeId, user);
    }
  }

  return {
    ICONS,
    PORTALS,
    scoreColor,
    gradeClass,
    renderSidebar,
    renderPageHeader,
    renderScoreRing,
    renderScoreHero,
    renderStatCard,
    renderDimensionBars,
    renderWelcomeBanner,
    mountLayout,
    formatDimName,
  };
})();
