document.addEventListener('DOMContentLoaded', () => {
  const tableContainers = document.querySelectorAll('.compareflow-table-container');

  tableContainers.forEach(container => {
    const tableId = container.dataset.tableId;
    
    // We fetch from the Shopify App Proxy route we configured in shopify.app.toml
    let url = '/apps/compareflow/table';
    if (tableId) {
      url += `?tableId=${tableId}`;
    }

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (data.error) {
          container.innerHTML = `<div style="padding:20px;text-align:center;color:red;">Error: ${data.error}</div>`;
          return;
        }
        
        renderTable(container, data.table);
        
        // Track the view event
        fetch('/apps/compareflow/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId: tableId || data.table.id,
            eventType: 'view'
          })
        }).catch(err => console.error('Failed to track view:', err));
      })
      .catch(err => {
        console.error('CompareFlow fetch error:', err);
        container.innerHTML = `<div style="padding:20px;text-align:center;color:#666;">Unable to load comparison table.</div>`;
      });
  });

  function renderTable(container, table) {
    if (!table || !table.products || table.products.length === 0) {
      container.innerHTML = `<div style="padding:20px;text-align:center;">No products to compare.</div>`;
      return;
    }

    const templateId = table.template || 'modern';
    
    // Generate the CSS classes based on the template
    const wrapperClass = `compareflow-wrapper compareflow-theme-${templateId}`;
    
    // Build the grid based on number of products + 1 for features column
    const gridCols = table.products.length + 1;

    let html = `<div class="${wrapperClass}">`;
    html += `<div class="compareflow-grid" style="grid-template-columns: minmax(150px, 1.2fr) repeat(${gridCols - 1}, minmax(160px, 1fr));">`;

    // HEADER ROW
    html += `<div class="compareflow-cell compareflow-header-features">Features</div>`;
    table.products.forEach(p => {
      const imgHtml = p.imageUrl 
        ? `<img src="${p.imageUrl}" alt="${p.title}" class="compareflow-product-image" />`
        : `<div class="compareflow-product-image-placeholder">No Image</div>`;
        
      const addToCartHtml = p.variantId 
        ? `<button class="compareflow-add-to-cart-btn" data-variant-id="${p.variantId}">Add to Cart</button>`
        : ``;

      html += `
        <div class="compareflow-cell compareflow-header-product">
          ${imgHtml}
          <div class="compareflow-product-title">${p.title}</div>
          ${addToCartHtml}
        </div>
      `;
    });

    // ATTRIBUTE ROWS
    table.attributes.forEach(attr => {
      // Attribute name
      html += `<div class="compareflow-cell compareflow-attr-name">${attr.label}</div>`;
      
      // Values for each product
      table.products.forEach(p => {
        let displayValue = '';
        const key = attr.key.toLowerCase();
        
        if (key === 'price') {
          displayValue = p.price || '-';
        } else if (key === 'vendor') {
          displayValue = p.vendor || '-';
        } else if (key === 'type' || key === 'product_type') {
          displayValue = p.productType || '-';
        } else if (key === 'description') {
          displayValue = p.description || '-';
        } else {
          // Fallback to checkmark for custom binary attributes
          displayValue = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        }
        
        html += `<div class="compareflow-cell compareflow-attr-value">
                   ${displayValue}
                 </div>`;
      });
    });

    html += `</div></div>`; // End Grid & Wrapper

    container.innerHTML = html;
  }
});

// Handle Add to Cart clicks globally using event delegation
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('compareflow-add-to-cart-btn')) {
    const btn = e.target;
    const variantId = btn.dataset.variantId;
    
    if (!variantId) return;
    
    const originalText = btn.innerText;
    btn.innerText = 'Adding...';
    btn.disabled = true;

    // Use Shopify's standard AJAX Cart API
    const routesRoot = window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : '/';
    
    fetch(routesRoot + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: variantId, quantity: 1 }]
      })
    })
    .then(res => res.json())
    .then(data => {
      btn.innerText = 'Added to Cart!';
      // Optional: Give the user some time to read it, then reset
      setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
      }, 2000);
      
      // Optional: Trigger a custom event in case the theme's cart drawer is listening
      document.dispatchEvent(new CustomEvent('cart:updated'));

      // Find the closest table ID to track which table this click came from
      const tableContainer = btn.closest('.compareflow-table-container');
      const tableId = tableContainer ? tableContainer.dataset.tableId : null;

      if (tableId) {
        // Track the click event
        fetch('/apps/compareflow/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId: tableId,
            eventType: 'click',
            metadata: { variantId: variantId }
          })
        }).catch(err => console.error('Failed to track click:', err));
      }

    })
    .catch(err => {
      console.error('Add to cart failed:', err);
      btn.innerText = 'Error';
      btn.disabled = false;
    });
  }
});
