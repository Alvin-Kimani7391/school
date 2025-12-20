

// === DOM ELEMENTS ===
const carscontainer = document.getElementById("product");
const cartcontainer = document.getElementById("cart-content");
const carttotal = document.getElementById("cart-total");
const popup = document.getElementById("popup");
const closePopup = document.getElementById("closePopup");
const showcart = document.getElementById("showcart");
const mycart = document.getElementById("mycart");
const mycartcontent = document.getElementById("mycart-content");
const closeMyCart = document.getElementById("closeMyCart");

// Modals
const orderModal = document.getElementById("orderFormModal");
const closeOrderForm = document.getElementById("closeOrderForm");
const hotsearches = document.getElementById("hotsearches");
const closehotsearches = document.getElementById("closehotsearches");

// === EVENT LISTENERS FOR POPUPS ===
closehotsearches.addEventListener("click", () => hotsearches.style.display = "none");
closeOrderForm.addEventListener("click", () => orderModal.style.display = "none");
window.addEventListener("click", e => {
  if (e.target === orderModal) orderModal.style.display = "none";
  if (e.target === hotsearches) hotsearches.style.display = "none";
  if (e.target === mycart) mycart.style.display = "none";
  if (e.target === popup) popup.style.display = "none";
});

// === GLOBAL VARIABLES ===
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let cars = [];
let currentPage = 1;
const productsPerPage = 3;

//cars reshuffle
function shufflearray(array){

for(let i=array.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [array[i],array[j]]=[array[j],array[i]];//swap
}
return array;

}

// === ORDER FORM ===
function sendOrderToSeller() {
  document.getElementById("orderFormModal").style.display = "flex";
}

document.getElementById("orderForm").addEventListener("submit", function (e) {
  e.preventDefault();

  
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  //const buyerName = document.getElementById("buyerName").value.trim();
  const buyerEmail = document.getElementById("buyerEmail").value.trim();
  const buyerPhone = document.getElementById("buyerPhone").value.trim();
  
  const schoolName = document.getElementById("schoolName").value.trim();
  const className = document.getElementById("className").value.trim();
  const regNumber = document.getElementById("regNumber").value.trim();
  const studentName = document.getElementById("studentName").value.trim();

  // send to backend
  fetch("/save-order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schoolName,
      className,
      regNumber,
      studentName,
      cart,
      //buyerName,
      buyerPhone,
      buyerEmail,
      
    })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) throw new Error(data.error || "Save error");
      // Build WhatsApp message
      let message = `🛍️ *New School Order for ${studentName}*\n\n`;
      message += `🏫 School: ${schoolName}\n📘 Class: ${className}\n🧍 Student: ${studentName}\n🆔 Reg No: ${regNumber}\n\n`;
      message += `📞 Phone: ${buyerPhone}\n📧 Email: ${buyerEmail}\n\n`;
      message += `🧾 *Order Details:*\n`;
      let total = 0;
      cart.forEach((item, i) => {
        message += `${i + 1}. ${item.make} ${item.model} - *Ksh.${item.price.toLocaleString()}*\n`;
        total += item.price;
      });
      message += `\n💰 *Total: Ksh.${total.toLocaleString()}*\n\nPlease confirm my order. ✅`;

      const sellerPhone = "254794327798";
      const whatsappURL = `https://wa.me/${sellerPhone}?text=${encodeURIComponent(message)}`;
      window.location.href = whatsappURL;


      localStorage.removeItem("cart");
      if (typeof displaycart === "function") displaycart();
      if (typeof updateshowcart === "function") updateshowcart();
      document.getElementById("orderFormModal").style.display = "none";
    })
    .catch(err => {
      console.error(err);
      alert("Failed to save order. Try again.");
    });
});




// === CART MANAGEMENT ===
showcart.addEventListener("click", () => {
  displaymycart();
  mycart.style.display = "flex";
});

closeMyCart.addEventListener("click", () => (mycart.style.display = "none"));
closePopup.addEventListener("click", () => (popup.style.display = "none"));

function addToCart(id) {
  const car = cars.find(c => c.id === id);
  if (!car) return;

  /*if (cart.some(item => item.id === car.id)) {
    alert(`${car.make} ${car.model} is already in your cart.`);
    return;
  }*/

  cart.push(car);
  localStorage.setItem("cart", JSON.stringify(cart));
  displaycart();
  updateshowcart();
  alert(`${car.make} ${car.model} added to cart successfully!`);
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  localStorage.setItem("cart", JSON.stringify(cart));
  refreshCartUI();
  displaycart();
  displaymycart();
  updateshowcart();
}


/*function removeFromCart(index) {
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  displaycart();
  displaymycart();
  updateshowcart();

}*/

function refreshCartUI() {
   displaycart();
  displaymycart();
  updateshowcart();
}

function checkout(method, total) {
  if (total === 0) {
    alert("Your cart is empty.");
    return;
  }
  if (method === "mpesa") {
    alert(`Initiating M-Pesa payment of Ksh.${total.toLocaleString()}. Check your phone.`);
  } else if (method === "card") {
    alert(`Redirecting to card payment gateway for Ksh.${total.toLocaleString()}.`);
  }
}

function displaymycart() {
  const cartbox = document.getElementById("cartbox");
  mycartcontent.innerHTML = "";
  let itemCount = 0;

  cart.forEach((item, index) => {
    itemCount++;
    const imgSrc = Array.isArray(item.image) ? item.image[0] : item.image;
    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.innerHTML = `
      <div class="mycart-item-info">
        <img src="${imgSrc}" alt="${item.make} ${item.model}" style="width:50px;height:auto;">
        <h3>${item.make} ${item.model}</h3>
        <p><strong>Price: Ksh.${item.price.toLocaleString()}</strong></p>
        <button class="removebtn" onclick="removeFromCart(${item.id})">Remove</button>
      </div>`;
    mycartcontent.appendChild(div);
  });

  cartbox.classList.add("cartboxx");
  cartbox.innerHTML = `MY CART: ${itemCount}`;
}

function updateshowcart() {
  showcart.classList.add("navbutton");
  showcart.innerHTML = `
    <a><i class="fa-solid fa-cart-shopping fa-lg" fa-8xxl style="color: #fdfdfdff;"></i> ${cart.length}</a>`;
}

function displaycart() {
  
  cartcontainer.innerHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    const imgSrc = Array.isArray(item.image) ? item.image[0] : item.image;
    total += item.price;
    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.innerHTML = `
      <div class="cart-item-info">
        <img src="${imgSrc}" alt="${item.make} ${item.model}" style="width:50px;height:auto;">
        <h3>${item.make} ${item.model}</h3>
        <p><strong>Price: Ksh.${item.price.toLocaleString()}</strong></p>
        <button class="removebtn" onclick="removeFromCart(${item.id})">Remove</button>
      </div>`;
    cartcontainer.appendChild(div);
  });

  if (cart.length > 0) {
    const summary = document.createElement("div");
    summary.classList.add("cart-summary");
    summary.innerHTML = `
      <h3>Total: Ksh.${total.toLocaleString()}</h3>
      <!-- This is a comment in HTML
      button class="paybtn" onclick="checkout('mpesa',${total})">Pay with M-Pesa</button>
      <button class="paybtn" onclick="checkout('card',${total})">Pay with Card</button> -->
      <button class="paybtn" id="send-order-btn">Send Order to Seller</button>`;
    cartcontainer.appendChild(summary);

    setTimeout(() => {
      const sendOrderBtn = document.getElementById("send-order-btn");
      if (sendOrderBtn) sendOrderBtn.addEventListener("click", sendOrderToSeller);
    }, 10);
  } else {
    cartcontainer.innerHTML = `<p class="empty">Your cart is empty.</p>`;
  }

  carttotal.textContent = `Total: Ksh.${total.toLocaleString()}`;
}

// === PRODUCT PAGE ===
function openProduct(id) {
  const car = cars.find(c => c.id === id);
  if (!car) return;
  localStorage.setItem("selectedProduct", JSON.stringify(car));
  window.location.href = "carstv.html";
}

// === MENU TOGGLE ===
function togglemenu(){
  const btn  = document.getElementById("button");
  const list = document.getElementById("list");
  btn.classList.toggle("open");
  list.classList.toggle("show");
}

document.addEventListener("click", function(e) {
  const menu   = document.getElementById("list");
  const button = document.getElementById("button");
  const clickoutside = !menu.contains(e.target) && e.target !== button;
  
  if (menu.classList.contains("show") && clickoutside) {
    menu.classList.remove("show");
    button.classList.remove("open");
  }
});

// === MAIN ===
document.addEventListener("DOMContentLoaded", () => {
  // --- Display Cars Function ---
  function displaycars(filter = "", category = "all") {
    carscontainer.innerHTML = "";

    const filteredCars = cars.filter(car => {
      const namematch = (`${car.make} ${car.model}`).toLowerCase().includes(filter.toLowerCase());
      const categorymatch = category === "all" || car.category === category;
      return namematch && categorymatch;
    });

    const totalPages = Math.ceil(filteredCars.length / productsPerPage);
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const carsToShow = filteredCars.slice(startIndex, endIndex);

    

    carsToShow.forEach(car => {
      const imgSrc = Array.isArray(car.image) ? car.image[0] : car.image;
      const div = document.createElement("div");
      div.classList.add("product-item");
      div.setAttribute("data-category", car.category);

     let oldPriceHtml = "";
  if (car.oldPrice) {
    oldPriceHtml = `<p class="old-price"><strong><strong>Was: Ksh.${car.oldPrice.toLocaleString()}</strong></strong></p>`;
  }

      div.innerHTML = `
        <img src="${imgSrc}" alt="${car.make} ${car.model}" onclick="openProduct(${car.id})">
        <div class="product-item-info">
          <h3>${car.make} ${car.model}</h3>
          <p class="price"><strong><strong>Price: Ksh.${car.price.toLocaleString()}</strong></strong></p>
          ${oldPriceHtml}
          <p class="des">${car.description || ""}</p>
          <button class="addbtn" onclick="addToCart(${car.id})">Add To Cart</button>
        </div>`;
      carscontainer.appendChild(div);
    });

    renderPagination(totalPages);
    
    updateshowcart();
  }

  // --- Pagination ---
  function renderPagination(totalPages) {
    const paginationContainer = document.getElementById("pagination");
    if (!paginationContainer) return;
    paginationContainer.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.classList.add("page-btn");
      if (i === currentPage) btn.classList.add("active");
      btn.addEventListener("click", () => {
        currentPage = i;
        displaycars(document.getElementById("searchbar").value.trim().toLowerCase(),
          document.querySelector(".filter-btn.active").getAttribute("data-category"));
      });
      paginationContainer.appendChild(btn);
    }
  }

  // --- Search and Hot Searches ---
  const searchbar = document.getElementById("searchbar");
  searchbar.addEventListener("focus", () => (hotsearches.style.display = "flex"));
  searchbar.addEventListener("blur", () => setTimeout(() => hotsearches.style.display = "none", 150));
  searchbar.addEventListener("keyup", e => {
    const text = e.target.value.trim().toLowerCase();
    displaycars(text, document.querySelector(".filter-btn.active")?.dataset.category || "all");
  });

  // ✅ --- Filter Buttons (including Hot Searches) ---
  document.addEventListener("click", e => {
    if (e.target.classList.contains("filter-btn")) {
      const category = e.target.getAttribute("data-category");
      document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
      e.target.classList.add("active");
      const searchText = searchbar.value.trim().toLowerCase();
      displaycars(searchText, category);
      hotsearches.style.display = "none";
    }
  });

  // === HOT SEARCH CLICK HANDLER (by product name) ===
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("hot-item")) {
    const searchName = e.target.textContent.trim().toLowerCase();

    // Try to find a match in the loaded JSON data
    const product = cars.find(c =>
      (`${c.make} ${c.model}`).trim().toLowerCase() === searchName ||
      c.make.trim().toLowerCase() === searchName
    );

    if (product) {
      localStorage.setItem("selectedProduct", JSON.stringify(product));
      window.location.href = "carstv.html"; // Go to product details page
    } else {
      alert("Product not found in database!");
    }
  }
});


  const showcartbtn=document.getElementById("show-cart-btn");
// Load 
// sgthe car data and initialize
    if (showcart) {
  showcartbtn.addEventListener("click", () => {
    displaymycart();
    popup.style.display = "flex";
  });
}


    const footer = document.getElementById("contact");

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY + window.innerHeight;
  const footerTop = footer.offsetTop;

  if(scrollY >= footerTop) {
    showcartbtn.classList.add('hidden'); // hide button
  } else {
    showcartbtn.classList.remove('hidden'); // show button
  }
});

//to update the cart when add products in cartv,html
  window.addEventListener("pageshow",()=>{
    cart=JSON.parse(localStorage.getItem("cart")) || [];
    updateshowcart();
    displaycart();
    displaymycart();
  });

  // --- Fetch Product Data ---
  fetch("cars.json")
    .then(res => res.json())
    .then(data => {
      cars = data;

      cars=shufflearray(cars);

      console.log("Cars data loaded:", cars);
      displaycars();
    })
    .catch(err => console.error("Error loading cars data:", err));
});