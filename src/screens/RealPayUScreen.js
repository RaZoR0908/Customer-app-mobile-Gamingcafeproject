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
import paymentService from '../services/paymentService';
import { getPaymentConfig } from '../config/paymentConfig';

const RealPayUScreen = ({ route, navigation }) => {
  const { bookingId, amount, isExtension, isWalletTopUp, paymentData: passedPaymentData } = route.params;
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(passedPaymentData || null);
  const [showWebView, setShowWebView] = useState(false);

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

  const handlePaymentSuccess = () => {
    // This will be called when user returns from PayU
    navigation.reset({
      index: 0,
      routes: [
        { name: 'Home' },
        { name: 'MyBookings' }
      ]
    });
  };

  const handlePaymentFailure = () => {
    Alert.alert('Payment Failed', 'Payment was not successful. Please try again.');
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Creating payment order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showWebView && paymentData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowWebView(false)}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PayU Payment</Text>
          <View style={{ width: 24 }} />
        </View>
        
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PayU Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
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
              <Text style={styles.infoLabel}>Amount:</Text>
              <Text style={styles.infoValue}>₹{amount}</Text>
            </View>
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

        {/* Payment Button */}
        <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
          <Ionicons name="card" size={20} color="#fff" />
          <Text style={styles.payButtonText}>Proceed to PayU Payment</Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.successButton} 
            onPress={handlePaymentSuccess}
          >
            <Ionicons name="checkmark-circle" size={20} color="#28a745" />
            <Text style={styles.successButtonText}>Payment Success</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.failureButton} 
            onPress={handlePaymentFailure}
          >
            <Ionicons name="close-circle" size={20} color="#dc3545" />
            <Text style={styles.failureButtonText}>Payment Failed</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  webview: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  content: {
    flex: 1,
    padding: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10
  },
  testingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35'
  },
  testingText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 10,
    fontWeight: '500'
  },
  paymentCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10
  },
  paymentInfo: {
    gap: 10
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  infoLabel: {
    fontSize: 16,
    color: '#666'
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  testCardsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  testCardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  testCardsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    marginLeft: 10
  },
  testCardsList: {
    gap: 10
  },
  testCardItem: {
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745'
  },
  testCardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'monospace'
  },
  testCardInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  upiCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  upiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  upiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6f42c1',
    marginLeft: 10
  },
  upiText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10
  },
  successButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d4edda',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c3e6cb'
  },
  successButtonText: {
    color: '#28a745',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  failureButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8d7da',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb'
  },
  failureButtonText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  }
});

export default RealPayUScreen;