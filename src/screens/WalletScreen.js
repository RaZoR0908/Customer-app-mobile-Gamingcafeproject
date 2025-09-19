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
  RefreshControl,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import paymentService from '../services/paymentService';

const WalletScreen = ({ navigation }) => {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'amount_high', 'amount_low'
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Set today's date as default
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const sortOptions = [
    { key: 'newest', label: 'Newest First', icon: 'arrow-down' },
    { key: 'oldest', label: 'Oldest First', icon: 'arrow-up' },
    { key: 'amount_high', label: 'Highest Amount', icon: 'trending-up' },
    { key: 'amount_low', label: 'Lowest Amount', icon: 'trending-down' }
  ];

  const sortTransactions = (transactions, order) => {
    const sorted = [...transactions];
    switch (order) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'amount_high':
        return sorted.sort((a, b) => b.amount - a.amount);
      case 'amount_low':
        return sorted.sort((a, b) => a.amount - b.amount);
      default:
        return sorted;
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  useEffect(() => {
    if (walletData?.transactions) {
      // Apply date filter first (if any), then sort
      const baseTransactions = selectedDate 
        ? filterTransactionsByDate(walletData.transactions, selectedDate)
        : walletData.transactions;
      
      const sorted = sortTransactions(baseTransactions, sortOrder);
      setFilteredTransactions(sorted);
    }
  }, [walletData, sortOrder, selectedDate]);

  const fetchWalletData = async () => {
    try {
      const response = await paymentService.getWalletBalance();
      setWalletData(response);
      // Don't set filteredTransactions here - let useEffect handle it
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

  const filterTransactionsByDate = (transactions, date) => {
    if (!date) return transactions;
    const selectedDateStr = date.split('T')[0]; // Get YYYY-MM-DD format
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt).toISOString().split('T')[0];
      return transactionDate === selectedDateStr;
    });
  };

  const handleSortChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
    setShowSortModal(false);
    
    // Apply sorting to the base transactions (with date filter if applied)
    const baseTransactions = selectedDate 
      ? filterTransactionsByDate(walletData?.transactions || [], selectedDate)
      : walletData?.transactions || [];
    
    const sorted = sortTransactions(baseTransactions, newSortOrder);
    setFilteredTransactions(sorted);
  };

  const handleDateSelect = (day) => {
    const dateStr = day.dateString;
    setSelectedDate(dateStr);
    setShowCalendar(false);
    
    // Filter by date first, then apply current sort order
    const filtered = filterTransactionsByDate(walletData?.transactions || [], dateStr);
    const sorted = sortTransactions(filtered, sortOrder);
    setFilteredTransactions(sorted);
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    // Apply current sort order to all transactions
    const sorted = sortTransactions(walletData?.transactions || [], sortOrder);
    setFilteredTransactions(sorted);
  };

  const showTodaysTransactions = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    // Filter by today's date and apply current sort order
    const filtered = filterTransactionsByDate(walletData?.transactions || [], today);
    const sorted = sortTransactions(filtered, sortOrder);
    setFilteredTransactions(sorted);
  };

  const toggleShowAll = () => {
    setShowAllTransactions(!showAllTransactions);
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
      if (method === 'online') return 'card';
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
        contentContainerStyle={styles.scrollContent}
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
          <View style={styles.transactionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.filterButton} 
                onPress={() => setShowCalendar(true)}
              >
                <Ionicons name="calendar" size={20} color="#007bff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.sortButton} 
                onPress={() => setShowSortModal(true)}
              >
                <Ionicons name="swap-vertical" size={20} color="#007bff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.showAllButton} 
                onPress={clearDateFilter}
              >
                <Ionicons name="list" size={20} color="#007bff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Status */}
          {selectedDate && (
            <View style={styles.filterStatus}>
              <Text style={styles.filterText}>
                Filtered by: {selectedDate === new Date().toISOString().split('T')[0] 
                  ? 'Today' 
                  : new Date(selectedDate).toLocaleDateString('en-IN')
                }
              </Text>
              <TouchableOpacity onPress={clearDateFilter}>
                <Ionicons name="close-circle" size={20} color="#dc3545" />
              </TouchableOpacity>
            </View>
          )}

          {/* Sort Status */}
          <View style={styles.sortStatus}>
            <Text style={styles.sortText}>
              Sorted by: {sortOrder.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </View>
          
          {filteredTransactions && filteredTransactions.length > 0 ? (
            <>
              {filteredTransactions
                .slice(0, showAllTransactions ? filteredTransactions.length : 10)
                .map((transaction, index) => (
                  <View key={`${transaction.source}-${index}`} style={styles.transactionItem}>
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
                      {transaction.paymentMethod && transaction.paymentMethod !== 'wallet' && (
                        <Text style={styles.paymentMethod}>
                          {transaction.paymentMethod.toUpperCase()}
                        </Text>
                      )}
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
                ))}
              
              {filteredTransactions.length > 10 && (
                <TouchableOpacity 
                  style={styles.showMoreButton} 
                  onPress={toggleShowAll}
                >
                  <Text style={styles.showMoreText}>
                    {showAllTransactions ? 'Show Less' : `Show All (${filteredTransactions.length})`}
                  </Text>
                  <Ionicons 
                    name={showAllTransactions ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                {selectedDate ? 'No transactions on this date' : 'No transactions yet'}
              </Text>
              <Text style={styles.emptyStateSubText}>
                {selectedDate 
                  ? 'Try selecting a different date' 
                  : 'Your transaction history will appear here'
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: '#007bff'
                }
              }}
              theme={{
                selectedDayBackgroundColor: '#007bff',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#007bff',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: '#00adf5',
                selectedDotColor: '#ffffff',
                arrowColor: '#007bff',
                monthTextColor: '#2d4150',
                indicatorColor: '#007bff',
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sortModal}>
            <View style={styles.sortHeader}>
              <Text style={styles.sortTitle}>Sort Transactions</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.sortOptionsList}>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortOption,
                    sortOrder === option.key && styles.sortOptionSelected
                  ]}
                  onPress={() => handleSortChange(option.key)}
                >
                  <View style={styles.sortOptionContent}>
                    <Ionicons 
                      name={option.icon} 
                      size={20} 
                      color={sortOrder === option.key ? '#007bff' : '#666'} 
                    />
                    <Text style={[
                      styles.sortOptionText,
                      sortOrder === option.key && styles.sortOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                  {sortOrder === option.key && (
                    <Ionicons name="checkmark" size={20} color="#007bff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    paddingBottom: 100 // Add extra padding to account for bottom navigation
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
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  sortButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  showAllButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  filterStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10
  },
  filterText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500'
  },
  sortStatus: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 15
  },
  sortText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center'
  },
  paymentMethod: {
    fontSize: 10,
    color: '#007bff',
    fontWeight: '600',
    marginTop: 2
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#007bff',
    borderRadius: 8,
    marginTop: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  showMoreText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginRight: 5
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10
  },
  calendarModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  sortModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    width: '90%',
    maxWidth: 400
  },
  sortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  sortTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  sortOptionsList: {
    gap: 8
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  sortOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007bff'
  },
  sortOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500'
  },
  sortOptionTextSelected: {
    color: '#007bff',
    fontWeight: '600'
  }
});

export default WalletScreen;
