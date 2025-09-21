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
import { LinearGradient } from 'expo-linear-gradient';
import paymentService from '../services/paymentService';

const WalletTopUpScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);

  // Hide navigation header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

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
            <Text style={styles.headerTitlePrefix}>Add Money</Text>
            <Text style={styles.headerTitleMain}>to Wallet</Text>
            <View style={styles.headerUnderline} />
          </View>
          
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

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
                  color={selectedMethod === method.id ? '#007AFF' : '#1e293b'} 
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
  safeArea: {
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
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerTitleMain: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.0,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
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
    padding: 18,
    paddingBottom: 130
  },
  amountContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 15,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    letterSpacing: 0.3
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
    backgroundColor: '#f8f9fa'
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: '#007AFF',
    marginRight: 10,
    letterSpacing: 0.3
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    paddingVertical: 14,
    letterSpacing: 0.3
  },
  predefinedAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  amountButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  selectedAmountButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  amountButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.3
  },
  selectedAmountButtonText: {
    color: '#fff',
    fontWeight: '800'
  },
  paymentMethodsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 6
  },
  selectedMethod: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    borderRadius: 8
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  methodDetails: {
    marginLeft: 16,
    flex: 1
  },
  methodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 3,
    letterSpacing: 0.1
  },
  selectedMethodText: {
    color: '#007AFF',
    fontWeight: '700'
  },
  methodDescription: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500'
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa'
  },
  selectedRadioButton: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff'
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  securityText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#2e7d32',
    fontWeight: '700',
    letterSpacing: 0.3
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    paddingBottom: 42,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1
  },
  topUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.2
  }
});

export default WalletTopUpScreen;
