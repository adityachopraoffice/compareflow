// compareflow.js
document.addEventListener('DOMContentLoaded', () => {
  const compareButtons = document.querySelectorAll('.compareflow-button');
  const floatingBar = document.querySelector('.compareflow-floating-bar');
  const compareDrawer = document.querySelector('.compareflow-drawer');

  // Simple state management using localStorage
  let compareList = JSON.parse(localStorage.getItem('compareflow_list') || '[]');

  function updateUI() {
    if (floatingBar) {
      floatingBar.style.display = compareList.length > 0 ? 'flex' : 'none';
      // update thumbnails here
    }
  }

  compareButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.target.dataset.productId;
      if (!compareList.includes(productId)) {
        if (compareList.length >= 4) {
          alert('Maximum 4 products allowed.');
          return;
        }
        compareList.push(productId);
      } else {
        compareList = compareList.filter(id => id !== productId);
      }
      
      localStorage.setItem('compareflow_list', JSON.stringify(compareList));
      updateUI();
    });
  });

  updateUI();
});
