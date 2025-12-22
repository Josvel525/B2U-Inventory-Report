document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addProductForm");
  if (!form) return;

  function renderManage() {
    const list = document.getElementById("manageList");
    if (!list) return;
    list.innerHTML = products.map((p, i) => `
      <div class="product" style="flex-direction:row; justify-content:space-between; align-items:center;">
        <span>${p.name}</span>
        <button class="ghost" onclick="deleteProduct(${i})">Delete</button>
      </div>
    `).join("");
  }

  window.deleteProduct = (index) => {
    if(confirm("Delete " + products[index].name + "?")) {
      products.splice(index, 1);
      save(false);
      renderManage();
    }
  };

  form.addEventListener("submit", e => {
    e.preventDefault();
    products.unshift({
      name: document.getElementById("name").value,
      category: document.getElementById("category").value || "Other",
      singles: 0, cases: 0, pack: 24, completed: false
    });
    save(false);
    renderManage();
    form.reset();
  });

  ensureProductsLoaded().then(renderManage);
});
