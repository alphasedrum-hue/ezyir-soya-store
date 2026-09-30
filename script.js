// Global Cart Array
let cart = [];

// Initialize Mobile Navigation and Date Range Limiters when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Mobile Navigation Toggle
  const mobileMenu = document.getElementById('mobile-menu');
  const navMenu = document.querySelector('.nav-menu');

  if (mobileMenu && navMenu) {
    mobileMenu.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
  }

  // Setup Date Picker Boundaries (Starting Tomorrow up to 3 Weeks Max)
  setupDatePicker();
});

/**
 * Sets up Date Picker starting strictly from TOMORROW (excluding purchasing day)
 * up to 21 Days (3 Weeks) ahead.
 */
function setupDatePicker() {
  const dateInput = document.getElementById('schedule-date');
  if (!dateInput) return;

  // Set minimum date to Tomorrow (excludes purchasing day)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  // Set maximum date to 21 days after tomorrow
  const maxDate = new Date();
  maxDate.setDate(minDate.getDate() + 21);

  // Format as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  dateInput.min = formatDate(minDate);
  dateInput.max = formatDate(maxDate);
  dateInput.value = formatDate(minDate); // Default selection set to tomorrow
}

// Add Item to Cart (No time-restriction alert popups)
function addToCart(name, price, type) {
  const existingItem = cart.find(item => item.name === name);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ name, price, quantity: 1, type: type });
  }
  renderCart();
}

// Remove Item from Cart
function removeFromCart(name) {
  cart = cart.filter(item => item.name !== name);
  renderCart();
}

// Update Item Quantity
function updateQuantity(name, change) {
  const item = cart.find(item => item.name === name);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(name);
    } else {
      renderCart();
    }
  }
}

// Render Cart HTML
function renderCart() {
  const cartContainer = document.getElementById('cart-items');
  const totalSpan = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');

  if (!cartContainer || !totalSpan || !checkoutBtn) return;

  if (cart.length === 0) {
    cartContainer.innerHTML = '<p class="empty-cart-msg">Your cart is currently empty.</p>';
    totalSpan.innerText = '0.00';
    checkoutBtn.disabled = true;
    return;
  }

  let html = '';
  let total = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    html += `
      <div class="cart-item">
        <div>
          <strong>${item.name}</strong><br>
          GH₵ ${item.price.toLocaleString()} x ${item.quantity} = GH₵ ${itemTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
        </div>
        <div class="cart-controls">
          <button type="button" onclick="updateQuantity('${item.name}', -1)">-</button>
          <span>${item.quantity}</span>
          <button type="button" onclick="updateQuantity('${item.name}', 1)">+</button>
        </div>
      </div>
    `;
  });

  cartContainer.innerHTML = html;
  totalSpan.innerText = total.toLocaleString(undefined, {minimumFractionDigits: 2});
  checkoutBtn.disabled = false;
}

// Handle Paystack Payment Integration
function payWithPaystack(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const fulfillmentType = document.getElementById('fulfillment-type').value;
  const scheduledDate = document.getElementById('schedule-date').value;
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (!scheduledDate) {
    alert("Please select a valid delivery or pickup date.");
    return;
  }

  let handler = PaystackPop.setup({
    key: 'pk_test_YOUR_PAYSTACK_PUBLIC_KEY', // Replace with your actual Paystack Public Key
    email: email,
    amount: totalAmount * 100,
    currency: 'GHS',
    metadata: {
      custom_fields: [
        { display_name: "Phone Number", variable_name: "phone", value: phone },
        { display_name: "Fulfillment Option", variable_name: "fulfillment_option", value: fulfillmentType },
        { display_name: "Booked Date", variable_name: "booked_date", value: scheduledDate }
      ]
    },
    callback: function(response) {
      alert(`Payment Successful! Reference: ${response.reference}\n\nYour order has been booked for ${fulfillmentType} on ${scheduledDate}.`);
      cart = [];
      renderCart();
      document.getElementById('paymentForm').reset();
      setupDatePicker();
    },
    onClose: function() {
      alert('Transaction cancelled.');
    }
  });

  handler.openIframe();
}