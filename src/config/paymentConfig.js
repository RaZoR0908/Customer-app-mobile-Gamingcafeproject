// Payment Configuration
// Set to 'production' for real PayU integration, 'testing' for demo mode
export const PAYMENT_MODE = 'testing'; // Change to 'production' when ready for live payments

export const PAYMENT_CONFIG = {
  testing: {
    useRealPayU: true, // Enable real PayU for testing
    simulateDelay: 0, // No delay for real testing
    showTestingNotice: true
  },
  production: {
    useRealPayU: true,
    simulateDelay: 0,
    showTestingNotice: false
  }
};

export const getPaymentConfig = () => {
  const config = PAYMENT_CONFIG[PAYMENT_MODE];
  console.log('Payment Config Loaded:', { mode: PAYMENT_MODE, config });
  return config;
};
