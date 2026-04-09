const DEFAULT_PRODUCT_IMAGE = "/img/2V56D896C-38NO_1_WIN22.avif";
let _productsCache = null;
let _productsCachePromise = null;
const TIERS = [
    { name: "Đồng", min: 1_000_000 },
    { name: "Bạc", min: 3_000_000 },
    { name: "Vàng", min: 5_000_000 },
    { name: "Kim Cương", min: 10_000_000 }
];
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function toast(message, type = "info") {
    const el = document.createElement('div');
    el.className = 'toast';
    const title = type === "error" ? "Lỗi" : type === "success" ? "Thành công" : "Thông báo";
    el.innerHTML = `<strong>Itoshira</strong> · ${title}<div style="margin-top:6px; color:#fff;">${message}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
}

async function fetchProductsCached() {
    if (_productsCache) return _productsCache;
    if (_productsCachePromise) return _productsCachePromise;
    _productsCachePromise = fetch('/api/products')
        .then(r => r.json())
        .then(p => (_productsCache = Array.isArray(p) ? p : []))
        .catch(() => (_productsCache = []))
        .finally(() => { _productsCachePromise = null; });
    return _productsCachePromise;
}

function renderProductCards(list, container) {
    if (!container) return;
    const badgeText = (container.dataset.badge || "NEW").toUpperCase();
    const salePercent = Math.max(0, Math.min(90, Number(container.dataset.salePercent ?? 0)));
    const showSale = badgeText === "SALE" && salePercent > 0;
    let items = Array.isArray(list) ? [...list] : [];
    const sortMode = (container.dataset.sort || '').toLowerCase();
    if (sortMode === 'cheap') items.sort((a, b) => Number(a?.price ?? 0) - Number(b?.price ?? 0));
    else if (sortMode === 'new') items.sort((a, b) => (Date.parse(b?.created_at ?? '') || 0) - (Date.parse(a?.created_at ?? '') || 0));
    const limit = Number(container.dataset.limit ?? 0);
    if (Number.isFinite(limit) && limit > 0) items = items.slice(0, limit);

    container.innerHTML = items.map(p => {
        const price = Number(p?.price ?? 0);
        const salePrice = showSale ? Math.round(price * (1 - salePercent / 100)) : price;
        const oldPriceHtml = showSale ? `<span class="old-price">${formatVnd(price)}</span> ` : "";

        return `
            <div class="card" onclick="openProductModal(${p.id})" style="cursor:pointer;">
                <div class="badge">${badgeText}</div>
                <img src="${DEFAULT_PRODUCT_IMAGE}" alt="${p.name ?? ''}" loading="lazy" />
                <h3>${p.name ?? ''}</h3>
                <p>${oldPriceHtml}${formatVnd(salePrice)}</p>
                <div class="actions">
                    <button class="buy" type="button" onclick="event.stopPropagation(); buyNow(${p.id})">Mua ngay</button>
                    <button class="cart" type="button" onclick="event.stopPropagation(); addToCart(${p.id})">Thêm vào giỏ</button>
                </div>
            </div>
        `;
    }).join('');
}

function getCart() {
    try {
        const raw = localStorage.getItem('cart');
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function setCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

async function addToCart(productId, qty = 1) {
    return addToCartInternal(productId, qty, { silent: false });
}

async function addToCartInternal(productId, qty = 1, { silent } = { silent: false }) {
    const id = Number(productId);
    if (!Number.isFinite(id)) return;

    const cart = getCart();
    const existing = cart.find(i => i.id === id);
    if (existing) {
        existing.qty += qty;
        setCart(cart);
        if (!silent) toast("Đã thêm vào giỏ!", "success");
        return;
    }

    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) {
        if (!silent) toast("Không tìm thấy sản phẩm.", "error");
        return;
    }
    const p = await res.json();
    cart.push({
        id,
        name: p?.name ?? '',
        price: Number(p?.price ?? 0),
        qty: qty,
        image: DEFAULT_PRODUCT_IMAGE,
        description: p?.description ?? ""
    });
    setCart(cart);
    if (!silent) toast("Đã thêm vào giỏ!", "success");
}

function formatVnd(n) {
    return `${Number(n ?? 0).toLocaleString()}đ`;
}

function renderCart() {
    const root = $('#cart-items');
    if (!root) return;

    const cart = getCart();
    if (cart.length === 0) {
        root.innerHTML = `<p>Chưa có sản phẩm nào.</p>`;
        const totalEl = $('#cart-total');
        if (totalEl) totalEl.textContent = formatVnd(0);
        return;
    }

    root.innerHTML = cart.map(item => `
        <div class="card" style="display:flex; gap:16px; align-items:center;">
            <img src="${item.image || DEFAULT_PRODUCT_IMAGE}" alt="${item.name || ''}" style="width:120px; height:120px; object-fit:cover; border-radius:10px;" />
            <div style="flex:1; text-align:left;">
                <h3 style="margin:0 0 6px;">${item.name || ''}</h3>
                <div style="margin:0 0 10px; font-weight:600;">${formatVnd(item.price)}</div>
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <button class="buy" type="button" onclick="updateQty(${item.id}, -1)">-</button>
                    <span>Số lượng: <b>${item.qty}</b></span>
                    <button class="buy" type="button" onclick="updateQty(${item.id}, 1)">+</button>
                    <button class="cart" type="button" onclick="removeFromCart(${item.id})">Xóa</button>
                </div>
            </div>
            <div style="min-width:140px; text-align:right; font-weight:700;">
                ${formatVnd(item.price * item.qty)}
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, i) => sum + (Number(i.price) * Number(i.qty)), 0);
    const totalEl = $('#cart-total');
    if (totalEl) totalEl.textContent = formatVnd(total);
}

function updateQty(productId, delta) {
    const id = Number(productId);
    const d = Number(delta);
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, (Number(item.qty) || 1) + d);
    setCart(cart);
    renderCart();
}

function removeFromCart(productId) {
    const id = Number(productId);
    const cart = getCart().filter(i => i.id !== id);
    setCart(cart);
    renderCart();
}

function ensureModal() {
    let backdrop = $('#product-modal');
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.id = 'product-modal';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
        <div class="modal-panel card" role="dialog" aria-modal="true" style="position:relative;">
            <h2 id="modal-title" style="margin:0; padding-right:110px;">Chi tiết sản phẩm</h2>
            <button class="buy" type="button" id="modal-close" style="position:absolute; top:14px; right:14px; margin:0;">Đóng</button>
            <div id="modal-body" style="margin-top:14px;"></div>
        </div>
    `;
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeProductModal();
    });
    document.body.appendChild(backdrop);
    backdrop.querySelector('#modal-close')?.addEventListener('click', closeProductModal);
    return backdrop;
}

function closeProductModal() {
    const backdrop = $('#product-modal');
    if (backdrop) backdrop.classList.remove('open');
}

async function openProductModal(productId) {
    const id = Number(productId);
    if (!Number.isFinite(id)) return;

    const backdrop = ensureModal();
    backdrop.classList.add('open');
    const body = backdrop.querySelector('#modal-body');
    if (body) body.innerHTML = `<p>Đang tải...</p>`;

    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) {
        if (body) body.innerHTML = `<p>Không tìm thấy sản phẩm.</p>`;
        return;
    }
    const p = await res.json();
    const price = Number(p?.price ?? 0);
    const desc = (p?.description ?? '').toString().trim();
    const titleEl = backdrop.querySelector('#modal-title');
    if (titleEl) titleEl.textContent = p?.name ?? 'Chi tiết sản phẩm';
    if (body) {
        body.innerHTML = `
            <div style="display:grid; grid-template-columns: 320px 1fr; gap:18px; align-items:start;">
                <img src="${DEFAULT_PRODUCT_IMAGE}" alt="${p?.name ?? ''}" style="width:100%; height:320px; object-fit:cover; border-radius:12px;" />
                <div style="display:flex; flex-direction:column; min-height:320px;">
                    <div style="font-size:18px; font-weight:700; margin-bottom:10px;">${formatVnd(price)}</div>
                    <div style="color:#444; line-height:1.5; margin-bottom:14px;">${desc || "Chưa có mô tả."}</div>
                    <div style="margin-top:auto; display:flex; gap:10px; flex-wrap:wrap;">
                        <button class="buy" type="button" onclick="buyNow(${id})">Mua ngay</button>
                        <button class="cart" type="button" onclick="addToCart(${id})">Thêm vào giỏ</button>
                    </div>
                </div>
            </div>
        `;
    }
}

async function loadProducts() {
    try {
        const products = await fetchProductsCached();

        const productContainer = $('.product-list') || $('.products');
        if (!productContainer) return;
        renderProductCards(products, productContainer);
    } catch (error) {
        console.error('Không lấy được dữ liệu sản phẩm:', error);
    }
}

function getUser() {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function getUserSpend(username) {
    if (!username) return 0;
    const raw = localStorage.getItem(`spend_${username}`);
    const n = Number(raw ?? 0);
    return Number.isFinite(n) ? n : 0;
}

function addUserSpend(username, amount) {
    if (!username) return;
    const current = getUserSpend(username);
    const next = current + Number(amount ?? 0);
    localStorage.setItem(`spend_${username}`, String(Math.max(0, Math.round(next))));
}

function logout() {
    localStorage.removeItem('user');
    toast("Đã đăng xuất!", "success");
    location.reload();
}

async function registerUser(event) {
    event.preventDefault();

    const full_name = document.getElementById('fullname')?.value?.trim();
    const email = document.getElementById('email')?.value?.trim();
    const username = document.getElementById('username')?.value?.trim();
    const password = document.getElementById('password')?.value ?? '';
    const password2 = document.getElementById('password2')?.value ?? '';

    if (!full_name || !email || !username || !password) {
        toast("Vui lòng nhập đầy đủ thông tin.", "error");
        return;
    }
    if (password !== password2) {
        toast("Mật khẩu nhập lại không khớp.", "error");
        return;
    }

    const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, username, password })
    });
    const result = await response.json().catch(() => ({}));
    toast(result.message || (response.ok ? "Đăng ký thành công!" : "Đăng ký thất bại"), response.ok ? "success" : "error");
    if (response.ok) window.location.href = 'login.html';
}

async function loginUser(event) {
    event.preventDefault();
    const username = document.getElementById('login_username')?.value?.trim();
    const password = document.getElementById('login_password')?.value ?? '';
    if (!username || !password) {
        toast("Vui lòng nhập username và mật khẩu.", "error");
        return;
    }

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        toast(result.message || "Đăng nhập thất bại", "error");
        return;
    }
    setUser(result.user);
    toast("Đăng nhập thành công!", "success");
    const params = new URLSearchParams(location.search);
    const next = params.get('next') || 'home.html';
    const checkout = params.get('checkout');
    const url = checkout ? `${next}?checkout=1` : next;
    window.location.href = url;
}

function buyNow(productId) {
    const user = getUser();
    if (!user?.username) {
        window.location.href = `login.html?next=cart.html&checkout=1`;
        return;
    }
    addToCartInternal(productId, 1, { silent: true }).then(() => {
        window.location.href = 'cart.html?checkout=1';
    });
}

function initAuthUi() {
    const user = getUser();
    const authBox = $('.auth');
    if (!authBox) return;
    if (user?.username) {
        const spend = getUserSpend(user.username);
        const { current, next } = getMemberTier(spend);
        const needMore = next ? Math.max(0, next.min - spend) : 0;

        authBox.innerHTML = `
            <a href="#" class="btn-login" id="account-trigger">Xin chào, ${user.username}!</a>
            <div class="account-dropdown" id="account-dropdown">
                <div class="row">
                    <div style="font-weight:800;">${user.full_name || user.username}</div>
                    <div class="member-badge small">${current.name}</div>
                </div>
                <div class="muted" style="margin-top:6px;">@${user.username}${user.email ? ` · ${user.email}` : ""}</div>
                <hr class="dropdown-divider" />
                <div style="margin-top:10px; line-height:1.6;">
                    <div><b>Tổng đã mua:</b> ${formatVnd(spend)}</div>
                    <div><b>Cần tiêu thêm:</b> ${next ? `${formatVnd(needMore)} (lên ${next.name})` : "Đã đạt hạng cao nhất"}</div>
                </div>
                <hr class="dropdown-divider" />
                <div class="dropdown-actions">
                    <button class="buy" type="button" onclick="logout()">Đăng xuất</button>
                </div>
            </div>
        `;

        const trigger = $('#account-trigger');
        const dropdown = $('#account-dropdown');
        if (trigger && dropdown) {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                dropdown.classList.toggle('open');
            });
            document.addEventListener('click', (e) => {
                const t = e.target;
                if (!(t instanceof Node)) return;
                if (dropdown.contains(t) || trigger.contains(t)) return;
                dropdown.classList.remove('open');
            });
        }
    }
}

function getMemberTier(spend) {
    let current = { name: "Chưa có", min: 0 };
    for (const t of TIERS) {
        if (spend >= t.min) current = t;
    }
    const next = TIERS.find(t => spend < t.min) || null;
    return { current, next };
}

document.addEventListener('DOMContentLoaded', () => {
    initAuthUi();
    loadProducts();
    renderCart();
    initCheckoutUi();
    initFiltersUi();

    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', registerUser);

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', loginUser);
});

function initCheckoutUi() {
    const authBox = $('#checkout-auth');
    const pm = $('#payment-methods');
    if (!authBox || !pm) return;

    const user = getUser();
    if (!user?.username) {
        authBox.innerHTML = `Bạn cần <a href="login.html?next=cart.html&checkout=1">đăng nhập</a> để thanh toán.`;
        pm.style.display = 'none';
    } else {
        authBox.innerHTML = `Đăng nhập: <b>${user.username}</b>`;
        pm.style.display = 'block';
        if (new URLSearchParams(location.search).get('checkout') === '1') $('#checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const codFields = $('#cod-fields');
    const paymentInputs = $$('input[name="payment"]');
    if (codFields && paymentInputs.length > 0) {
        const refresh = () => {
            const method = $('input[name="payment"]:checked')?.value || "cod";
            codFields.style.display = method === "cod" ? "block" : "none";
        };
        paymentInputs.forEach(i => i.addEventListener('change', refresh));
        refresh();
    }
}

function placeOrder() {
    const user = getUser();
    if (!user?.username) {
        window.location.href = `login.html?next=cart.html&checkout=1`;
        return;
    }
    const cart = getCart();
    if (cart.length === 0) {
        toast("Giỏ hàng đang trống.", "error");
        return;
    }
    const method = $('input[name="payment"]:checked')?.value || "cod";
    if (method === "cod") {
        const phone = $('#cod-phone')?.value?.trim() ?? "";
        const address = $('#cod-address')?.value?.trim() ?? "";
        if (!phone || phone.replace(/\D/g, '').length < 9) {
            toast("Vui lòng nhập SĐT hợp lệ cho COD.", "error");
            return;
        }
        if (!address) {
            toast("Vui lòng nhập địa chỉ nhận hàng cho COD.", "error");
            return;
        }
    }
    const total = cart.reduce((sum, i) => sum + (Number(i.price) * Number(i.qty)), 0);
    addUserSpend(user.username, total);
    setCart([]);
    renderCart();
    toast(`Thanh toán thành công (${method.toUpperCase()}).`, "success");
}

function initFiltersUi() {
    const btn = $('.btn-apply-filter');
    const container = $('.product-list');
    if (!btn || !container) return;

    const applyBaseFilters = (products) => {
        let list = Array.isArray(products) ? [...products] : [];
        const cats = $$('.filter-sidebar input[type="checkbox"][data-cat]:checked').map(i => Number(i.dataset.cat)).filter(Number.isFinite);
        if (cats.length > 0) list = list.filter(p => cats.includes(Number(p.category_id)));

        const gender = $('.filter-sidebar input[type="radio"][name="gender"]:checked')?.value;
        if (gender) list = list.filter(p => String(p.gender) === String(gender));
        return list;
    };

    const updatePriceCounts = (products) => {
        const base = applyBaseFilters(products);
        $$('.filter-count[data-min]').forEach(span => {
            const min = Number(span.dataset.min ?? 0);
            const max = span.dataset.max === "" ? Infinity : Number(span.dataset.max);
            const count = base.filter(p => {
                const price = Number(p.price ?? 0);
                return price >= min && price <= max;
            }).length;
            span.textContent = String(count);
        });
    };

    const reset = document.querySelector('.filter-reset');
    if (reset) {
        reset.addEventListener('click', (e) => {
            e.preventDefault();
            $$('.filter-sidebar input[type="checkbox"]').forEach(i => (i.checked = false));
            $$('.filter-sidebar input[type="radio"][name="gender"]').forEach(i => (i.checked = false));
            loadProducts();
        });
    }

    fetchProductsCached().then(products => {
        updatePriceCounts(products);
        const watch = () => updatePriceCounts(products);
        $$('.filter-sidebar input[type="checkbox"][data-cat]').forEach(i => i.addEventListener('change', watch));
        $$('.filter-sidebar input[type="radio"][name="gender"]').forEach(i => i.addEventListener('change', watch));
    }).catch(() => {});

    btn.addEventListener('click', async () => {
        const products = await fetchProductsCached();
        let list = applyBaseFilters(products);

        const ranges = $$('.filter-sidebar input[type="checkbox"][data-min]:checked')
            .map(i => ({
                min: Number(i.dataset.min ?? 0),
                max: i.dataset.max === "" ? Infinity : Number(i.dataset.max)
            }))
            .filter(r => Number.isFinite(r.min) && (r.max === Infinity || Number.isFinite(r.max)));
        if (ranges.length > 0) {
            list = list.filter(p => {
                const price = Number(p.price ?? 0);
                return ranges.some(r => price >= r.min && price <= r.max);
            });
        }

        renderProductCards(list, container);

        toast(`Đã lọc: ${list.length} sản phẩm`, "success");
    });
}