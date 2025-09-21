import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Linking
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import paymentService from '../services/paymentService';
import { getPaymentConfig } from '../config/paymentConfig';

const RealPayUScreen = ({ route, navigation }) => {
  const { bookingId, amount, isExtension, isWalletTopUp, paymentData: passedPaymentData } = route.params;
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(passedPaymentData || null);
  const [showWebView, setShowWebView] = useState(false);

  // Hide the navigation header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (passedPaymentData) {
      setPaymentData(passedPaymentData);
    } else {
      createPaymentOrder();
    }
  }, []);

  const createPaymentOrder = async () => {
    try {
      setLoading(true);
      
      const response = await paymentService.createPaymentOrder(
        bookingId,
        amount,
        'card', // Default to card for PayU
        isExtension,
        isWalletTopUp
      );
      setPaymentData(response);
    } catch (error) {
      console.error('RealPayUScreen - Error creating payment order:', error);
      Alert.alert('Error', 'Failed to create payment order');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (!paymentData || !paymentData.payuParams) {
      Alert.alert('Error', 'Payment data not available');
      return;
    }
    setShowWebView(true);
  };

  const handleWebViewNavigationStateChange = async (navState) => {
    // Check if payment was successful or failed
    if (navState.url.includes('payment/success')) {
      
      try {
        // Verify the payment with backend
        if (isWalletTopUp) {
          await paymentService.verifyWalletTopUp(paymentData.paymentId, {
            status: 'success',
            txnid: paymentData.payuParams.txnid,
            amount: paymentData.payuParams.amount,
            productinfo: paymentData.payuParams.productinfo,
            firstname: paymentData.payuParams.firstname,
            email: paymentData.payuParams.email,
            hash: 'mock_hash_for_demo' // For testing
          });
        } else {
          await paymentService.verifyPayment(paymentData.paymentId, {
            status: 'success',
            txnid: paymentData.payuParams.txnid,
            amount: paymentData.payuParams.amount,
            productinfo: paymentData.payuParams.productinfo,
            firstname: paymentData.payuParams.firstname,
            email: paymentData.payuParams.email,
            hash: 'mock_hash_for_demo' // For testing
          });
        }
        
        Alert.alert('Payment Successful!', 'Your payment has been processed successfully!', [
          {
            text: 'OK',
            onPress: () => {
              if (isWalletTopUp) {
                // Navigate to Wallet screen for wallet top-ups
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'Home' },
                    { name: 'Wallet' }
                  ]
                });
              } else {
                // Navigate to MyBookings for regular payments
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'Home' },
                    { name: 'MyBookings' }
                  ]
                });
              }
            }
          }
        ]);
      } catch (error) {
        console.error('Payment verification failed:', error);
        Alert.alert('Verification Failed', 'Payment was successful but verification failed. Please contact support.', [
          {
            text: 'OK',
            onPress: () => setShowWebView(false)
          }
        ]);
      }
    } else if (navState.url.includes('payment/failure')) {
      Alert.alert('Payment Failed', 'Your payment could not be processed. Please try again.', [
        {
          text: 'OK',
          onPress: () => setShowWebView(false)
        }
      ]);
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={['#1e293b', '#0f172a']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitlePrefix}>PayU</Text>
              <Text style={styles.headerTitleMain}>Payment</Text>
              <View style={styles.headerUnderline} />
            </View>
            
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Creating payment order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showWebView && paymentData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={['#1e293b', '#0f172a']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setShowWebView(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitlePrefix}>PayU</Text>
              <Text style={styles.headerTitleMain}>Payment</Text>
              <View style={styles.headerUnderline} />
            </View>
            
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        
        <WebView
          source={{
            uri: paymentData.paymentUrl,
            method: 'POST',
            body: Object.keys(paymentData.payuParams)
              .map(key => `${key}=${encodeURIComponent(paymentData.payuParams[key])}`)
              .join('&'),
          }}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          style={styles.webview}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#1e293b', '#0f172a']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitlePrefix}>PayU</Text>
            <Text style={styles.headerTitleMain}>Payment</Text>
            <View style={styles.headerUnderline} />
          </View>
          
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
      >
        {/* Testing Notice */}
        {getPaymentConfig().showTestingNotice && (
          <View style={styles.testingNotice}>
            <Ionicons name="warning" size={20} color="#ff6b35" />
            <Text style={styles.testingText}>
              Testing Mode - Using PayU Test Environment
            </Text>
          </View>
        )}

        {/* Payment Details */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentHeader}>
            <Ionicons name="card" size={24} color="#007bff" />
            <Text style={styles.paymentTitle}>Payment Details</Text>
          </View>
          
          <View style={styles.paymentInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Type:</Text>
              <Text style={styles.infoValue}>
                {isWalletTopUp ? 'Wallet Top-up' : 
                 isExtension ? 'Extension Payment' : 'Booking Payment'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Gateway:</Text>
              <Text style={styles.infoValue}>PayU Money</Text>
            </View>
          </View>
        </View>

        {/* Test Cards Info */}
        <View style={styles.testCardsCard}>
          <View style={styles.testCardsHeader}>
            <Ionicons name="information-circle" size={20} color="#28a745" />
            <Text style={styles.testCardsTitle}>Test Cards for PayU</Text>
          </View>
          
          <View style={styles.testCardsList}>
            <View style={styles.testCardItem}>
              <Text style={styles.testCardNumber}>4111 1111 1111 1111</Text>
              <Text style={styles.testCardInfo}>Visa - Any CVV, Any Expiry</Text>
            </View>
            <View style={styles.testCardItem}>
              <Text style={styles.testCardNumber}>5555 5555 5555 4444</Text>
              <Text style={styles.testCardInfo}>Mastercard - Any CVV, Any Expiry</Text>
            </View>
            <View style={styles.testCardItem}>
              <Text style={styles.testCardNumber}>4000 0000 0000 0002</Text>
              <Text style={styles.testCardInfo}>Visa - Declined Transaction</Text>
            </View>
          </View>
        </View>

        {/* UPI Info */}
        <View style={styles.upiCard}>
          <View style={styles.upiHeader}>
            <Ionicons name="phone-portrait" size={20} color="#6f42c1" />
            <Text style={styles.upiTitle}>UPI Testing</Text>
          </View>
          <Text style={styles.upiText}>
            For UPI testing, use any valid UPI ID format like:
            {'\n'}• yourname@paytm
            {'\n'}• yourname@phonepe
            {'\n'}• yourname@googlepay
          </Text>
        </View>

        {/* OTP Testing */}
        <View style={styles.otpCard}>
          <View style={styles.otpHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#ff6b35" />
            <Text style={styles.otpTitle}>OTP Testing</Text>
          </View>
          <Text style={styles.otpText}>
            For OTP verification on PayU portal, use:
            {'\n'}• Correct OTP: 123456
          </Text>
        </View>


      </ScrollView>

      {/* Fixed Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
          <Ionicons name="card" size={20} color="#fff" />
          <Text style={styles.payButtonText}>Proceed to PayU Payment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  webview: {
    flex: 1
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
    flexDirection: 'column',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerTitlePrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerTitleMain: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerUnderline: {
    width: 60,
    height: 3,
    backgroundColor: '#007AFF',
    marginTop: 4,
    borderRadius: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 80
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#1e293b',
    marginTop: 10,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  testingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  testingText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 10,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  paymentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF'
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 10,
    letterSpacing: 0.3
  },
  paymentInfo: {
    gap: 8
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.2
  },
  testCardsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745'
  },
  testCardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  testCardsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#28a745',
    marginLeft: 10,
    letterSpacing: 0.3
  },
  testCardsList: {
    gap: 8
  },
  testCardItem: {
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
    marginBottom: 6
  },
  testCardNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'monospace',
    letterSpacing: 0.5
  },
  testCardInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
    fontWeight: '500'
  },
  upiCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#6f42c1'
  },
  upiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  upiTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6f42c1',
    marginLeft: 10,
    letterSpacing: 0.3
  },
  upiText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.2
  },
  otpCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#ff6b35'
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  otpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6b35',
    marginLeft: 10,
    letterSpacing: 0.3
  },
  otpText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.2
  },
  footer: {
    padding: 20,
    paddingBottom: 50,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: 0.4
  },
});

export default RealPayUScreen;