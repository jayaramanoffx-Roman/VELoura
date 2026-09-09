/**
 * VELoura - Luxury E-Commerce Application Engine
 * Next-Gen Streetwear & Interactive Tech Apparel
 */

// Application State
const state = {
  cart: [],
  wishlist: new Set(),
  activeFilter: 'all',
  searchQuery: '',
  sortBy: 'default',
  currentCoupon: null,
  discountAmount: 0,
  // Studio Customizer State
  studio: {
    color: TSHIRT_COLORS[0],
    text: "VELOURA 2026",
    font: "'Outfit', sans-serif",
    size: "M",
    view: "front",
    graphic: "assets/graphics/motif_astronaut.svg",
    showQr: false,
    basePrice: 599
  }
};

// DOM Content Loaded Initialization
document.addEventListener('DOMContentLoaded', () => {
  initCatalogue();
  initStudio();
  initCart();
  initReviews();
  initEventListeners();
  loadSavedData();
  loadWishlist();
});

/* ==========================================================================
   1. Toast Notification & Fly-to-Cart Animation System
   ========================================================================== */
function showToast(message, icon = 'check-circle', actionText = null, onAction = null) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;

  let actionHtml = '';
  if (actionText) {
    actionHtml = `<button type="button" class="toast-action-btn" id="toastActionBtn">${actionText}</button>`;
  }

  toast.innerHTML = `
    <i data-lucide="${icon}" style="width: 16px; height: 16px; color: var(--accent-gold-light);"></i>
    <span>${message}</span>
    ${actionHtml}
  `;
  if (window.lucide) lucide.createIcons();

  if (actionText && onAction) {
    document.getElementById('toastActionBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toast.classList.remove('active');
      onAction();
    });
  }

  toast.classList.add('active');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove('active');
  }, 3200);
}

function animateFlyToCart(sourceElement, imageUrl, onComplete) {
  const cartBtn = document.getElementById('cartTriggerBtn');
  if (!cartBtn) {
    if (onComplete) onComplete();
    return;
  }

  // Calculate start coordinates from source element
  const startRect = (sourceElement && sourceElement.getBoundingClientRect)
    ? sourceElement.getBoundingClientRect()
    : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 80, height: 80 };
  const cartRect = cartBtn.getBoundingClientRect();

  // Create flyer element
  const flyer = document.createElement('img');
  flyer.src = imageUrl || (sourceElement && sourceElement.src) || 'assets/logo.png';
  flyer.className = 'flying-cart-item';

  // Initial compact dimensions
  const initialWidth = 68;
  const initialHeight = 68;
  const startX = startRect.left + (startRect.width - initialWidth) / 2;
  const startY = startRect.top + (startRect.height - initialHeight) / 2;

  const targetX = cartRect.left + (cartRect.width / 2) - (initialWidth / 2);
  const targetY = cartRect.top + (cartRect.height / 2) - (initialHeight / 2);

  flyer.style.width = `${initialWidth}px`;
  flyer.style.height = `${initialHeight}px`;
  flyer.style.left = `${startX}px`;
  flyer.style.top = `${startY}px`;

  document.body.appendChild(flyer);

  const deltaX = targetX - startX;
  const deltaY = targetY - startY;

  // Elegant visible parabolic flight arc staying within screen
  const midX = deltaX * 0.52 + (deltaX > 0 ? -20 : 20);
  const midY = (deltaY * 0.45) - 30;

  const animation = flyer.animate([
    {
      transform: 'translate(0px, 0px) scale(1) rotate(0deg)',
      opacity: 1
    },
    {
      transform: `translate(${deltaX * 0.15}px, ${deltaY * 0.12 - 15}px) scale(1.08) rotate(-8deg)`,
      opacity: 1,
      offset: 0.2
    },
    {
      transform: `translate(${midX}px, ${midY}px) scale(0.72) rotate(140deg)`,
      opacity: 0.95,
      offset: 0.55
    },
    {
      transform: `translate(${deltaX * 0.85}px, ${deltaY * 0.86}px) scale(0.35) rotate(260deg)`,
      opacity: 0.85,
      offset: 0.85
    },
    {
      transform: `translate(${deltaX}px, ${deltaY}px) scale(0.08) rotate(360deg)`,
      opacity: 0
    }
  ], {
    duration: 800,
    easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)',
    fill: 'forwards'
  });

  animation.onfinish = () => {
    flyer.remove();

    // Trigger cart icon bounce celebration
    cartBtn.classList.remove('cart-bounce-active');
    void cartBtn.offsetWidth;
    cartBtn.classList.add('cart-bounce-active');
    setTimeout(() => cartBtn.classList.remove('cart-bounce-active'), 700);

    // Trigger badge counter pop
    const counter = document.getElementById('cartCounter');
    if (counter) {
      counter.classList.remove('badge-pop-active');
      void counter.offsetWidth;
      counter.classList.add('badge-pop-active');
      setTimeout(() => counter.classList.remove('badge-pop-active'), 500);
    }

    if (onComplete) onComplete();
  };
}

/* ==========================================================================
   2. Catalogue Rendering & Filters
   ========================================================================== */
function initCatalogue() {
  renderProducts();

  // Category Filters
  const filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.getAttribute('data-filter');
      renderProducts();
    });
  });

  // Search Input
  const searchInput = document.getElementById('catalogSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        state.searchQuery = '';
        renderProducts();
        searchInput.blur();
      }
    });
  }

  // Custom Luxury Sort Dropdown
  const customSortWrap = document.getElementById('customSortDropdown');
  const customSortTrigger = document.getElementById('customSortTrigger');
  const customSortLabel = document.getElementById('customSortLabel');
  const customSortOptions = document.querySelectorAll('.custom-select-option');
  const sortSelect = document.getElementById('catalogSortSelect');

  function closeCustomSort() {
    if (!customSortWrap) return;
    customSortWrap.classList.remove('open');
    customSortTrigger?.setAttribute('aria-expanded', 'false');
  }

  function toggleCustomSort() {
    if (!customSortWrap) return;
    const isOpen = customSortWrap.classList.toggle('open');
    customSortTrigger?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  if (customSortTrigger && customSortWrap) {
    customSortTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCustomSort();
    });

    customSortOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.getAttribute('data-value');
        const text = option.querySelector('span')?.textContent || option.textContent;

        customSortOptions.forEach(opt => {
          opt.classList.remove('active');
          opt.setAttribute('aria-selected', 'false');
        });
        option.classList.add('active');
        option.setAttribute('aria-selected', 'true');

        if (customSortLabel) customSortLabel.textContent = text;
        state.sortBy = value;
        if (sortSelect) sortSelect.value = value;
        renderProducts();
        closeCustomSort();
      });
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (customSortWrap.classList.contains('open') && !customSortWrap.contains(e.target)) {
        closeCustomSort();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && customSortWrap.classList.contains('open')) {
        closeCustomSort();
        customSortTrigger.focus();
      }
    });
  }

  // Native fallback select (if changed programmatically)
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderProducts();
    });
  }
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  let filtered = VELOURA_PRODUCTS.filter(item => {
    // Wishlist filter
    if (state.activeFilter === 'wishlist') {
      return state.wishlist.has(item.id);
    }

    // Category match
    if (state.activeFilter === 'under600') {
      if (item.price >= 600) return false;
    } else if (state.activeFilter !== 'all' && item.category !== state.activeFilter) {
      return false;
    }

    // Search query match
    if (state.searchQuery) {
      const matchTitle = item.title.toLowerCase().includes(state.searchQuery);
      const matchTag = item.tagline.toLowerCase().includes(state.searchQuery);
      const matchDesc = item.description.toLowerCase().includes(state.searchQuery);
      const matchBadge = item.badge.toLowerCase().includes(state.searchQuery);
      if (!matchTitle && !matchTag && !matchDesc && !matchBadge) {
        return false;
      }
    }

    return true;
  });

  // Sort logic
  if (state.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  if (filtered.length === 0) {
    const isWishlistEmpty = state.activeFilter === 'wishlist';
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <i data-lucide="${isWishlistEmpty ? 'heart' : 'package-search'}" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
        <h3 style="font-size: 1.3rem; margin-bottom: 8px; color: var(--text-primary);">${isWishlistEmpty ? 'Your Wishlist is Empty' : 'No Drops Found'}</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">${isWishlistEmpty ? 'Click the heart icon on any design to save it here.' : 'Try searching for another keyword or clear your filter.'}</p>
        <button class="btn btn-outline btn-sm" style="margin-top: 16px;" onclick="resetFilters()">View All 16 Drops</button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const isWishlisted = state.wishlist.has(product.id);
    const priceDisplay = `₹${product.price}${product.priceSuffix || ''}`;
    const origPriceDisplay = product.originalPrice ? `₹${product.originalPrice}` : '';

    return `
      <article class="product-card" data-id="${product.id}">
        <div class="card-media-wrap">
          <div class="card-top-badges">
            <span class="pill-badge">${product.badge}</span>
          </div>

          <img src="${product.image}" alt="${product.title}" class="product-img" loading="lazy">

          <div class="card-quick-actions">
            <button class="btn btn-gold btn-sm w-100 quick-add-btn" data-id="${product.id}" style="flex: 1;">
              <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
              <span>Add</span>
            </button>
            <button class="btn btn-outline btn-sm quick-view-btn" data-id="${product.id}" title="Quick View">
              <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
            </button>
            <button class="btn btn-outline btn-sm wishlist-btn ${isWishlisted ? 'active' : ''}" data-id="${product.id}" title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
              <i data-lucide="heart" style="width: 14px; height: 14px; ${isWishlisted ? 'fill: var(--accent-crimson); stroke: var(--accent-crimson);' : ''}"></i>
            </button>
          </div>
        </div>

        <div class="card-body">
          <div class="product-category-sub">${product.categoryLabel}</div>
          <h3 class="product-title">${product.title}</h3>

          <div class="card-footer-row">
            <div class="price-box">
              <span class="current-price">${priceDisplay}</span>
              ${origPriceDisplay ? `<span class="original-price">${origPriceDisplay}</span>` : ''}
            </div>
            ${product.specialOffer ? `
              <span class="card-offer-badge">
                ${product.specialOffer.split(':')[0] || 'Offer'}
              </span>
            ` : ''}
          </div>
        </div>
      </article>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
  attachCardEvents();
}

function resetFilters() {
  state.activeFilter = 'all';
  state.searchQuery = '';
  state.sortBy = 'default';
  const searchInput = document.getElementById('catalogSearchInput');
  if (searchInput) searchInput.value = '';
  const sortSelect = document.getElementById('catalogSortSelect');
  if (sortSelect) sortSelect.value = 'default';
  const customLabel = document.getElementById('customSortLabel');
  if (customLabel) customLabel.textContent = 'Catalogue Order';
  document.querySelectorAll('.custom-select-option').forEach(opt => {
    const isDefault = opt.getAttribute('data-value') === 'default';
    opt.classList.toggle('active', isDefault);
    opt.setAttribute('aria-selected', isDefault ? 'true' : 'false');
  });
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  document.querySelector('.filter-pill[data-filter="all"]')?.classList.add('active');
  renderProducts();
}

function attachCardEvents() {
  // Quick Add with Fly-to-Cart Animation
  document.querySelectorAll('.quick-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.getAttribute('data-id'));
      const product = VELOURA_PRODUCTS.find(p => p.id === id);
      if (!product) return;

      const card = btn.closest('.product-card');
      const cardImg = card ? card.querySelector('.product-img') : btn;

      // Button tactile feedback
      const origHtml = btn.innerHTML;
      btn.classList.add('added-success');
      btn.innerHTML = `<i data-lucide="check" style="width: 14px; height: 14px;"></i> <span>Added!</span>`;
      if (window.lucide) lucide.createIcons();
      setTimeout(() => {
        btn.classList.remove('added-success');
        btn.innerHTML = origHtml;
        if (window.lucide) lucide.createIcons();
      }, 1400);

      // Add to cart data without drawer popup
      addToCart(product, 'M', 1, false);

      // Trigger fly-to-cart animation
      animateFlyToCart(cardImg, product.image, () => {
        const shortTitle = product.title.length > 22 ? product.title.slice(0, 20) + '…' : product.title;
        showToast(`${shortTitle} added!`, "shopping-bag", "View Bag", openCartDrawer);
      });
    });
  });

  // Quick View
  document.querySelectorAll('.quick-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.getAttribute('data-id'));
      openQuickView(id);
    });
  });

  // Card click also opens quick view
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-quick-actions')) return;
      const id = parseInt(card.getAttribute('data-id'));
      openQuickView(id);
    });
  });

  // Wishlist
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.getAttribute('data-id'));
      toggleWishlist(id);
    });
  });
}

/* ==========================================================================
   3. Interactive Studio Customizer
   ========================================================================== */
function initStudio() {
  // 1. Render Color Swatches
  const swatchesWrap = document.getElementById('colorSwatchesWrap');
  if (swatchesWrap) {
    swatchesWrap.innerHTML = TSHIRT_COLORS.map((c, i) => `
      <div class="color-swatch-chip ${i === 0 ? 'active' : ''}" 
           data-name="${c.name}" 
           data-hex="${c.hex}" 
           data-textcolor="${c.textColor}" 
           style="background-color: ${c.hex};" 
           title="${c.name}">
      </div>
    `).join('');

    swatchesWrap.querySelectorAll('.color-swatch-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        swatchesWrap.querySelectorAll('.color-swatch-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const name = chip.getAttribute('data-name');
        const foundColor = TSHIRT_COLORS.find(c => c.name === name);
        if (foundColor) {
          state.studio.color = foundColor;
        }
        document.getElementById('selectedColorName').textContent = name;
        updateTshirtMockup();
      });
    });
  }

  // 2. Custom Text Input
  const textInput = document.getElementById('customTextInput');
  const liveText = document.getElementById('liveCustomText');
  const charCount = document.getElementById('charCount');

  if (textInput && liveText) {
    textInput.addEventListener('input', (e) => {
      const val = e.target.value.toUpperCase();
      state.studio.text = val;
      liveText.textContent = val || "VELOURA";
      if (charCount) charCount.textContent = `${val.length}/25`;
    });
  }

  // 3. Typography buttons
  const fontBtns = document.querySelectorAll('.font-btn');
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      fontBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const font = btn.getAttribute('data-font');
      state.studio.font = font;
      if (liveText) liveText.style.fontFamily = font;
    });
  });

  // 4. Graphics & QR toggle
  const astroBtn = document.getElementById('graphicAstronautBtn');
  const wolfBtn = document.getElementById('graphicWolfBtn');
  const storyBtn = document.getElementById('graphicStoryBtn');
  const qrBtn = document.getElementById('graphicToggleQrBtn');
  const liveGraphic = document.getElementById('liveCustomGraphic');
  const qrBadgeWrap = document.getElementById('liveQrBadgeWrap');
  const priceEl = document.getElementById('studioCalculatedPrice');

  if (astroBtn) {
    astroBtn.addEventListener('click', () => {
      [astroBtn, wolfBtn, storyBtn].forEach(b => b?.classList.remove('active'));
      astroBtn.classList.add('active');
      state.studio.graphic = "assets/graphics/motif_astronaut.svg";
      if (liveGraphic) {
        liveGraphic.src = state.studio.graphic;
        liveGraphic.style.display = 'block';
      }
    });
  }

  if (wolfBtn) {
    wolfBtn.addEventListener('click', () => {
      [astroBtn, wolfBtn, storyBtn].forEach(b => b?.classList.remove('active'));
      wolfBtn.classList.add('active');
      state.studio.graphic = "assets/graphics/motif_wolf.svg";
      if (liveGraphic) {
        liveGraphic.src = state.studio.graphic;
        liveGraphic.style.display = 'block';
      }
    });
  }

  if (storyBtn) {
    storyBtn.addEventListener('click', () => {
      [astroBtn, wolfBtn, storyBtn].forEach(b => b?.classList.remove('active'));
      storyBtn.classList.add('active');
      state.studio.graphic = "assets/graphics/motif_wanderlust.svg";
      if (liveGraphic) {
        liveGraphic.src = state.studio.graphic;
        liveGraphic.style.display = 'block';
      }
    });
  }

  if (qrBtn) {
    qrBtn.addEventListener('click', () => {
      state.studio.showQr = !state.studio.showQr;
      qrBtn.classList.toggle('active', state.studio.showQr);
      if (qrBadgeWrap) {
        qrBadgeWrap.classList.toggle('d-none', !state.studio.showQr);
      }
      const printBox = document.getElementById('printBoundingBox');
      if (printBox) {
        printBox.classList.toggle('has-qr', state.studio.showQr);
      }
      // UPDATE VISIBLE PRICE
      if (priceEl) {
        priceEl.textContent = state.studio.showQr ? '₹699' : '₹599';
      }
    });
  }

  // 5. Size Selection
  const sizeChips = document.querySelectorAll('#studioSizeWrap .size-chip');
  sizeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      sizeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.studio.size = chip.getAttribute('data-size');
    });
  });

  // Front / Back View Toggle
  const viewFrontBtn = document.getElementById('viewFrontBtn');
  const viewBackBtn = document.getElementById('viewBackBtn');
  const mockupContainer = document.getElementById('tshirtContainer');
  const boundingBox = document.getElementById('printBoundingBox');

  if (viewFrontBtn && viewBackBtn) {
    viewFrontBtn.addEventListener('click', () => {
      viewFrontBtn.classList.add('active');
      viewBackBtn.classList.remove('active');
      state.studio.view = 'front';
      if (mockupContainer) {
        mockupContainer.style.transform = 'scale(1) rotateY(0deg)';
      }
      if (boundingBox) {
        boundingBox.style.top = '26%';
        boundingBox.style.transform = 'scale(1)';
      }
    });

    viewBackBtn.addEventListener('click', () => {
      viewBackBtn.classList.add('active');
      viewFrontBtn.classList.remove('active');
      state.studio.view = 'back';
      if (mockupContainer) {
        mockupContainer.style.transform = 'scale(0.97) rotateY(180deg)';
      }
      if (boundingBox) {
        boundingBox.style.top = '28%';
        boundingBox.style.transform = 'scale(0.9) rotateY(180deg)';
      }
    });
  }

  // Add Studio Custom Tee to Cart with Fly-to-Cart
  const addStudioBtn = document.getElementById('addCustomTeeToCartBtn');
  if (addStudioBtn) {
    addStudioBtn.addEventListener('click', () => {
      const customItem = {
        id: `custom-${state.studio.color.name}-${state.studio.text}-${Date.now()}`,
        title: `Custom ${state.studio.color.name} Studio Tee`,
        price: state.studio.showQr ? 699 : 599,
        image: state.studio.color.mockup || "assets/mockups/tshirt_obsidian_black.png",
        customText: state.studio.text,
        customColor: state.studio.color.name,
        customFont: state.studio.font,
        hasQr: state.studio.showQr,
        badge: "Bespoke Custom"
      };

      const mockupImg = document.getElementById('tshirtRealMockup') || addStudioBtn;

      // Button tactile feedback
      const origHtml = addStudioBtn.innerHTML;
      addStudioBtn.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px;"></i> <span>Added to Bag!</span>`;
      if (window.lucide) lucide.createIcons();
      setTimeout(() => {
        addStudioBtn.innerHTML = origHtml;
        if (window.lucide) lucide.createIcons();
      }, 1400);

      addToCart(customItem, state.studio.size, 1, false);

      animateFlyToCart(mockupImg, customItem.image, () => {
        showToast("Custom Tee Added to Bag!", "shopping-bag", "View Bag", openCartDrawer);
      });
    });
  }

  // Initial mockup setup
  updateTshirtMockup();
}

function updateTshirtMockup() {
  const mockupImg = document.getElementById('tshirtRealMockup');
  const liveText = document.getElementById('liveCustomText');
  const liveGraphic = document.getElementById('liveCustomGraphic');
  const liveQr = document.getElementById('liveQrGraphic');
  
  if (mockupImg && state.studio.color && state.studio.color.mockup) {
    mockupImg.src = state.studio.color.mockup;
  }
  
  const colorName = state.studio.color ? state.studio.color.name : "Obsidian Black";
  const isLight = (colorName === "Crisp White" || colorName === "Desert Sand");
  const textColor = isLight ? "#0f172a" : "#ffffff";
  
  if (liveText) {
    liveText.style.color = textColor;
  }
  
  // Vector Graphic contrast filter
  const isSvg = state.studio.graphic && state.studio.graphic.endsWith('.svg');
  const graphicFilter = isSvg 
    ? (isLight 
        ? "brightness(0) drop-shadow(0 1px 3px rgba(0,0,0,0.2))" 
        : "brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.5))")
    : "drop-shadow(0 2px 8px rgba(0,0,0,0.3))";
  
  if (liveGraphic) {
    liveGraphic.style.filter = graphicFilter;
  }
  if (liveQr) {
    liveQr.style.filter = isLight 
      ? "brightness(0) drop-shadow(0 1px 3px rgba(0,0,0,0.2))" 
      : "brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.5))";
  }
}

// Modal Background Scroll Lock Utility
function setBodyScrollLock(isLocked) {
  if (isLocked) {
    document.body.style.overflow = 'hidden';
  } else {
    setTimeout(() => {
      const anyActive = document.querySelector('.modal-wrapper.active, .cart-drawer.active');
      if (!anyActive) {
        document.body.style.overflow = '';
      }
    }, 50);
  }
}

/* ==========================================================================
   4. Shopping Cart Drawer System
   ========================================================================== */
function initCart() {
  const triggerBtn = document.getElementById('cartTriggerBtn');
  const closeBtn = document.getElementById('closeCartBtn');
  const backdrop = document.getElementById('drawerBackdrop');
  const applyCouponBtn = document.getElementById('applyCouponBtn');
  const couponInput = document.getElementById('couponCodeInput');
  const checkoutBtn = document.getElementById('proceedToCheckoutBtn');

  if (triggerBtn) triggerBtn.addEventListener('click', openCartDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
  if (backdrop) backdrop.addEventListener('click', closeCartDrawer);

  if (applyCouponBtn) {
    applyCouponBtn.addEventListener('click', applyCoupon);
  }

  if (couponInput) {
    couponInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCoupon();
      }
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (state.cart.length === 0) {
        showToast("Your bag is empty! Add products first.", "shopping-bag");
        return;
      }
      closeCartDrawer();
      openCheckoutModal();
    });
  }
}

function openCartDrawer() {
  document.getElementById('cartDrawer')?.classList.add('active');
  document.getElementById('drawerBackdrop')?.classList.add('active');
  setBodyScrollLock(true);
  renderCart();
}

function closeCartDrawer() {
  document.getElementById('cartDrawer')?.classList.remove('active');
  document.getElementById('drawerBackdrop')?.classList.remove('active');
  setBodyScrollLock(false);
}

function addToCart(product, size = 'M', quantity = 1, showDefaultToast = true) {
  const existingIndex = state.cart.findIndex(
    item => item.id === product.id && item.size === size && item.customText === product.customText
  );

  if (existingIndex > -1) {
    state.cart[existingIndex].quantity += quantity;
  } else {
    state.cart.push({
      ...product,
      size,
      quantity
    });
  }

  saveCart();
  updateCartCounters();
  renderCart();
  if (showDefaultToast) {
    showToast(`Added ${product.title} to Bag!`, "shopping-bag", "View Bag", openCartDrawer);
  }
}

function updateCartQuantity(index, delta) {
  if (state.cart[index]) {
    state.cart[index].quantity += delta;
    if (state.cart[index].quantity <= 0) {
      state.cart.splice(index, 1);
    }
    saveCart();
    renderCart();
    updateCartCounters();
  }
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  saveCart();
  renderCart();
  updateCartCounters();
  showToast("Item removed from Bag", "trash-2");
}

function renderCart() {
  const cartList = document.getElementById('cartItemsList');
  const subtotalEl = document.getElementById('cartSubtotal');
  const discountEl = document.getElementById('cartDiscount');
  const discountRow = document.getElementById('cartDiscountRow');
  const deliveryEl = document.getElementById('cartDeliveryFee');
  const totalEl = document.getElementById('cartTotal');
  const progressBar = document.getElementById('shippingProgressBar');
  const progressText = document.getElementById('shippingProgressText');

  if (!cartList) return;

  if (state.cart.length === 0) {
    cartList.innerHTML = `
      <div style="text-align: center; padding: 50px 10px; color: var(--text-muted);">
        <i data-lucide="shopping-bag" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.35;"></i>
        <h4 style="color: var(--text-primary); margin-bottom: 6px;">Your Bag is Empty</h4>
        <p style="font-size: 0.85rem;">Explore our 16 affordable streetwear drops and start personalizing!</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '₹0';
    if (totalEl) totalEl.textContent = '₹0';
    if (discountRow) discountRow.style.display = 'none';
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.innerHTML = `<span>Add ₹999 for <strong>FREE Delivery</strong></span>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Calculate Subtotal
  let subtotal = state.cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Calculate Discounts
  let discount = 0;
  if (state.currentCoupon === 'LAUNCH10') {
    discount = Math.round(subtotal * 0.10);
  } else if (state.currentCoupon === 'STUDENT50' || state.currentCoupon === 'VOTER50') {
    discount = Math.min(50, subtotal);
  } else if (state.currentCoupon === 'SQUAD10') {
    const totalItems = state.cart.reduce((a, b) => a + b.quantity, 0);
    if (totalItems >= 5) {
      discount = Math.round(subtotal * 0.10);
    }
  } else if (state.currentCoupon === 'AR100') {
    discount = Math.min(100, subtotal);
  }

  // Free delivery threshold ₹999
  const freeShippingThreshold = 999;
  const isFreeDelivery = subtotal >= freeShippingThreshold;
  const deliveryFee = isFreeDelivery ? 0 : 60;
  const grandTotal = Math.max(0, subtotal - discount + deliveryFee);

  // Render Items
  cartList.innerHTML = state.cart.map((item, index) => `
    <div class="cart-item-row">
      <img src="${item.image}" alt="${item.title}" class="cart-item-thumb">
      <div>
        <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; margin-bottom: 3px;">
          ${item.title}
        </div>
        <div style="font-size: 0.75rem; color: var(--accent-gold-dark); font-family: var(--font-heading); font-weight: 600; margin-bottom: 6px;">
          Size: ${item.size} ${item.customText ? `• "${item.customText}"` : ''}
        </div>
        <div style="font-family: var(--font-mono); font-size: 0.95rem; font-weight: 800; color: var(--text-primary);">
          ₹${item.price}
        </div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        <button class="btn-text" onclick="removeFromCart(${index})" style="background: none; border: none; color: var(--text-muted); cursor: pointer;" title="Remove">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
        <div style="display: flex; align-items: center; gap: 6px; background: #ffffff; border: 1px solid var(--border-subtle); border-radius: 4px; padding: 2px 6px;">
          <button style="background:none; border:none; color:var(--text-primary); cursor:pointer; font-weight:700; font-size: 0.9rem;" onclick="updateCartQuantity(${index}, -1)">-</button>
          <span style="font-family: var(--font-mono); font-size: 0.82rem; min-width: 14px; text-align: center; font-weight: 700;">${item.quantity}</span>
          <button style="background:none; border:none; color:var(--text-primary); cursor:pointer; font-weight:700; font-size: 0.9rem;" onclick="updateCartQuantity(${index}, 1)">+</button>
        </div>
      </div>
    </div>
  `).join('');

  // Update Summary DOM
  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (deliveryEl) deliveryEl.textContent = isFreeDelivery ? 'FREE (Eligible)' : `₹${deliveryFee}`;
  if (totalEl) totalEl.textContent = `₹${grandTotal}`;

  if (discount > 0) {
    if (discountRow) discountRow.style.display = 'flex';
    if (discountEl) discountEl.textContent = `-₹${discount} (${state.currentCoupon})`;
  } else {
    if (discountRow) discountRow.style.display = 'none';
  }

  // Shipping Progress
  if (progressBar && progressText) {
    if (isFreeDelivery) {
      progressBar.style.width = '100%';
      progressText.innerHTML = `<span style="color: #059669; font-weight: 700;">🎉 Congratulations! You unlocked FREE Delivery!</span>`;
    } else {
      const remaining = freeShippingThreshold - subtotal;
      const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100);
      progressBar.style.width = `${progressPercent}%`;
      progressText.innerHTML = `<span>Add <strong>₹${remaining}</strong> more for <strong>FREE Delivery</strong></span>`;
    }
  }

  if (window.lucide) lucide.createIcons();
}

function applyCoupon() {
  const input = document.getElementById('couponCodeInput');
  const notice = document.getElementById('couponStatusNotice');
  if (!input || !notice) return;

  const code = input.value.trim().toUpperCase();
  const validCodes = ['LAUNCH10', 'STUDENT50', 'SQUAD10', 'VOTER50', 'AR100'];

  if (validCodes.includes(code)) {
    state.currentCoupon = code;
    notice.style.display = 'block';
    notice.style.color = '#059669';
    notice.textContent = `✓ Coupon "${code}" applied successfully!`;
    renderCart();
    showToast(`Coupon ${code} applied!`);
  } else {
    notice.style.display = 'block';
    notice.style.color = 'var(--accent-crimson)';
    notice.textContent = `✗ Invalid coupon code. Try "LAUNCH10" or "STUDENT50".`;
  }
}

function updateCartCounters() {
  const count = state.cart.reduce((acc, item) => acc + item.quantity, 0);
  const counterEl = document.getElementById('cartCounter');
  if (counterEl) {
    counterEl.textContent = count;
    counterEl.style.display = count > 0 ? 'flex' : 'none';
  }
}

function saveCart() {
  try {
    localStorage.setItem('veloura_cart', JSON.stringify(state.cart));
  } catch (e) {
    console.warn("Storage restricted", e);
  }
}

function loadSavedData() {
  try {
    const saved = localStorage.getItem('veloura_cart');
    if (saved) {
      state.cart = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not load cart", e);
  }
  updateCartCounters();
}

/* ==========================================================================
   5. Wishlist System
   ========================================================================== */
function toggleWishlist(productId) {
  if (state.wishlist.has(productId)) {
    state.wishlist.delete(productId);
    showToast("Removed from Wishlist", "heart-off");
  } else {
    state.wishlist.add(productId);
    showToast("Added to Wishlist! ❤️", "heart");
  }
  saveWishlist();
  updateWishlistCounter();
  renderProducts();
}

function updateWishlistCounter() {
  const counter = document.getElementById('wishlistCounter');
  if (counter) {
    counter.textContent = state.wishlist.size;
    counter.style.display = state.wishlist.size > 0 ? 'flex' : 'none';
  }
}

function saveWishlist() {
  try {
    localStorage.setItem('veloura_wishlist', JSON.stringify(Array.from(state.wishlist)));
  } catch (e) {
    console.warn("Storage restricted", e);
  }
}

function loadWishlist() {
  try {
    const saved = localStorage.getItem('veloura_wishlist');
    if (saved) {
      state.wishlist = new Set(JSON.parse(saved));
    }
  } catch (e) {
    console.warn("Could not load wishlist", e);
  }
  updateWishlistCounter();
}

/* ==========================================================================
   6. Quick View Modal
   ========================================================================== */
function openQuickView(productId) {
  const product = VELOURA_PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('quickViewModal');
  const content = document.getElementById('quickViewContent');
  if (!modal || !content) return;

  let selectedSize = 'M';

  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1.15fr; gap: 32px; padding: 32px;" class="quick-view-inner-grid">
      <!-- Media Col -->
      <div>
        <div style="background: #f8fafc; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-subtle); padding: 16px; position: relative;">
          <img src="${product.image}" alt="${product.title}" id="quickViewMainImg" style="width: 100%; height: 380px; object-fit: contain;">
          
          <div style="display: flex; gap: 8px; justify-content: center; margin-top: 14px;">
            <button class="btn btn-sm btn-outline active" id="viewPhotoThumbBtn" style="font-size: 0.75rem;">Product Photo</button>
            <button class="btn btn-sm btn-outline" id="viewPageScanBtn" style="font-size: 0.75rem;">Catalogue PDF Scan (Page ${product.pageNumber})</button>
          </div>
        </div>
      </div>

      <!-- Details Col -->
      <div style="display: flex; flex-direction: column;">
        <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-gold-dark); font-weight: 700; margin-bottom: 6px;">
          ${product.categoryLabel} • DROP #${product.id}
        </div>
        <h2 style="font-size: 1.8rem; margin-bottom: 8px; color: var(--text-primary);">${product.title}</h2>
        <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 16px;">${product.tagline}</p>

        <!-- Price -->
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-subtle);">
          <span class="current-price" style="font-size: 1.7rem; color: var(--text-primary); white-space: nowrap;">₹${product.price}${product.priceSuffix || ''}</span>
          ${product.originalPrice ? `<span class="original-price" style="font-size: 1.1rem; white-space: nowrap;">₹${product.originalPrice}</span>` : ''}
          <span class="pill-badge" style="font-size: 0.75rem; white-space: nowrap;">${product.specialOffer}</span>
        </div>

        <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;">
          ${product.description}
        </p>

        <!-- Product Specs Checklist -->
        <div style="margin-bottom: 24px;">
          <div style="font-family: var(--font-heading); font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px;">
            Engineering & Material Highlights
          </div>
          <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; color: var(--text-primary);">
            ${product.features.map(f => `
              <li style="display: flex; align-items: center; gap: 8px;">
                <i data-lucide="check-circle-2" style="width: 15px; height: 15px; color: #059669; flex-shrink: 0;"></i>
                <span>${f}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- Size Selector -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.8rem;">
            <span>Select Size:</span>
            <button id="modalSizeGuideTrigger" style="background:none; border:none; color:var(--accent-gold-dark); font-weight: 700; cursor:pointer; font-size:0.75rem;">Size Chart 📐</button>
          </div>
          <div class="size-chips-wrap" id="quickViewSizeChips">
            <div class="size-chip" data-size="S">S</div>
            <div class="size-chip active" data-size="M">M</div>
            <div class="size-chip" data-size="L">L</div>
            <div class="size-chip" data-size="XL">XL</div>
            <div class="size-chip" data-size="XXL">XXL</div>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 12px; margin-top: auto;">
          <button class="btn btn-gold" id="modalAddToCartBtn" style="flex: 1;">
            <i data-lucide="shopping-bag" style="width: 16px; height: 16px;"></i>
            <span>Add to Bag (₹${product.price})</span>
          </button>
          <a href="#studio" class="btn btn-outline" id="modalOpenStudioBtn" title="Customize in Studio">
            <i data-lucide="sliders" style="width: 16px; height: 16px;"></i>
          </a>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
  setBodyScrollLock(true);
  if (window.lucide) lucide.createIcons();

  // Switch image between photo and PDF scan
  const mainImg = document.getElementById('quickViewMainImg');
  const photoBtn = document.getElementById('viewPhotoThumbBtn');
  const pageBtn = document.getElementById('viewPageScanBtn');

  if (photoBtn && pageBtn && mainImg) {
    photoBtn.addEventListener('click', () => {
      mainImg.src = product.image;
      photoBtn.classList.add('active');
      pageBtn.classList.remove('active');
    });
    pageBtn.addEventListener('click', () => {
      mainImg.src = product.pageImage;
      pageBtn.classList.add('active');
      photoBtn.classList.remove('active');
    });
  }

  // Size chips
  const chips = content.querySelectorAll('.size-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedSize = chip.getAttribute('data-size');
    });
  });

  // Size guide trigger
  document.getElementById('modalSizeGuideTrigger')?.addEventListener('click', () => {
    document.getElementById('sizeGuideModal')?.classList.add('active');
  });

  // Add to Cart from Quick View with Fly-to-Cart
  document.getElementById('modalAddToCartBtn')?.addEventListener('click', () => {
    const quickViewImg = document.getElementById('quickViewMainImg') || document.getElementById('modalAddToCartBtn');
    addToCart(product, selectedSize, 1, false);
    modal.classList.remove('active');
    setBodyScrollLock(false);

    animateFlyToCart(quickViewImg, product.image, () => {
      const shortTitle = product.title.length > 22 ? product.title.slice(0, 20) + '…' : product.title;
      showToast(`${shortTitle} added!`, "shopping-bag", "View Bag", openCartDrawer);
    });
  });

  // Customize in studio
  document.getElementById('modalOpenStudioBtn')?.addEventListener('click', () => {
    modal.classList.remove('active');
    state.studio.graphic = product.image;
    document.getElementById('liveCustomGraphic').src = product.image;
  });

  // Close
  document.getElementById('closeQuickViewBtn')?.addEventListener('click', () => {
    modal.classList.remove('active');
    setBodyScrollLock(false);
  });
}

/* ==========================================================================
   7. Customer Reviews (Infinite Right-to-Left Auto-Scrolling Marquee)
   ========================================================================== */
function renderReviewCardHtml(r) {
  return `
    <div class="review-card">
      <div class="review-top-bar">
        <div class="review-stars">
          ${Array(Math.floor(r.rating || 5)).fill('★').join('')}
        </div>
        <span class="review-verified-badge">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Verified Buyer</span>
        </span>
      </div>
      <p class="review-comment">"${r.comment}"</p>
      <div class="reviewer-meta">
        <div class="reviewer-avatar">
          ${r.name.charAt(0)}
        </div>
        <div>
          <div class="reviewer-name">${r.name}</div>
          <div class="reviewer-sub">${r.college} • ${r.product}</div>
        </div>
      </div>
    </div>
  `;
}

function initReviews() {
  const marqueeTrack = document.getElementById('reviewsMarqueeTrack') || document.getElementById('reviewsGrid');
  if (!marqueeTrack) return;

  const cardsHtml = CUSTOMER_REVIEWS.map(renderReviewCardHtml).join('');
  // Duplicated twice for seamless, infinite right-to-left continuous glide
  marqueeTrack.innerHTML = cardsHtml + cardsHtml;
}

/* ==========================================================================
   8. Checkout Flow & Order Processing
   ========================================================================== */
function openCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  const formStage = document.getElementById('checkoutFormStage');
  const successStage = document.getElementById('checkoutSuccessStage');
  const payableEl = document.getElementById('checkoutPayableAmount');
  const totalEl = document.getElementById('cartTotal');

  if (!modal) return;

  if (formStage) formStage.style.display = 'block';
  if (successStage) successStage.style.display = 'none';

  if (payableEl && totalEl) {
    payableEl.textContent = totalEl.textContent;
  }

  modal.classList.add('active');
  setBodyScrollLock(true);
}

/* ==========================================================================
   9. Policy & Brand Story Modal System
   ========================================================================== */
function openPolicyModal(tabTarget = 'about') {
  const modal = document.getElementById('policyModal');
  if (!modal) return;

  switchPolicyModalTab(tabTarget);
  modal.classList.add('active');
  setBodyScrollLock(true);
}

function closePolicyModal() {
  const modal = document.getElementById('policyModal');
  if (!modal) return;
  modal.classList.remove('active');
  setBodyScrollLock(false);
}

function switchPolicyModalTab(tabTarget) {
  const tabBtns = document.querySelectorAll('.policy-modal-tab-btn');
  const panes = document.querySelectorAll('#policyModal .policy-pane');

  tabBtns.forEach(btn => {
    const isTarget = btn.getAttribute('data-tab-target') === tabTarget;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  panes.forEach(pane => {
    const isTarget = pane.id === `modal-pane-${tabTarget}`;
    pane.classList.toggle('active', isTarget);
  });

  const modalBody = document.querySelector('.policy-modal-body');
  if (modalBody) modalBody.scrollTop = 0;
}

function initEventListeners() {
  // Policy Modal Triggers (Footer buttons, legal pills, links)
  document.querySelectorAll('[data-open-policy]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = el.getAttribute('data-open-policy') || 'about';
      openPolicyModal(tab);
    });
  });

  // Policy Modal Tab Buttons Inside Modal
  document.querySelectorAll('.policy-modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab-target');
      switchPolicyModalTab(tab);
    });
  });

  // Policy Modal Close Button
  document.getElementById('closePolicyModalBtn')?.addEventListener('click', () => {
    closePolicyModal();
  });

  // Footer Size Guide Link Trigger
  document.getElementById('footerSizeGuideBtn')?.addEventListener('click', () => {
    document.getElementById('sizeGuideModal')?.classList.add('active');
    setBodyScrollLock(true);
  });

  // Deep-link check from URL hash on initial load & hashchange
  const checkHashForPolicy = () => {
    const hash = window.location.hash.toLowerCase().replace('#', '');
    const validPolicyTabs = ['about', 'privacy', 'terms', 'shipping', 'returns', 'contact'];
    if (validPolicyTabs.includes(hash)) {
      openPolicyModal(hash);
    }
  };
  checkHashForPolicy();
  window.addEventListener('hashchange', checkHashForPolicy);

  // Close Checkout Modal
  document.getElementById('closeCheckoutBtn')?.addEventListener('click', () => {
    document.getElementById('checkoutModal')?.classList.remove('active');
    setBodyScrollLock(false);
  });

  // Place Order Submit
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      processOrder();
    });
  }

  // Forward Order to WhatsApp
  document.getElementById('forwardWhatsappBtn')?.addEventListener('click', () => {
    const orderId = document.getElementById('confirmedOrderId')?.textContent || "#VEL-2026";
    const name = document.getElementById('orderFullName')?.value || "Customer";
    const msg = encodeURIComponent(`Hi VELoura! I placed Order ${orderId}. Name: ${name}. Please confirm dispatch!`);
    window.open(`https://wa.me/919876543210?text=${msg}`, '_blank');
  });

  // Done shopping
  document.getElementById('doneShoppingBtn')?.addEventListener('click', () => {
    document.getElementById('checkoutModal')?.classList.remove('active');
    setBodyScrollLock(false);
  });

  // Size guide close
  document.getElementById('closeSizeGuideBtn')?.addEventListener('click', () => {
    document.getElementById('sizeGuideModal')?.classList.remove('active');
    setBodyScrollLock(false);
  });

  // Open size guide from studio
  document.getElementById('openSizeGuideBtn')?.addEventListener('click', () => {
    document.getElementById('sizeGuideModal')?.classList.add('active');
    setBodyScrollLock(true);
  });

  // Dynamic Visibility of Nav Search Icon: Hide when page search target is in view
  const navSearchBtn = document.getElementById('searchTriggerBtn');
  const catalogSearchInput = document.getElementById('catalogSearchInput');

  if (navSearchBtn && catalogSearchInput) {
    // 1. Click on Nav Search Icon scrolls to search bar and focuses it
    navSearchBtn.addEventListener('click', () => {
      scrollToSection('#drops');
      setTimeout(() => {
        catalogSearchInput.focus();
        navSearchBtn.classList.add('nav-search-hidden');
      }, 400);
    });

    // 2. IntersectionObserver: automatically hide nav search icon when search bar is in view
    if ('IntersectionObserver' in window) {
      const searchObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            navSearchBtn.classList.add('nav-search-hidden');
          } else {
            navSearchBtn.classList.remove('nav-search-hidden');
          }
        });
      }, {
        root: null,
        threshold: 0.1
      });

      searchObserver.observe(catalogSearchInput);
    } else {
      const checkSearchVisibility = () => {
        const rect = catalogSearchInput.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 75;
        if (isInView) {
          navSearchBtn.classList.add('nav-search-hidden');
        } else {
          navSearchBtn.classList.remove('nav-search-hidden');
        }
      };
      window.addEventListener('scroll', checkSearchVisibility, { passive: true });
    }

    // 3. Focus handler
    catalogSearchInput.addEventListener('focus', () => {
      navSearchBtn.classList.add('nav-search-hidden');
    });
  }

  // Wishlist Header Button Click
  document.getElementById('wishlistTriggerBtn')?.addEventListener('click', () => {
    if (state.wishlist.size === 0) {
      showToast("Your Wishlist is empty! Click the heart on any drop.", "heart");
      return;
    }
    state.activeFilter = 'wishlist';
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    renderProducts();
    document.getElementById('drops')?.scrollIntoView({ behavior: 'smooth' });
    showToast(`Showing ${state.wishlist.size} saved wishlist drop(s)`, "heart");
  });

  // Close modals on clicking outer backdrop
  ['quickViewModal', 'sizeGuideModal', 'checkoutModal', 'policyModal'].forEach(id => {
    const modal = document.getElementById(id);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        setBodyScrollLock(false);
      }
    });
  });

  // Close with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-wrapper.active').forEach(m => m.classList.remove('active'));
      closeCartDrawer();
      setBodyScrollLock(false);
    }
  });

  // Mobile Menu Drawer Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileNavPanel = document.getElementById('mobileNavPanel');

  function openMobileMenu() {
    if (!mobileNavPanel || !mobileMenuBtn) return;
    mobileNavPanel.classList.add('open');
    mobileMenuBtn.classList.add('active');
    mobileMenuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMobileMenu() {
    if (!mobileNavPanel || !mobileMenuBtn) return;
    mobileNavPanel.classList.remove('open');
    mobileMenuBtn.classList.remove('active');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleMobileMenu() {
    if (!mobileNavPanel) return;
    if (mobileNavPanel.classList.contains('open')) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  if (mobileMenuBtn && mobileNavPanel) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileMenu();
    });

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (mobileNavPanel.classList.contains('open')) {
        if (!mobileNavPanel.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
          closeMobileMenu();
        }
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNavPanel.classList.contains('open')) {
        closeMobileMenu();
      }
    });

    // Close on resize to desktop viewport
    window.addEventListener('resize', () => {
      if (window.innerWidth > 860 && mobileNavPanel.classList.contains('open')) {
        closeMobileMenu();
      }
    });
  }

  // Navigation Links Active State & ScrollSpy (Desktop & Mobile)
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"], .mobile-nav-link[href^="#"]');
  const observedSections = ['hero', 'drops', 'studio', 'reviews'].map(id => document.getElementById(id)).filter(Boolean);

  function setActiveNavLink(hash) {
    if (!hash) return;
    navLinks.forEach(link => {
      const linkHash = link.getAttribute('href');
      if (linkHash === hash) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Smooth scroll to section exactly flush with sticky header (no previous section visible)
  function scrollToSection(targetHash) {
    if (!targetHash || targetHash === '#') return;
    const targetEl = document.querySelector(targetHash);
    if (!targetEl) return;

    const header = document.getElementById('header') || document.querySelector('.site-header');
    const headerHeight = header ? Math.round(header.getBoundingClientRect().height) : 75;
    const elementTop = targetEl.getBoundingClientRect().top + window.pageYOffset;
    // Exactly flush with header bottom - 0px gap so previous section NEVER peeks through
    const destination = Math.max(0, elementTop - headerHeight);

    window.scrollTo({
      top: destination,
      behavior: 'smooth'
    });
  }

  // Click on all internal anchor links (nav links, hero CTA buttons, footer links)
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetHash = link.getAttribute('href');
      if (!targetHash || targetHash === '#' || targetHash.length <= 1) return;
      const targetEl = document.querySelector(targetHash);
      if (targetEl) {
        e.preventDefault();
        scrollToSection(targetHash);
        setActiveNavLink(targetHash);
        if (history.pushState) {
          history.pushState(null, null, targetHash);
        }
      }
    });
  });

  // ScrollSpy with IntersectionObserver
  if ('IntersectionObserver' in window) {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          if (id === 'hero') {
            setActiveNavLink('#drops');
          } else {
            setActiveNavLink(`#${id}`);
          }
        }
      });
    }, observerOptions);

    observedSections.forEach(sec => navObserver.observe(sec));
  }

  // Listen to hash changes in URL
  window.addEventListener('hashchange', () => {
    if (window.location.hash) {
      scrollToSection(window.location.hash);
      setActiveNavLink(window.location.hash);
    }
  });

  // Sync active nav state and adjust scroll offset with initial URL hash
  if (window.location.hash) {
    setActiveNavLink(window.location.hash);
    setTimeout(() => {
      scrollToSection(window.location.hash);
    }, 120);
  }
}

function processOrder() {
  const formStage = document.getElementById('checkoutFormStage');
  const successStage = document.getElementById('checkoutSuccessStage');
  const confirmedOrderId = document.getElementById('confirmedOrderId');

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const newOrderId = `#VEL-2026-${randomNum}`;

  if (confirmedOrderId) confirmedOrderId.textContent = newOrderId;

  if (formStage) formStage.style.display = 'none';
  if (successStage) successStage.style.display = 'block';

  // Empty cart
  state.cart = [];
  saveCart();
  renderCart();
  updateCartCounters();
  showToast(`Order Confirmed! Reference: ${newOrderId}`, "check-circle");
}

// Global window bindings for generated HTML onclick handlers
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.resetFilters = resetFilters;
