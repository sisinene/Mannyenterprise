const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-btn');
menuButton.addEventListener('click', () => {
  const open = header.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
document.querySelectorAll('.site-header a').forEach(link => link.addEventListener('click', () => {
  header.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false');
}));
const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
}), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
document.getElementById('year').textContent = new Date().getFullYear();

const catalogGrid = document.getElementById('catalog-grid');
const paymentNotice = document.getElementById('payment-notice');

function showPaymentNotice(message, type = '') {
  paymentNotice.textContent = message;
  paymentNotice.className = `payment-notice ${type}`.trim();
}

const paymentState = new URLSearchParams(location.search).get('payment');
if (paymentState === 'success') showPaymentNotice('Payment complete — thank you for your order.', 'success');
if (paymentState === 'cancelled') showPaymentNotice('Checkout was cancelled. Nothing was charged.', 'cancelled');

function createCatalogCard(product) {
  const article = document.createElement('article');
  article.className = 'catalog-card reveal visible';
  const meta = document.createElement('p');
  meta.className = 'catalog-meta';
  meta.textContent = `${product.sku} · per ${product.unit}`;
  const title = document.createElement('h4');
  title.textContent = product.name;
  const description = document.createElement('p');
  description.className = 'catalog-description';
  description.textContent = product.description || 'Available from Manny Enterprise.';
  const bottom = document.createElement('div');
  const price = document.createElement('strong');
  price.textContent = new Intl.NumberFormat('en', { style: 'currency', currency: product.currency }).format(product.retail_price);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'buy-button';
  button.textContent = 'Buy now ↗';
  button.addEventListener('click', () => startCheckout(product.id, button));
  bottom.append(price, button);
  article.append(meta, title, description, bottom);
  return article;
}

async function loadCatalog() {
  try {
    const { url, publishableKey } = window.MANNY_SUPABASE;
    const fields = 'id,sku,name,description,unit,retail_price,currency';
    const response = await fetch(`${url}/rest/v1/products?select=${fields}&active=eq.true&retail_price=not.is.null&order=name.asc`, { headers: { apikey: publishableKey } });
    if (!response.ok) throw new Error(`Catalog failed (${response.status})`);
    const products = await response.json();
    catalogGrid.replaceChildren(...products.map(createCatalogCard));
  } catch (error) {
    console.error('Catalog error:', error);
    catalogGrid.textContent = 'The live catalog is temporarily unavailable.';
  }
}

async function startCheckout(productId, button) {
  if (!/^https?:$/.test(location.protocol)) {
    showPaymentNotice('Secure checkout requires the local HTTP preview, not a file:// page.', 'cancelled');
    return;
  }
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Opening…';
  showPaymentNotice('');
  try {
    const { url, publishableKey, checkoutFunction } = window.MANNY_SUPABASE;
    const response = await fetch(`${url}/functions/v1/${checkoutFunction}`, {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, quantity: 1, site_url: location.origin })
    });
    const result = await response.json();
    if (!response.ok || !result.url) throw new Error(result.error || 'Checkout unavailable');
    location.assign(result.url);
  } catch (error) {
    console.error('Checkout error:', error);
    showPaymentNotice(error.message === 'Stripe is not configured' ? 'Stripe needs one final server-side secret setting.' : 'Could not open checkout. Please try again.', 'error');
    button.disabled = false;
    button.textContent = original;
  }
}

loadCatalog();

const quoteForm = document.getElementById('quote-form');
const formStatus = document.getElementById('form-status');
quoteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = quoteForm.querySelector('button[type="submit"]');
  const originalLabel = button.innerHTML;
  const data = new FormData(quoteForm);
  const payload = {
    name: data.get('name').trim(),
    email: data.get('email').trim(),
    phone: data.get('phone').trim() || null,
    customer_type: data.get('customer_type'),
    project_details: data.get('project_details').trim()
  };

  button.disabled = true;
  button.textContent = 'Sending…';
  formStatus.textContent = '';
  formStatus.className = 'form-status';

  try {
    const { url, publishableKey } = window.MANNY_SUPABASE;
    const response = await fetch(`${url}/rest/v1/quote_requests`, {
      method: 'POST',
      headers: { 'apikey': publishableKey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    quoteForm.reset();
    formStatus.textContent = 'Thanks — your request has been received.';
    formStatus.classList.add('success');
  } catch (error) {
    console.error('Quote request error:', error);
    formStatus.textContent = 'Could not send. Please try again or email us.';
    formStatus.classList.add('error');
  } finally {
    button.disabled = false;
    button.innerHTML = originalLabel;
  }
});
