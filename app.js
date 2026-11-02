
let db = { cats: [], reports: [], resources: [] };
let state = { view: 'home', theme: localStorage.getItem('theme') || 'light', filter: 'all', search: '' };
let favorites = JSON.parse(localStorage.getItem('favs') || '[]');

async function init() {
    const res = await fetch('data.json');
    db = await res.json();
    
    applyTheme(state.theme);
    setupEventListeners();
    renderView();
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.getElementById('theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme(state.theme);
    });

    // Navigation Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', 'false'));
            e.target.setAttribute('aria-selected', 'true');
            state.view = e.target.dataset.v;
            state.filter = 'all'; // reset filter on view change
            renderView();
        });
    });

    // Search functionality (Dynamic Real-time)
    document.getElementById('q').addEventListener('input', (e) => {
        state.search = e.target.value.toLowerCase();
        if(state.view !== 'reports') {
            document.querySelector('[data-v="reports"]').click();
        } else {
            renderReports(true);
        }
    });
}

function renderView() {
    const main = document.getElementById('main');
    main.style.animation = 'none';
    main.offsetHeight; // trigger reflow
    main.style.animation = 'fadeIn 0.4s ease-out';
    
    if (state.view === 'home') {
        renderHome(main);
    } else if (state.view === 'reports') {
        renderReportsCardLayout(main);
    } else {
        main.innerHTML = `<div style="text-align:center; padding: 50px;"><h2 style="color:var(--muted)">قريباً...</h2><p>هذا القسم قيد التطوير.</p></div>`;
    }
}

function renderHome(container) {
    const totalReports = db.reports.length;
    const totalFavs = favorites.length;
    
    container.innerHTML = `
        <div style="margin-bottom: 30px;">
            <h2 style="font-size: 28px; margin-bottom: 10px;">لوحة المتابعة</h2>
            <p style="color: var(--muted)">نظرة عامة على الموارد الحقوقية والقانونية المتاحة في المكتبة.</p>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-num counter" data-target="${totalReports}">0</div>
                <div class="stat-label">تقارير وأبحاث حول تونس</div>
            </div>
            <div class="stat-card">
                <div class="stat-num counter" data-target="${db.cats.length}">0</div>
                <div class="stat-label">تصنيفات قانونية</div>
            </div>
            <div class="stat-card">
                <div class="stat-num counter" data-target="${totalFavs}">0</div>
                <div class="stat-label">عناصر في المفضلة</div>
            </div>
        </div>
        <div style="background: var(--accent-soft); padding: 30px; border-radius: var(--radius); border-right: 4px solid var(--accent);">
            <h3>ابدأ البحث الآن</h3>
            <p style="margin-top: 10px;">استخدم شريط البحث بالأعلى للوصول الفوري إلى التقارير والوثائق الحقوقية عبر الكلمات المفتاحية، أو تصفح قسم الأبحاث.</p>
            <button class="btn btn-primary" style="margin-top: 15px; width: auto;" onclick="document.querySelector('[data-v=\'reports\']').click()">استعراض التقارير</button>
        </div>
    `;
    animateCounters();
}

function renderReportsCardLayout(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:end; margin-bottom:20px;">
            <div>
                <h2>الأبحاث والتقارير</h2>
                <p style="color:var(--muted)">مكتبة التقارير حول تونس مرتبة زمنياً.</p>
            </div>
        </div>
        <div class="filters" id="filters-container">
            <button class="filter-btn active" data-f="all">الكل</button>
            <button class="filter-btn" data-f="fav">المفضلة فقط ⭐</button>
            <button class="filter-btn" data-f="2025">2025</button>
            <button class="filter-btn" data-f="2024">2024</button>
            <button class="filter-btn" data-f="2023">2023</button>
        </div>
        <div id="reports-grid" class="cards"></div>
    `;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.filter = e.target.dataset.f;
            renderReports(false);
        });
    });
    
    renderReports(false);
}

function renderReports(isSearch) {
    const grid = document.getElementById('reports-grid');
    if(!grid) return;
    
    grid.style.opacity = '0'; // Smooth transition out
    
    setTimeout(() => {
        let filtered = db.reports;
        
        // Apply Filter
        if (state.filter === 'fav') {
            filtered = filtered.filter(r => favorites.includes(r.id));
        } else if (state.filter !== 'all') {
            filtered = filtered.filter(r => r.year.toString() === state.filter);
        }
        
        // Apply Search
        if (state.search.trim() !== '') {
            filtered = filtered.filter(r => 
                r.title.toLowerCase().includes(state.search) || 
                r.org.toLowerCase().includes(state.search) ||
                r.topics.join(' ').toLowerCase().includes(state.search)
            );
        }
        
        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--muted);">لا توجد نتائج مطابقة للبحث أو التصفية.</div>`;
        } else {
            grid.innerHTML = filtered.map(rep => {
                const isFav = favorites.includes(rep.id);
                // Highlight text if searching
                let title = rep.title;
                if(state.search) {
                    const regex = new RegExp(state.search, 'gi');
                    title = title.replace(regex, match => `<mark style="background:var(--warn-soft);color:var(--warn);">${match}</mark>`);
                }
                
                return `
                <div class="card ${isFav ? 'tn-highlight' : ''}">
                    <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav('${rep.id}')">★</button>
                    <h3>${title}</h3>
                    <div class="card-meta">
                        <span class="chip-sm">${rep.year}</span>
                        <span>🏢 ${rep.org}</span>
                    </div>
                    <p style="font-size:14px; color:var(--muted); margin-top:5px; flex-grow:1;">${rep.abstract}</p>
                    <div class="card-meta" style="margin-bottom: 10px;">
                        ${rep.topics.map(t => `<span class="chip-sm" style="background:var(--accent-soft); color:var(--accent)">#${t}</span>`).join('')}
                    </div>
                    <div class="actions">
                        <a href="${rep.url_pdf}" target="_blank" class="btn btn-primary">تحميل PDF</a>
                        <button class="btn btn-outline" onclick="alert('بيانات الإحالة: ${rep.org}, ${rep.year}. ${rep.title}')">إحالة</button>
                    </div>
                </div>`;
            }).join('');
        }
        
        grid.style.opacity = '1'; // Smooth transition in
    }, 200);
}

window.toggleFav = function(id) {
    if(favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
    } else {
        favorites.push(id);
    }
    localStorage.setItem('favs', JSON.stringify(favorites));
    renderReports(false); // Re-render to update UI
};

function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const increment = target / 20; // adjust speed
        let count = 0;
        const updateCount = () => {
            count += increment;
            if (count < target) {
                counter.innerText = Math.ceil(count);
                requestAnimationFrame(updateCount);
            } else {
                counter.innerText = target;
            }
        };
        updateCount();
    });
}

document.addEventListener('DOMContentLoaded', init);
