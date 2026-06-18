/**
 * 豆瓣页面脚本
 */

(function () {
  'use strict';

  var doubanType = 'movie';
  var doubanStatus = 'done';
  var doubanFinished = false;
  var doubanLoading = false;
  var doubanPage = 1;
  var doubanGenres = [];
  var doubanItems = [];
  var doubanRenderedIds = new Set();
  var doubanObserver = null;
  var doubanClickHandler = null;

  function __doubanCleanup() {
    if (doubanObserver) {
      doubanObserver.disconnect();
      doubanObserver = null;
    }
    if (doubanClickHandler) {
      document.removeEventListener('click', doubanClickHandler);
      doubanClickHandler = null;
    }
  }

  if (typeof window.__pjaxOnLeave === 'function') {
    window.__pjaxOnLeave(__doubanCleanup);
  }

  function initDoubanPage() {
    __doubanCleanup();

    if (!document.querySelector('.douban-page')) return;

    doubanType = doubanType || 'movie';
    doubanStatus = doubanStatus || 'done';
    doubanFinished = false;
    doubanLoading = false;
    doubanPage = 1;
    doubanGenres = doubanGenres || [];
    doubanItems = doubanItems || [];
    doubanRenderedIds = new Set();

    translateNav();
    loadInitialType();
    bindEvents();

    if (doubanType === 'movie') fetchGenres();
    fetchData();
    observeLoadMore();
  }

  function translateNav() {
    var names = { movie: '电影', book: '图书', music: '音乐', game: '游戏', drama: '舞台剧' };
    document.querySelectorAll('.douban-nav-item').forEach(function (el) {
      var name = names[el.dataset.type];
      if (name) el.textContent = name;
    });
  }

  function loadInitialType() {
    var activeNav = document.querySelector('.douban-nav-item.is-active');
    var listType = document.querySelector('.douban-list') && document.querySelector('.douban-list').dataset.type;
    doubanType = activeNav && activeNav.dataset.type || listType || doubanType;
  }

  function observeLoadMore() {
    if (doubanObserver) {
      doubanObserver.disconnect();
    }

    var sentinel = document.querySelector('.block-more');
    if (!sentinel) return;

    doubanObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !doubanFinished && !doubanLoading) {
          doubanPage++;
          fetchData(true);
        }
      });
    }, { rootMargin: '100px' });

    doubanObserver.observe(sentinel);
  }

  function bindEvents() {
    if (doubanClickHandler) {
      document.removeEventListener('click', doubanClickHandler);
    }

    doubanClickHandler = function (e) {
      var nav = e.target.closest('.douban-nav-item');
      if (nav && !nav.classList.contains('is-active')) {
        switchType(nav);
      }

      var genre = e.target.closest('.douban-genre-item');
      if (genre) toggleGenre(genre);

      var status = e.target.closest('.douban-status-item');
      if (status && !status.classList.contains('is-active')) {
        switchStatus(status);
      }
    };

    document.addEventListener('click', doubanClickHandler);
  }

  function switchType(nav) {
    doubanGenres = [];
    doubanType = nav.dataset.type;
    doubanRenderedIds.clear();
    toggleGenres();
    if (doubanType !== 'book') {
      fetchGenres();
    } else {
      var genresEl = document.querySelector('.douban-genres');
      if (genresEl) genresEl.innerHTML = '';
    }
    updateActive(nav);
  }

  function toggleGenre(el) {
    var text = el.textContent;
    var idx = doubanGenres.indexOf(text);
    if (idx > -1) {
      doubanGenres.splice(idx, 1);
      el.classList.remove('is-active');
    } else {
      doubanGenres.push(text);
      el.classList.add('is-active');
    }
    doubanPage = 1;
    doubanFinished = false;
    doubanItems = [];
    doubanRenderedIds.clear();
    fetchData();
  }

  function switchStatus(el) {
    var oldActive = document.querySelector('.douban-status-item.is-active');
    if (oldActive) oldActive.classList.remove('is-active');
    el.classList.add('is-active');
    doubanStatus = el.dataset.status;
    doubanGenres = [];
    doubanRenderedIds.clear();
    document.querySelectorAll('.douban-genre-item').forEach(function (item) { item.classList.remove('is-active'); });
    var list = document.querySelector('.douban-list');
    if (list) list.innerHTML = '';
    doubanPage = 1;
    doubanFinished = false;
    doubanItems = [];
    fetchData();
  }

  function toggleGenres() {
    var genresEl = document.querySelector('.douban-genres');
    if (genresEl) genresEl.classList.toggle('u-hide', doubanType === 'book');
  }

  function updateActive(nav) {
    document.querySelectorAll('.douban-nav-item.is-active').forEach(function (el) { el.classList.remove('is-active'); });
    nav.classList.add('is-active');
    doubanPage = 1;
    doubanFinished = false;
    doubanItems = [];
    doubanRenderedIds.clear();
    fetchData();
  }

  function fetchGenres() {
    var el = document.querySelector('.douban-genres');
    if (!el) return;
    el.innerHTML = '';

    fetch('/apis/api.douban.moony.la/v1alpha1/doubanmovies/-/genres?type=' + doubanType)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.length) {
          el.innerHTML = data.map(function (item) { return '<span class="douban-genre-item">' + item + '</span>'; }).join('');
        }
      });
  }

  function fetchData(isLoadMore) {
    if (doubanLoading) return;
    doubanLoading = true;

    if (isLoadMore) {
      showLoadingMore();
    } else {
      showLoading();
    }

    var url = new URL('/apis/api.douban.moony.la/v1alpha1/doubanmovies', location.origin);
    url.searchParams.set('page', doubanPage);
    url.searchParams.set('size', '10');
    url.searchParams.set('type', doubanType);
    url.searchParams.set('status', doubanStatus);
    doubanGenres.forEach(function (g) { url.searchParams.append('genre', g); });

    fetch(url.href)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.items && data.items.length) {
          doubanItems.push.apply(doubanItems, data.items);
          render(isLoadMore);
        } else {
          if (!doubanItems.length) renderEmpty();
          doubanFinished = true;
          if (isLoadMore) hideLoadingMore();
        }
        doubanLoading = false;
      })
      .catch(function () {
        if (!doubanItems.length) renderEmpty();
        hideLoadingMore();
        doubanLoading = false;
      });
  }

  function showLoading() {
    var list = document.querySelector('.douban-list');
    if (list) list.innerHTML = '<div class="douban-loading"><div class="douban-loading-dot"></div><div class="douban-loading-dot"></div><div class="douban-loading-dot"></div></div>';
  }

  function showLoadingMore() {
    var blockMore = document.querySelector('.block-more');
    if (blockMore) blockMore.innerHTML = '<div class="douban-loading"><div class="douban-loading-dot"></div><div class="douban-loading-dot"></div><div class="douban-loading-dot"></div></div>';
  }

  function hideLoadingMore() {
    var blockMore = document.querySelector('.block-more');
    if (blockMore) blockMore.innerHTML = '';
  }

  function render(isLoadMore) {
    var list = document.querySelector('.douban-list');
    if (!list || !doubanItems.length) return;

    if (isLoadMore) {
      var fragment = document.createDocumentFragment();
      var newItems = doubanItems.slice(-10).filter(function (item) {
        if (doubanRenderedIds.has(item.spec.id)) return false;
        doubanRenderedIds.add(item.spec.id);
        return true;
      });
      newItems.forEach(function (item) {
        fragment.appendChild(createItemEl(item));
      });
      list.appendChild(fragment);
    } else {
      doubanRenderedIds.clear();
      list.innerHTML = doubanItems.map(function (item) {
        doubanRenderedIds.add(item.spec.id);
        return createItemHTML(item);
      }).join('');
    }

    if (doubanFinished) {
      var blockMore = document.querySelector('.block-more');
      if (blockMore) blockMore.innerHTML = '';
    }
  }

  function createItemHTML(item) {
    var time = item.faves && item.faves.createTime ? new Date(item.faves.createTime) : null;
    var date = time ? time.getFullYear() + '-' + String(time.getMonth() + 1).padStart(2, '0') + '-' + String(time.getDate()).padStart(2, '0') : '';
    var score = item.spec.score > 0 ? item.spec.score : null;
    var tags = item.spec.genres && item.spec.genres.length ? item.spec.genres.map(function (g) { return '<span class="douban-tag">' + g + '</span>'; }).join('') : '<span class="douban-tag">暂无标签</span>';

    return '<div class="douban-item">' +
      '<div class="douban-icon">' + getIcon() + '</div>' +
      '<div class="douban-card">' +
      '<div class="douban-card-header">' +
      '<span class="douban-time">' + date + '</span>' +
      '<span class="douban-score">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="#f5c518"><path d="M12 20.1l5.82 3.682c1.066.675 2.37-.322 2.09-1.584l-1.543-6.926 5.146-4.667c.94-.85.435-2.465-.799-2.567l-6.773-.602L13.29.89a1.38 1.38 0 0 0-2.581 0l-2.65 6.53-6.774.602C.052 8.126-.453 9.74.486 10.59l5.147 4.666-1.542 6.926c-.28 1.262 1.023 2.26 2.09 1.585L12 20.099z"/></svg>' +
      (score || '暂无评分') +
      '</span>' +
      '</div>' +
      '<div class="douban-content">' +
      '<a href="' + item.spec.link + '" target="_blank" rel="noopener" class="douban-poster-wrap">' +
      '<img src="' + item.spec.poster + '" referrerpolicy="unsafe-url" class="douban-poster" loading="lazy" alt="' + item.spec.name + '" />' +
      '</a>' +
      '<div class="douban-info">' +
      '<div class="douban-info-main">' +
      '<div class="douban-name">' +
      '<a href="' + item.spec.link + '" target="_blank" rel="noopener">' + item.spec.name + '</a>' +
      '</div>' +
      '<div class="douban-faves-score">' +
      Array.from({ length: 5 }, function (_, i) { return '<svg class="douban-star ' + (item.faves && item.faves.score && i < item.faves.score ? 'is-active' : '') + '" width="14" height="14" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>'; }).join('') +
      '</div>' +
      '<div class="douban-tags">' + tags + '</div>' +
      (item.spec.cardSubtitle ? '<div class="douban-desc">' + item.spec.cardSubtitle + '</div>' : '') +
      '</div>' +
      '<div class="douban-actions">' +
      '<button class="douban-download" onclick="Douban.download(\'' + item.spec.poster + '\', \'' + item.spec.name + '\')">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
      '下载海报' +
      '</button>' +
      (item.faves && item.faves.remark ? '<button class="douban-remark-btn" onclick="Douban.showRemarkModal(\'' + escapeQuote(item.faves.remark) + '\', \'' + escapeQuote(item.spec.name) + '\')">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' +
      '我的短评' +
      '</button>' : '') +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  function createItemEl(item) {
    var div = document.createElement('div');
    div.innerHTML = createItemHTML(item);
    return div.firstElementChild;
  }

  function renderEmpty() {
    var list = document.querySelector('.douban-list');
    if (list) list.innerHTML = '<div class="douban-empty">暂无数据</div>';
  }

  function getIcon() {
    var icons = {
      movie: '<svg viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>',
      book: '<svg viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>',
      music: '<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
      game: '<svg viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2z"/></svg>',
      drama: '<svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>'
    };
    return icons[doubanType] || icons.movie;
  }

  function escapeQuote(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDoubanPage);
  } else {
    initDoubanPage();
  }

  window.Douban = {
    download: function (url, name) {
      fetch(url)
        .then(function (r) { return r.blob(); })
        .then(function (blob) {
          var link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = name + '-poster.jpg';
          link.click();
        })
        .catch(function () {
          window.open(url, '_blank');
        });
    },

    showRemarkModal: function (remark, name) {
      var modal = document.getElementById('douban-remark-modal');
      var nameEl = modal && modal.querySelector('.douban-remark-name');
      var body = modal && modal.querySelector('.douban-remark-body');
      if (nameEl) nameEl.textContent = name;
      if (body) body.textContent = remark;
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    },

    closeRemarkModal: function () {
      var modal = document.getElementById('douban-remark-modal');
      if (modal) modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };
})();
