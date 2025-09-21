import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import paymentService from '../services/paymentService';

const PaymentScreen = ({ route, navigation }) => {
  const { bookingId, amount, isExtension = false } = route.params;
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  // Hide the navigation header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    // Fetch wallet balance for display purposes only
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const response = await paymentService.getWalletBalance();
      setWalletBalance(response.balance);
      return response.balance;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0); // Set default balance if fetch fails
      return 0;
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setLoading(true);

    try {
      if (selectedMethod === 'wallet') {
        // Fetch fresh wallet balance when wallet is selected
        const freshBalance = await fetchWalletBalance();
        
        if (freshBalance < amount) {
          Alert.alert('Insufficient Balance', 'You don\'t have enough balance in your wallet');
          setLoading(false);
          return;
        }

        const response = await paymentService.processWalletPayment(bookingId, amount, isExtension);
        
        Alert.alert(
          'Payment Successful! 🎉',
          'Your payment has been processed successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset navigation stack to Home, then navigate to MyBookings
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'Home' },
                    { name: 'MyBookings' }
                  ],
                });
              }
            }
          ]
        );
      } else {
        // Create payment order for all online payment methods (card, UPI, netbanking)
        const response = await paymentService.createPaymentOrder(
          bookingId, 
          amount, 
          selectedMethod, 
          isExtension
        );

        // Navigate directly to RealPayU for all online payments
        navigation.navigate('RealPayU', {
          bookingId: response.bookingId || bookingId,
          amount: response.amount,
          paymentMethod: selectedMethod,
          isExtension,
          isWalletTopUp: false,
          paymentData: response
        });
      }
    } catch (error) {
      Alert.alert('Payment Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: 'wallet',
      name: 'Wallet',
      icon: 'card',
      description: `Balance: ₹${walletBalance}`,
      available: true
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: 'card',
      description: 'Visa, Mastercard, RuPay',
      available: true
    },
    {
      id: 'upi',
      name: 'UPI',
      icon: 'phone-portrait',
      description: 'Google Pay, PhonePe, Paytm',
      available: true
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      icon: 'business',
      description: 'All major banks',
      available: true
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Beautiful Header with Gradient */}
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
            <Text style={styles.headerTitlePrefix}>
              {isExtension ? 'Pay Extension' : 'Complete'}
            </Text>
            <Text style={styles.headerTitleMain}>
              {isExtension ? 'Extension Fee' : 'Payment'}
            </Text>
            <View style={styles.headerUnderline} />
          </View>
          
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amountValue}>₹{amount}</Text>
        </View>

        <View style={styles.paymentMethodsContainer}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                selectedMethod === method.id && styles.selectedMethod
              ]}
              onPress={() => setSelectedMethod(method.id)}
              disabled={!method.available}
            >
              <View style={styles.methodInfo}>
                <Ionicons 
                  name={method.icon} 
                  size={24} 
                  color={selectedMethod === method.id ? '#007bff' : '#333'} 
                />
                <View style={styles.methodDetails}>
                  <Text style={[
                    styles.methodName,
                    selectedMethod === method.id && styles.selectedMethodText
                  ]}>
                    {method.name}
                  </Text>
                  <Text style={styles.methodDescription}>{method.description}</Text>
                </View>
              </View>
              <View style={[
                styles.radioButton,
                selectedMethod === method.id && styles.selectedRadioButton
              ]}>
                {selectedMethod === method.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={20} color="#28a745" />
          <Text style={styles.securityText}>
            Your payment is secured by PayU Money
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, (!selectedMethod || loading) && styles.disabledButton]}
          onPress={handlePayment}
          disabled={!selectedMethod || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>
              {isExtension ? 'Pay Extension Fee' : 'Pay Now'}
            </Text>
          )}
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
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  backButton: {
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
    paddingHorizontal: 20,
  },
  headerTitlePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 2,
  },
  headerTitleMain: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    marginBottom: 6,
  },
  headerUnderline: {
    width: 50,
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 100
  },
  amountContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 100,
  },
  amountLabel: {
    fontSize: 17,
    color: '#6b7280',
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.4
  },
  amountValue: {
    fontSize: 38,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: 1.1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  paymentMethodsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    padding: 16,
    paddingBottom: 8,
    letterSpacing: 0.4
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  selectedMethod: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  methodDetails: {
    marginLeft: 15,
    flex: 1
  },
  methodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
    letterSpacing: 0.3
  },
  selectedMethodText: {
    color: '#007AFF'
  },
  methodDescription: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500'
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectedRadioButton: {
    borderColor: '#007AFF'
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF'
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  securityText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    letterSpacing: 0.2
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
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
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0
  },
  payButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4
  }
});

export default PaymentScreen;
