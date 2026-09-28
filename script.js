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

  // Check store operational time if on the store page
  if (document.getElementById('time-notification')) {
    checkStoreTimeStatus();
    setInterval(checkStoreTimeStatus, 30000); // Re-check every 30 seconds
  }
});

/**
 * Limits the Date Selector starting from TOMORROW up to 21 Days (3 Weeks) in the future.
 * Excludes same-day booking.
 */
function setupDatePicker() {
  const dateInput = document.getElementById('schedule-date');
  if (!dateInput) return;

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // Exclude today, start from tomorrow

  const maxDate = new Date();
  maxDate.setDate(minDate.getDate() + 21); // 3 weeks limit from tomorrow

  // Format as YYYY-MM-DD
  const formatDate = (date) => date.toISOString().split('T')[0];

  dateInput.min = formatDate(minDate);
  dateInput.max = formatDate(maxDate);
  dateInput.value = formatDate(minDate); // Default to tomorrow
}

/**
  * Checks whether current time falls within the daily cutoff period (4:40 PM to 12:30 AM)
  */
function isAfterCutoffWindow() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const cutoffTime = 16 * 60 + 40; // 4:40 PM (1000 minutes)
  const reopenTime = 0 * 60 + 30;   // 12:30 AM (30 minutes)

  return currentMinutes >= cutoffTime || currentMinutes < reopenTime;
}

// Function to update the store banner status
function checkStoreTimeStatus() {
  const banner = document.getElementById('time-notification');
  const checkoutBtn = document.getElementById('checkout-btn');

  if (!banner) return;

  if (isAfterCutoffWindow()) {
    banner.style.display = 'block';
    banner.style.backgroundColor = '#fff3cd';
    banner.style.color = '#856404';
    banner.style.border = '1px solid #ffeeba';
    banner.innerHTML = '⚠️ <strong>Notice:</strong> Store hours update: Orders placed now can be scheduled starting tomorrow up to 3 weeks ahead.';
    
    if (checkoutBtn) {
      checkoutBtn.innerText = "Place Booked Order & Pay";
    }
  } else {
    banner.style.display = 'none';
    if (checkoutBtn) {
      checkoutBtn.innerText = "Place Order & Pay";
    }
  }
}

// Add Item to Cart with Cutoff Alert Prompt
function addToCart(name, price, type) {
  if (isAfterCutoffWindow()) {
    alert("Notice: Please select a delivery or pickup date starting tomorrow up to the next 3 weeks at checkout.");
  }

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