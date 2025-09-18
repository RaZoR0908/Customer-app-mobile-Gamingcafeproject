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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import paymentService from '../services/paymentService';

const WalletScreen = ({ navigation }) => {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await paymentService.getWalletBalance();
      setWalletData(response);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      Alert.alert('Error', 'Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  const handleTopUp = () => {
    navigation.navigate('WalletTopUp');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type, method) => {
    if (type === 'credit') {
      return 'add-circle';
    } else {
      if (method === 'extension') return 'time';
      if (method === 'booking') return 'game-controller';
      return 'remove-circle';
    }
  };

  const getTransactionColor = (type) => {
    return type === 'credit' ? '#28a745' : '#dc3545';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Ionicons name="card" size={24} color="#007bff" />
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
        </View>
          <Text style={styles.balanceAmount}>₹{walletData?.balance || 0}</Text>
          <TouchableOpacity style={styles.topUpButton} onPress={handleTopUp}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.topUpButtonText}>Add Money</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('MyBookings')}>
            <Ionicons name="list" size={24} color="#007bff" />
            <Text style={styles.actionText}>My Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="home" size={24} color="#28a745" />
            <Text style={styles.actionText}>Home</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          
          {walletData?.transactions && walletData.transactions.length > 0 ? (
            walletData.transactions
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 10)
              .map((transaction, index) => (
                <View key={index} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={getTransactionIcon(transaction.type, transaction.method)}
                      size={20}
                      color={getTransactionColor(transaction.type)}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={[
                      styles.amountText,
                      { color: getTransactionColor(transaction.type) }
                    ]}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                    </Text>
                  </View>
                </View>
              ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubText}>
                Your transaction history will appear here
              </Text>
            </View>
          )}
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
  balanceCard: {
    backgroundColor: '#007bff',
    padding: 25,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 10
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'flex-start'
  },
  topUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    flex: 0.45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8
  },
  transactionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15
  },
  transactionDetails: {
    flex: 1
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  transactionDate: {
    fontSize: 12,
    color: '#666'
  },
  transactionAmount: {
    alignItems: 'flex-end'
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 10
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center'
  }
});

export default WalletScreen;
