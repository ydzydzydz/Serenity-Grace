/**
 * 豆瓣页面脚本
 */
class DoubanPage {
    constructor() {
        this.type = "movie";
        this.status = "done";
        this.finished = false;
        this.loading = false;
        this.page = 1;
        this.genres = [];
        this.items = [];
        this._init();
    }

    _init() {
        if (!document.querySelector(".douban-page")) return;

        this._translateNav();
        this._loadInitialType();
        this._bindEvents();

        if (this.type === "movie") this._fetchGenres();
        this._fetchData();
        this._observeLoadMore();
    }

    _translateNav() {
        const names = { movie: "电影", book: "图书", music: "音乐", game: "游戏", drama: "舞台剧" };
        document.querySelectorAll(".douban-nav-item").forEach(el => {
            const name = names[el.dataset.type];
            if (name) el.textContent = name;
        });
    }

    _loadInitialType() {
        const activeNav = document.querySelector(".douban-nav-item.is-active");
        const listType = document.querySelector(".douban-list")?.dataset.type;
        this.type = activeNav?.dataset.type || listType || this.type;
    }

    _observeLoadMore() {
        const sentinel = document.querySelector(".block-more");
        if (!sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.finished && !this.loading) {
                    this.page++;
                    this._fetchData();
                }
            });
        }, { rootMargin: "100px" });

        observer.observe(sentinel);
    }

    _bindEvents() {
        document.addEventListener("click", e => {
            const nav = e.target.closest(".douban-nav-item");
            if (nav && !nav.classList.contains("is-active")) {
                this._switchType(nav);
            }

            const genre = e.target.closest(".douban-genre-item");
            if (genre) this._toggleGenre(genre);

            const status = e.target.closest(".douban-status-item");
            if (status && !status.classList.contains("is-active")) {
                this._switchStatus(status);
            }
        });
    }

    _switchType(nav) {
        this.genres = [];
        this.type = nav.dataset.type;
        this._toggleGenres();
        if (this.type !== "book") this._fetchGenres();
        this._updateActive(nav);
    }

    _toggleGenre(el) {
        const text = el.textContent;
        const idx = this.genres.indexOf(text);
        if (idx > -1) {
            this.genres.splice(idx, 1);
            el.classList.remove("is-active");
        } else {
            this.genres.push(text);
            el.classList.add("is-active");
        }
        this.page = 1;
        this.finished = false;
        this.items = [];
        this._fetchData();
    }

    _switchStatus(el) {
        document.querySelector(".douban-status-item.is-active")?.classList.remove("is-active");
        el.classList.add("is-active");
        this.status = el.dataset.status;
        this.genres = [];
        document.querySelectorAll(".douban-genre-item").forEach(item => item.classList.remove("is-active"));
        document.querySelector(".douban-list").innerHTML = "";
        document.querySelector(".lds-ripple")?.classList.remove("u-hide");
        this.page = 1;
        this.finished = false;
        this.items = [];
        this._fetchData();
    }

    _toggleGenres() {
        const genresEl = document.querySelector(".douban-genres");
        if (genresEl) genresEl.classList.toggle("u-hide", this.type === "book");
    }

    _updateActive(nav) {
        document.querySelector(".douban-list").innerHTML = "";
        document.querySelector(".lds-ripple")?.classList.remove("u-hide");
        document.querySelectorAll(".douban-nav-item.is-active").forEach(el => el.classList.remove("is-active"));
        nav.classList.add("is-active");
        this.page = 1;
        this.finished = false;
        this.items = [];
        this._fetchData();
    }

    _fetchGenres() {
        const el = document.querySelector(".douban-genres");
        if (!el) return;
        el.innerHTML = "";

        fetch(`/apis/api.douban.moony.la/v1alpha1/doubanmovies/-/genres?type=${this.type}`)
            .then(r => r.json())
            .then(data => {
                if (data.length) {
                    el.innerHTML = data.map(item => `<span class="douban-genre-item">${item}</span>`).join("");
                }
            });
    }

    _fetchData() {
        if (this.loading) return;
        this.loading = true;

        const url = new URL("/apis/api.douban.moony.la/v1alpha1/doubanmovies", location.origin);
        url.searchParams.set("page", this.page);
        url.searchParams.set("size", "10");
        url.searchParams.set("type", this.type);
        url.searchParams.set("status", this.status);
        this.genres.forEach(g => url.searchParams.append("genre", g));

        fetch(url.href)
            .then(r => r.json())
            .then(data => {
                if (data.items?.length) {
                    this.items.push(...data.items);
                    this._render();
                } else {
                    if (!this.items.length) this._renderEmpty();
                    this.finished = true;
                }
                this._hideLoading();
                this.loading = false;
            })
            .catch(() => {
                this._hideLoading();
                if (!this.items.length) this._renderEmpty();
                this.loading = false;
            });
    }

    _hideLoading() {
        document.querySelector(".lds-ripple")?.classList.add("u-hide");
    }

    _render() {
        const list = document.querySelector(".douban-list");
        if (!list || !this.items.length) return;

        list.innerHTML = this.items.map(item => {
            const time = item.faves?.createTime ? new Date(item.faves.createTime) : null;
            const date = time ? `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, "0")}-${String(time.getDate()).padStart(2, "0")}` : "";
            const score = item.spec.score > 0 ? item.spec.score : null;
            const tags = item.spec.genres?.map(g => `<span class="douban-tag">${g}</span>`).join("") || "";

            return `
            <div class="douban-item">
                <div class="douban-icon">${this._icon()}</div>
                <div class="douban-card">
                    <div class="douban-card-header">
                        <span class="douban-time">${date}</span>
                        <span class="douban-score">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#f5c518"><path d="M12 20.1l5.82 3.682c1.066.675 2.37-.322 2.09-1.584l-1.543-6.926 5.146-4.667c.94-.85.435-2.465-.799-2.567l-6.773-.602L13.29.89a1.38 1.38 0 0 0-2.581 0l-2.65 6.53-6.774.602C.052 8.126-.453 9.74.486 10.59l5.147 4.666-1.542 6.926c-.28 1.262 1.023 2.26 2.09 1.585L12 20.099z"/></svg>
                            ${score || "暂无评分"}
                        </span>
                    </div>
                    <div class="douban-content">
                        <a href="${item.spec.link}" target="_blank" rel="noopener" class="douban-poster-wrap">
                            <img src="${item.spec.poster}" referrerpolicy="unsafe-url" class="douban-poster" loading="lazy" alt="${item.spec.name}" />
                        </a>
                        <div class="douban-info">
                            <div class="douban-info-main">
                                <div class="douban-name">
                                    <a href="${item.spec.link}" target="_blank" rel="noopener">${item.spec.name}</a>
                                </div>
                                <div class="douban-tags">${tags}</div>
                                ${item.spec.cardSubtitle ? `<div class="douban-desc">${item.spec.cardSubtitle}</div>` : ""}
                            </div>
                            <button class="douban-download" onclick="Douban.download('${item.spec.poster}', '${item.spec.name}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                下载海报
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join("");
    }

    _renderEmpty() {
        const list = document.querySelector(".douban-list");
        if (list) list.innerHTML = '<div class="douban-empty">暂无数据</div>';
    }

    _icon() {
        const icons = {
            movie: '<svg viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>',
            book: '<svg viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>',
            music: '<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
            game: '<svg viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2z"/></svg>',
            drama: '<svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>'
        };
        return icons[this.type] || icons.movie;
    }
}

document.addEventListener("DOMContentLoaded", () => { window.doubanPage = new DoubanPage(); });
document.addEventListener("pjax:complete", () => {
    if (document.querySelector(".douban-page")) window.doubanPage = new DoubanPage();
});

window.Douban = {
    async download(url, name) {
        try {
            const blob = await fetch(url).then(r => r.blob());
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${name}-poster.jpg`;
            link.click();
        } catch {
            window.open(url, "_blank");
        }
    }
};
