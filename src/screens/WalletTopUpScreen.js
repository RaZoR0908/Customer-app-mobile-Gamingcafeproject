import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import paymentService from '../services/paymentService';

const WalletTopUpScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);

  const predefinedAmounts = [100, 250, 500, 1000, 2000, 5000];

  const handleTopUp = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setLoading(true);

    try {
      console.log('Creating wallet top-up:', { amount: parseFloat(amount), selectedMethod });
      
      const response = await paymentService.createWalletTopUp(
        parseFloat(amount),
        selectedMethod
      );

      console.log('Wallet top-up response:', response);

      if (selectedMethod === 'wallet') {
        // This shouldn't happen for top-up, but handle it
        Alert.alert('Error', 'Cannot use wallet to top up wallet');
        return;
      }

      console.log('Navigating to RealPayU for wallet top-up');
      // Navigate to Real PayU for online payments with existing payment data
      navigation.navigate('RealPayU', {
        bookingId: null,
        amount: parseFloat(amount), // Use the original amount from the form
        isExtension: false,
        isWalletTopUp: true,
        paymentData: response // Pass the existing payment data
      });
    } catch (error) {
      Alert.alert('Top-up Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: 'card',
      description: 'Visa, Mastercard, RuPay'
    },
    {
      id: 'upi',
      name: 'UPI',
      icon: 'phone-portrait',
      description: 'Google Pay, PhonePe, Paytm'
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      icon: 'business',
      description: 'All major banks'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Money to Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Amount Selection */}
        <View style={styles.amountContainer}>
          <Text style={styles.sectionTitle}>Enter Amount</Text>
          
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <View style={styles.predefinedAmounts}>
            {predefinedAmounts.map((predefinedAmount) => (
              <TouchableOpacity
                key={predefinedAmount}
                style={[
                  styles.amountButton,
                  amount === predefinedAmount.toString() && styles.selectedAmountButton
                ]}
                onPress={() => setAmount(predefinedAmount.toString())}
              >
                <Text style={[
                  styles.amountButtonText,
                  amount === predefinedAmount.toString() && styles.selectedAmountButtonText
                ]}>
                  ₹{predefinedAmount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Methods */}
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

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={20} color="#28a745" />
          <Text style={styles.securityText}>
            Your payment is secured by PayU Money
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.topUpButton, (!amount || !selectedMethod || loading) && styles.disabledButton]}
          onPress={handleTopUp}
          disabled={!amount || !selectedMethod || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.topUpButtonText}>Add ₹{amount || '0'}</Text>
            </>
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
    padding: 20,
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
    marginBottom: 15
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    paddingVertical: 15
  },
  predefinedAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  amountButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  selectedAmountButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff'
  },
  amountButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  selectedAmountButtonText: {
    color: '#fff'
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
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 8
  },
  disabledButton: {
    backgroundColor: '#ccc'
  },
  topUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  }
});

export default WalletTopUpScreen;
