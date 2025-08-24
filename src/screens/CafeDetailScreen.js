import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Button, 
  Image, 
  Dimensions, 
  Modal, 
  TouchableOpacity, 
  SafeAreaView, 
  TextInput, 
  Alert 
} from 'react-native';
import cafeService from '../services/cafeService';
import reviewService from '../services/reviewService';
import Swiper from 'react-native-swiper';
import ImageViewer from 'react-native-image-zoom-viewer';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// ⭐ Enhanced Star Rating Component
const StarRating = ({ rating, onRate, size = 24, readonly = false }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity 
        key={star} 
        onPress={() => !readonly && onRate && onRate(star)}
        disabled={readonly}
        style={{ marginRight: 2 }}
      >
        <Ionicons 
          name={star <= rating ? "star" : "star-outline"}
          size={size}
          color={star <= rating ? '#FFD700' : '#E0E0E0'}
        />
      </TouchableOpacity>
    ))}
    {readonly && (
      <Text style={{ marginLeft: 8, fontSize: 14, color: '#666', fontWeight: '500' }}>
        {rating.toFixed(1)}
      </Text>
    )}
  </View>
);

// 🏷️ Info Badge Component
const InfoBadge = ({ icon, text, color = '#007AFF' }) => (
  <View style={[styles.infoBadge, { borderColor: color }]}>
    <Ionicons name={icon} size={16} color={color} style={{ marginRight: 6 }} />
    <Text style={[styles.infoBadgeText, { color }]}>{text}</Text>
  </View>
);

const CafeDetailScreen = ({ route, navigation }) => {
  const { cafeId } = route.params;

  const [cafe, setCafe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review states
  const [reviews, setReviews] = useState([]);
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);
  const [isAllReviewsModalVisible, setAllReviewsModalVisible] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentCharCount, setCommentCharCount] = useState(0);

  const COMMENT_LIMIT = 500;
  const INITIAL_REVIEWS_SHOW = 3;

  // Image viewer
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  // ✅ Fetch data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const fetchAllData = async () => {
        setLoading(true);
        try {
          console.log('🔍 Fetching cafe details for ID:', cafeId);
          
          const cafePromise = cafeService.getCafeById(cafeId);
          const reviewsPromise = reviewService.getReviewsForCafe(cafeId);
          const [cafeResponse, reviewsResponse] = await Promise.all([
            cafePromise, 
            reviewsPromise
          ]);
          
          console.log('✅ Cafe data received:', cafeResponse.data);
          console.log('✅ Reviews data received:', reviewsResponse.data);
          
          // Debug: Check contact number and description
          console.log('📞 Contact Number:', cafeResponse.data.contactNumber);
          console.log('📝 Description:', cafeResponse.data.description);
          console.log('🔍 Contact Number exists:', !!cafeResponse.data.contactNumber);
          console.log('🔍 Description exists:', !!cafeResponse.data.description);
          
          // Debug: Check the structure of rooms and systems
          if (cafeResponse.data.rooms) {
            console.log('🏠 Rooms structure:');
            cafeResponse.data.rooms.forEach((room, roomIndex) => {
              console.log(`   Room ${roomIndex}:`, room.name);
              if (room.systems) {
                room.systems.forEach((system, sysIndex) => {
                  console.log(`     System ${sysIndex}:`, {
                    type: system.type,
                    specs: system.specs,
                    specsType: typeof system.specs
                  });
                });
              }
            });
          }
          
          setCafe(cafeResponse.data);
          setReviews(reviewsResponse.data);
        } catch (err) {
          console.error('❌ Error fetching cafe details:', err);
          setError(`Failed to load cafe details and reviews: ${err.message}`);
        } finally {
          setLoading(false);
        }
      };

      fetchAllData();
    }, [cafeId])
  );

  const handleCommentChange = (text) => {
    if (text.length <= COMMENT_LIMIT) {
      setMyComment(text);
      setCommentCharCount(text.length);
    }
  };

  const displayedReviews = reviews.slice(0, INITIAL_REVIEWS_SHOW);

  const handleReviewSubmit = async () => {
    if (myRating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewService.createReview(cafeId, { rating: myRating, comment: myComment });
      setReviewModalVisible(false);
      setMyRating(0);
      setMyComment('');
      setCommentCharCount(0);

      // Optimistic UI update
      const newReview = { 
        _id: Date.now().toString(), 
        customerName: 'You', 
        rating: myRating, 
        comment: myComment, 
        createdAt: new Date().toISOString() 
      };
      setReviews([newReview, ...reviews]);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit review.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading cafe details...</Text>
      </View>
    );
  }

  if (error || !cafe) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorText}>{error || 'Cafe not found.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Debug: Check current cafe state values
  console.log('🎯 Current cafe state - Contact Number:', cafe.contactNumber);
  console.log('🎯 Current cafe state - Description:', cafe.description);
  console.log('🎯 Current cafe state - Contact Number exists:', !!cafe.contactNumber);
  console.log('🎯 Current cafe state - Description exists:', !!cafe.description);
  
  const images = cafe.images && cafe.images.length > 0
    ? cafe.images
    : [
        'https://placehold.co/600x400/2a2a2a/ffffff?text=Interior',
        'https://placehold.co/600x400/007bff/ffffff?text=Gaming+Setup',
        'https://placehold.co/600x400/28a745/ffffff?text=Community',
      ];
  
  const viewerImages = images.map(url => ({ url }));

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Enhanced Image Swiper */}
        <View style={styles.imageContainer}>
          <Swiper 
            style={styles.swiper} 
            autoplay 
            autoplayTimeout={4}
            dotColor="#007AFF"
            inactiveDotColor="rgba(255,255,255,0.5)"
            paginationStyle={styles.paginationStyle}
            dotStyle={styles.dotStyle}
            activeDotStyle={styles.activeDotStyle}
          >
            {images.map((url, index) => (
              <TouchableOpacity 
                key={index}
                activeOpacity={0.9}
                onPress={() => {
                  setImageIndex(index);
                  setIsViewerOpen(true);
                }}
                style={styles.imageWrapper}
              >
                <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageCounter}>{index + 1} / {images.length}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Swiper>
        </View>
        
        {/* Content Container */}
        <View style={styles.contentContainer}>
          
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.cafeName}>{cafe.name}</Text>
            <View style={styles.ratingContainer}>
              <StarRating rating={averageRating} readonly={true} size={20} />
              <Text style={styles.reviewCount}>({reviews.length} reviews)</Text>
            </View>
          </View>

          {/* Info Badges */}
          <View style={styles.badgesContainer}>
            <InfoBadge 
              icon="location-outline" 
              text={cafe.address} 
              color="#34C759"
            />
            <InfoBadge 
              icon="time-outline" 
              text={`${cafe.operatingHours?.monday?.open || '10:00'} - ${cafe.operatingHours?.monday?.close || '22:00'}`}
              color="#FF9500"
            />
            {cafe.contactNumber && (
              <InfoBadge 
                icon="call-outline" 
                text={cafe.contactNumber}
                color="#007AFF"
              />
            )}
          </View>

          {/* Description */}
          {cafe.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>About this cafe</Text>
              <Text style={styles.descriptionText}>{cafe.description}</Text>
            </View>
          )}
          
          {/* Systems Section */}
          <View style={styles.systemsContainer}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="games" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Available Gaming Systems</Text>
            </View>
            
            {cafe.rooms && cafe.rooms.length > 0 ? (
              cafe.rooms.map((room, index) => (
                <View key={index} style={styles.roomCard}>
                  <View style={styles.roomHeader}>
                    <View style={styles.roomIconContainer}>
                      <MaterialIcons name="meeting-room" size={20} color="#007AFF" />
                    </View>
                    <Text style={styles.roomName}>{room.name}</Text>
                  </View>
                  
                  {room.systems && room.systems.length > 0 ? (
                    <View style={styles.systemsInfo}>
                      <Text style={styles.systemsSummary}>
                        {room.systems.map((system, sysIndex) => {
                          const count = room.systems.filter(s => s.type === system.type).length;
                          return `${system.type} (${count})`;
                        }).filter((item, index, arr) => arr.indexOf(item) === index).join(', ')}
                      </Text>
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Starting from</Text>
                        <Text style={styles.priceAmount}>
                          ₹{Math.min(...room.systems.map(s => s.pricePerHour))}
                        </Text>
                        <Text style={styles.priceUnit}>/hour</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.noSystemsText}>No systems available in this room</Text>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.noRoomsContainer}>
                <MaterialIcons name="info-outline" size={48} color="#999" />
                <Text style={styles.noRoomsText}>No rooms available at the moment</Text>
              </View>
            )}
          </View>

          {/* Reviews Section */}
          <View style={styles.reviewsContainer}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="star" size={24} color="#FFD700" />
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              <TouchableOpacity 
                style={styles.writeReviewButton}
                onPress={() => setReviewModalVisible(true)}
              >
                <Text style={styles.writeReviewButtonText}>Write Review</Text>
              </TouchableOpacity>
            </View>
            
            {displayedReviews.length > 0 ? (
              <>
                {displayedReviews.map(review => (
                  <View key={review._id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAuthorContainer}>
                        <View style={styles.authorAvatar}>
                          <Text style={styles.authorInitial}>
                            {review.customerName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.reviewAuthor}>{review.customerName}</Text>
                          <Text style={styles.reviewDate}>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <StarRating rating={review.rating} readonly={true} size={16} />
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                  </View>
                ))}
                
                {reviews.length > INITIAL_REVIEWS_SHOW && (
                  <TouchableOpacity 
                    style={styles.viewAllButton} 
                    onPress={() => setAllReviewsModalVisible(true)}
                  >
                    <Text style={styles.viewAllButtonText}>
                      View All {reviews.length} Reviews
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.noReviewsContainer}>
                <MaterialIcons name="chat-bubble-outline" size={48} color="#999" />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
                <Text style={styles.noReviewsSubtext}>Be the first to share your experience!</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Enhanced Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.bookButton} 
          onPress={() => navigation.navigate('Booking', { cafe })}
        >
          <Ionicons name="calendar-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.bookButtonText}>Book a Gaming Slot</Text>
        </TouchableOpacity>
      </View>

      {/* Image Viewer Modal */}
      <Modal visible={isViewerOpen} transparent onRequestClose={() => setIsViewerOpen(false)}>
        <ImageViewer 
          imageUrls={viewerImages} 
          index={imageIndex}
          onCancel={() => setIsViewerOpen(false)}
          enableSwipeDown
          renderIndicator={() => null}
        />
      </Modal>

      {/* Enhanced Review Submission Modal */}
      <Modal
        animationType="slide"
        visible={isReviewModalVisible}
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setReviewModalVisible(false)}
              style={styles.closeModalButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Rate Your Experience</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.modalContainer}>
            <View style={styles.ratingSection}>
              <Text style={styles.modalLabel}>How would you rate this cafe?</Text>
              <StarRating rating={myRating} onRate={setMyRating} size={48} />
            </View>
            
            <View style={styles.commentSection}>
              <Text style={styles.modalLabel}>Share your thoughts (optional)</Text>
              <TextInput
                style={styles.commentInput}
                multiline
                numberOfLines={5}
                placeholder="Tell us what you liked or disliked about your gaming experience..."
                value={myComment}
                onChangeText={handleCommentChange}
                maxLength={COMMENT_LIMIT}
              />
              <Text style={styles.characterCount}>
                {commentCharCount}/{COMMENT_LIMIT} characters
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.submitButton, 
                myRating === 0 && styles.submitButtonDisabled
              ]}
              onPress={handleReviewSubmit}
              disabled={myRating === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Enhanced All Reviews Modal */}
      <Modal
        animationType="slide"
        visible={isAllReviewsModalVisible}
        onRequestClose={() => setAllReviewsModalVisible(false)}
      >
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          <View style={styles.allReviewsHeader}>
            <TouchableOpacity 
              onPress={() => setAllReviewsModalVisible(false)}
              style={styles.closeModalButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.allReviewsTitle}>All Reviews ({reviews.length})</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.allReviewsScroll} showsVerticalScrollIndicator={false}>
            {reviews.map(review => (
              <View key={review._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAuthorContainer}>
                    <View style={styles.authorAvatar}>
                      <Text style={styles.authorInitial}>
                        {review.customerName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.reviewAuthor}>{review.customerName}</Text>
                      <Text style={styles.reviewDate}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <StarRating rating={review.rating} readonly={true} size={16} />
                </View>
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  
  // Loading & Error States
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  errorText: { 
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },

  // Container & Layout
  container: { 
    flex: 1 
  },
  contentContainer: { 
    padding: 20,
    paddingBottom: 140
  },
  
  // Image Section
  imageContainer: { 
    height: 280,
    backgroundColor: '#000'
  },
  swiper: {},
  imageWrapper: {
    flex: 1,
    position: 'relative'
  },
  image: { 
    width: '100%', 
    height: '100%' 
  },
  imageOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  imageCounter: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  paginationStyle: { 
    bottom: 20 
  },
  dotStyle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4
  },
  activeDotStyle: {
    width: 24,
    height: 8,
    borderRadius: 4
  },

  // Header Section
  headerSection: {
    marginBottom: 20
  },
  cafeName: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 34
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  reviewCount: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },

  // Info Badges
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
    paddingHorizontal: 4
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '100%',
    flexShrink: 1,
    minWidth: 0
  },
  infoBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
    flexWrap: 'wrap',
    numberOfLines: 2
  },

  // Description
  descriptionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },

  // Systems Section
  systemsContainer: { 
    marginBottom: 24 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16,
    justifyContent: 'space-between'
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1a1a1a',
    marginLeft: 8,
    flex: 1
  },
  writeReviewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  writeReviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },

  // Room Cards
  roomCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  roomIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  roomName: { 
    fontSize: 18, 
    fontWeight: '600',
    color: '#1a1a1a'
  },
  systemsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  systemsSummary: { 
    fontSize: 14, 
    color: '#666',
    flex: 1,
    marginRight: 16
  },
  priceContainer: {
    alignItems: 'flex-end'
  },
  priceLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2
  },
  priceAmount: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold'
  },
  priceUnit: {
    fontSize: 12,
    color: '#999'
  },
  noSystemsText: { 
    textAlign: 'center', 
    color: '#999', 
    fontStyle: 'italic',
    marginTop: 8
  },
  noRoomsContainer: {
    alignItems: 'center',
    padding: 40
  },
  noRoomsText: { 
    textAlign: 'center', 
    color: '#999', 
    marginTop: 16,
    fontSize: 16
  },

  // Reviews Section
  reviewsContainer: { 
    marginTop: 8 
  },
  reviewCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  reviewHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12 
  },
  reviewAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  authorInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  reviewAuthor: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2
  },
  reviewDate: { 
    fontSize: 12, 
    color: '#999'
  },
  reviewComment: { 
    fontSize: 14, 
    color: '#666', 
    lineHeight: 20 
  },
  noReviewsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16
  },
  noReviewsText: { 
    textAlign: 'center', 
    color: '#666', 
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500'
  },
  noReviewsSubtext: {
    textAlign: 'center',
    color: '#999',
    marginTop: 4,
    fontSize: 14
  },
  viewAllButton: { 
    backgroundColor: '#f0f8ff', 
    paddingVertical: 16, 
    paddingHorizontal: 24, 
    borderRadius: 12, 
    marginTop: 8, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  viewAllButtonText: { 
    color: '#007AFF', 
    fontSize: 16, 
    fontWeight: '600',
    marginRight: 4
  },

  // Footer
  footer: {
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0,
    padding: 20, 
    paddingBottom: 40,
    backgroundColor: '#fff',
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8
  },
  bookButton: { 
    backgroundColor: '#007AFF', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  bookButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },

  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  closeModalButton: {
    padding: 4
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#1a1a1a'
  },
  modalContainer: { 
    flex: 1, 
    padding: 20 
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32
  },
  commentSection: {
    marginBottom: 32
  },
  modalLabel: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 16, 
    color: '#1a1a1a',
    textAlign: 'center'
  },
  commentInput: { 
    borderWidth: 1, 
    borderColor: '#e0e0e0', 
    borderRadius: 12, 
    padding: 16, 
    height: 120, 
    textAlignVertical: 'top', 
    fontSize: 16,
    backgroundColor: '#f8f9fa'
  },
  characterCount: { 
    fontSize: 12, 
    color: '#999', 
    textAlign: 'right', 
    marginTop: 8 
  },
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },

  // All Reviews Modal
  allReviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  allReviewsTitle: { 
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#1a1a1a'
  },
  allReviewsScroll: { 
    flex: 1, 
    padding: 20 
  }
});

export default CafeDetailScreen;
