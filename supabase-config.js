// Publishable keys are designed for browser use. Never place a Supabase secret key here.
window.MANNY_SUPABASE = Object.freeze({
  url: 'https://icmyjsafstohqydliqqp.supabase.co',
  publishableKey: 'sb_publishable_2O93NCy8xartuhpMNcSkbQ_vWYCuE3X',
  checkoutFunction: 'create-checkout-session'
});

// Stripe publishable keys are safe for browser code. The secret key lives only in Supabase.
window.MANNY_STRIPE = Object.freeze({
  publishableKey: 'pk_test_51TjEeX07eORQkfTF1I2u3xLz2kOQBh0UThwRk7lk6dooo2ZmMrpugTASnJ0eSX1Z8VNfleo1KsGIFPKEelRyzgd500FD4C4IKL'
});
