class HALO_DOUBAN {
    constructor() {
        this.ver = "1.2.4";
        this.type = "movie";
        this.status = "done";
        this.finished = false;
        this.paged = 1;
        this.genre_list = [];
        this.genre = [];
        this.subjects = [];
        this._init();
    }

    on(event, selector, callback) {
        document.querySelectorAll(selector).forEach(item => {
            item.addEventListener(event, callback);
        });
    }

    _addSearchParams(url, params = {}) {
        url = new URL(url, window.location.origin);
        return new URL(`${url.origin}${url.pathname}?${new URLSearchParams([...Array.from(url.searchParams.entries()), ...Object.entries(params)])}`).href;
    }

    _init() {
        if (!document.querySelector(".db--container")) return;
        
        this._translateNavItems();
        
        const currentNav = document.querySelector(".db--navItem.current") || document.querySelector(".filter-btn.current");
        if (currentNav) {
            this.type = currentNav.dataset.type;
        }
        
        document.querySelector(".db--list").dataset.type && (this.type = document.querySelector(".db--list").dataset.type);
        
        if (this.type === "movie") {
            this._fetchGenres();
        }
        
        this._fetchData();
        this._bindEvents();
    }

    _translateNavItems() {
        const typeNames = {
            movie: '电影',
            book: '图书',
            music: '音乐',
            game: '游戏',
            drama: '舞台剧'
        };
        document.querySelectorAll(".db--navItem").forEach(item => {
            const type = item.dataset.type;
            if (typeNames[type]) {
                item.textContent = typeNames[type];
            }
        });
    }

    _bindEvents() {
        this._handleNavClick();
        this._statusChange();
        this._handleGenreClick();
        this._handleScroll();
    }

    _fetchGenres() {
        document.querySelector(".db--genres").innerHTML = "";
        fetch(this._addSearchParams("/apis/api.douban.moony.la/v1alpha1/doubanmovies/-/genres", { type: this.type }))
            .then(response => response.json())
            .then(data => {
                if (data.length) {
                    this.genre_list = data;
                    this._renderGenre();
                }
            });
        return true;
    }

    _handleNavClick() {
        this.on("click", ".db--navItem, .filter-btn", (e) => {
            const target = e.currentTarget;
            if (target.classList.contains("current")) return;
            
            this.genre = [];
            this.type = target.dataset.type;
            
            if (this.type !== "book") {
                this._fetchGenres();
                document.querySelector(".db--genres")?.classList.remove("u-hide");
            } else {
                document.querySelector(".db--genres")?.classList.add("u-hide");
            }
            
            document.querySelector(".db--list").innerHTML = "";
            this._showLoading();
            
            document.querySelector(".db--navItem.current")?.classList.remove("current");
            document.querySelector(".filter-btn.current")?.classList.remove("current");
            target.classList.add("current");
            
            this.paged = 1;
            this.finished = false;
            this.subjects = [];
            this._fetchData();
        });
    }

    _statusChange() {
        this.on("click", ".db--typeItem", (e) => {
            const target = e.currentTarget;
            if (target.classList.contains("is-active")) return;
            
            document.querySelector(".db--list").innerHTML = "";
            this._showLoading();
            document.querySelector(".db--typeItem.is-active")?.classList.remove("is-active");
            target.classList.add("is-active");
            
            this.status = target.dataset.status;
            this.paged = 1;
            this.finished = false;
            this.subjects = [];
            this._fetchData();
        });
    }

    _handleGenreClick() {
        this.on("click", ".db--genreItem", (e) => {
            const target = e.currentTarget;
            if (target.classList.contains("is-active")) {
                const index = this.genre.indexOf(target.innerText);
                if (index > -1) {
                    target.classList.remove("is-active");
                    this.genre.splice(index, 1);
                }
            } else {
                target.classList.add("is-active");
                this.genre.push(target.innerText);
            }
            
            this.paged = 1;
            this.finished = false;
            this.subjects = [];
            this._fetchData();
        });
    }

    _renderGenre() {
        const genresEl = document.querySelector(".db--genres");
        if (!genresEl) return;
        
        genresEl.innerHTML = this.genre_list.map(item => 
            `<span class="db--genreItem" data-genre="${item}">${item}</span>`
        ).join("");
        
        this._handleGenreClick();
    }

    _showLoading() {
        document.querySelector(".lds-ripple")?.classList.remove("u-hide");
    }

    _hideLoading() {
        document.querySelector(".lds-ripple")?.classList.add("u-hide");
    }

    _fetchData() {
        const url = new URL("/apis/api.douban.moony.la/v1alpha1/doubanmovies", window.location.origin);
        url.searchParams.set("page", this.paged);
        url.searchParams.set("size", "20");
        url.searchParams.set("type", this.type);
        url.searchParams.set("status", this.status);
        
        this.genre.forEach(g => url.searchParams.append("genre", g));
        
        fetch(url.href)
            .then(response => response.json())
            .then(data => {
                if (data.items && data.items.length) {
                    this.subjects = [...this.subjects, ...data.items];
                    this._renderTemplate();
                } else {
                    if (!this.subjects.length) {
                        this._renderEmpty();
                    }
                    this.finished = true;
                }
                this._hideLoading();
            })
            .catch(() => {
                this._hideLoading();
                if (!this.subjects.length) {
                    this._renderEmpty();
                }
            });
    }

    _renderTemplate() {
        const listEl = document.querySelector(".db--list");
        if (!listEl) return;
        this._renderListTemplate();
    }

    _renderEmpty() {
        const listEl = document.querySelector(".db--list");
        if (listEl) {
            listEl.innerHTML = '<div class="db--empty">暂无数据</div>';
        }
    }

    _getTypeIcon(type) {
        const icons = {
            movie: '<svg viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>',
            book: '<svg viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>',
            music: '<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
            game: '<svg viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
            drama: '<svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM8 18H5v-2h3v2zm3-4H5v-2h6v2zm2-4H5V8h6v2zm2-4h-2v2h2V6z"/></svg>'
        };
        return icons[type] || icons.movie;
    }

    _getStatusLabel(status) {
        const labels = {
            done: '看过',
            doing: '在看',
            mark: '想看'
        };
        return labels[status] || '';
    }

    _renderListTemplate() {
        const listEl = document.querySelector(".db--list");
        if (!listEl || !this.subjects.length) return;
        
        listEl.innerHTML = this.subjects.map(item => {
            const createTime = item.faves?.createTime ? new Date(item.faves.createTime) : null;
            const timeStr = createTime ? `${createTime.getFullYear()}-${String(createTime.getMonth() + 1).padStart(2, '0')}-${String(createTime.getDate()).padStart(2, '0')}` : '';
            
            return `
            <div class="db--item db--item__${item.spec.dataType || this.type}">
                <div class="db--icon">
                    ${this._getTypeIcon(item.spec.dataType || this.type)}
                </div>
                <div class="db--card">
                    <div class="db--card-header">
                        <span class="db--time-tag">${timeStr}</span>
                        ${item.spec.score > 0 ? `
                            <span class="db--score">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 20.1l5.82 3.682c1.066.675 2.37-.322 2.09-1.584l-1.543-6.926 5.146-4.667c.94-.85.435-2.465-.799-2.567l-6.773-.602L13.29.89a1.38 1.38 0 0 0-2.581 0l-2.65 6.53-6.774.602C.052 8.126-.453 9.74.486 10.59l5.147 4.666-1.542 6.926c-.28 1.262 1.023 2.26 2.09 1.585L12 20.099z"/>
                                </svg>
                                ${item.spec.score}
                            </span>
                        ` : ''}
                    </div>
                    <div class="db--content">
                        <a href="${item.spec.link}" target="_blank" rel="noopener" style="position: relative; display: inline-block;">
                            <img src="${item.spec.poster}" referrerpolicy="unsafe-url" class="db--image" loading="lazy" alt="${item.spec.name}" />
                            <a class="db--download" href="javascript:void(0)" onclick="DoubanPlugin.downloadImage('${item.spec.poster}', '${item.spec.name}')" title="下载海报">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                <span>下载海报</span>
                            </a>
                        </a>
                        <div class="db--info">
                            <div class="db--title">
                                <a href="${item.spec.link}" target="_blank" rel="noopener">${item.spec.name}</a>
                            </div>
                            <div class="db--itemGenres">
                                ${item.spec.genres ? item.spec.genres.map(g => `<span class="db--genre-tag">${g}</span>`).join('') : ''}
                            </div>
                            ${item.spec.cardSubtitle ? `<div class="db--desc">${item.spec.cardSubtitle}</div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `}).join("");
    }

    _handleScroll() {
        let ticking = false;
        window.addEventListener("scroll", () => {
            if (ticking) return;
            ticking = true;
            
            requestAnimationFrame(() => {
                const blockMore = document.querySelector(".block-more");
                if (!blockMore) {
                    ticking = false;
                    return;
                }
                
                const rect = blockMore.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight;
                
                if (isVisible && !this.finished && !document.querySelector(".lds-ripple")?.classList.contains("u-hide")) {
                    this.paged++;
                    this._fetchData();
                }
                
                ticking = false;
            });
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.haloDouban = new HALO_DOUBAN();
});

document.addEventListener("pjax:complete", () => {
    if (document.querySelector(".db--container")) {
        window.haloDouban = new HALO_DOUBAN();
    }
});

window.DoubanPlugin = {
    async downloadImage(url, name) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = `${name}-poster.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("下载失败:", err);
            window.open(url, "_blank");
        }
    }
};
