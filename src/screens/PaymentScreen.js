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
import paymentService from '../services/paymentService';

const PaymentScreen = ({ route, navigation }) => {
  const { bookingId, amount, isExtension = false } = route.params;
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isExtension ? 'Pay Extension Fee' : 'Complete Payment'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
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
  amountContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  amountLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10
  },
  amountValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333'
  },
  paymentMethodsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    padding: 20,
    paddingBottom: 10
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  selectedMethod: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007bff'
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
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  selectedMethodText: {
    color: '#007bff'
  },
  methodDescription: {
    fontSize: 14,
    color: '#666'
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
    borderColor: '#007bff'
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007bff'
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8
  },
  securityText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500'
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  payButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  disabledButton: {
    backgroundColor: '#ccc'
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default PaymentScreen;
