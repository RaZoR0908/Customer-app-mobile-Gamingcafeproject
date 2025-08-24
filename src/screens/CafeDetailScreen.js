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
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// ⭐ Star Rating Component
const StarRating = ({ rating, onRate, size = 24 }) => (
  <View style={{ flexDirection: 'row' }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity key={star} onPress={() => onRate && onRate(star)}>
        <Feather 
          name="star"
          size={size}
          style={{ marginRight: 5 }}
          color={star <= rating ? '#ffc107' : '#e4e5e9'}
          fill={star <= rating ? '#ffc107' : 'transparent'}
        />
      </TouchableOpacity>
    ))}
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
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  if (error || !cafe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Cafe not found.'}</Text>
        <Text style={styles.errorText}>Cafe ID: {cafeId}</Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Swiper / Images */}
        <View style={{ height: 250 }}>
          <Swiper 
            style={styles.swiper} 
            autoplay 
            dotColor="#007bff"
            inactiveDotColor="#90A4AE"
            paginationStyle={{ bottom: 10 }}
          >
            {images.map((url, index) => (
              <TouchableOpacity 
                key={index}
                activeOpacity={0.9}
                onPress={() => {
                  setImageIndex(index);
                  setIsViewerOpen(true);
                }}
              >
                <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </Swiper>
        </View>
        
        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.name}>{cafe.name}</Text>
          <Text style={styles.address}>{cafe.address}</Text>
          <Text style={styles.hours}>Hours: {cafe.operatingHours?.monday?.open || '10:00'} - {cafe.operatingHours?.monday?.close || '22:00'}</Text>
          

          
          {cafe.contactNumber && (
            <Text style={styles.contactNumber}>📞 {cafe.contactNumber}</Text>
          )}
          {cafe.description && (
            <Text style={styles.description}>{cafe.description}</Text>
          )}
          
                     {/* Rooms */}
           <View style={styles.roomsContainer}>
             <Text style={styles.sectionTitle}>Available Systems</Text>
             {cafe.rooms && cafe.rooms.length > 0 ? cafe.rooms.map((room, index) => (
               <View key={index} style={styles.roomCard}>
                                   <Text style={styles.roomType}>{room.name}</Text>
                 
                 {room.systems && room.systems.length > 0 ? (
                   <View style={styles.systemsSummary}>
                     <Text style={styles.systemsSummaryText}>
                       {room.systems.map((system, sysIndex) => {
                         const count = room.systems.filter(s => s.type === system.type).length;
                         return `${system.type} (${count})`;
                       }).filter((item, index, arr) => arr.indexOf(item) === index).join(', ')}
                     </Text>
                     <Text style={styles.roomPrice}>
                       Starting from ₹{Math.min(...room.systems.map(s => s.pricePerHour))}/hour
                     </Text>
                   </View>
                 ) : (
                   <Text style={styles.noSystemsText}>No systems available in this room</Text>
                 )}
               </View>
             )) : (
               <Text style={styles.noRoomsText}>No rooms available</Text>
             )}
           </View>

          {/* Reviews */}
          <View style={styles.reviewsContainer}>
            <View style={styles.reviewSectionHeader}>
              <Text style={styles.sectionTitle}>Ratings & Reviews ({reviews.length})</Text>
              <Button title="Write a Review" onPress={() => setReviewModalVisible(true)} />
            </View>
            {displayedReviews.length > 0 ? (
              <>
                {displayedReviews.map(review => (
                  <View key={review._id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewAuthor}>{review.customerName}</Text>
                      <StarRating rating={review.rating} size={16} />
                    </View>
                    {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                    <Text style={styles.reviewDate}>{new Date(review.createdAt).toDateString()}</Text>
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
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <Text style={styles.noReviewsText}>No reviews yet. Be the first to write one!</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.bookButton} 
          onPress={() => navigation.navigate('Booking', { cafe })}
        >
          <Text style={styles.bookButtonText}>Book a Slot</Text>
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

      {/* Review Submission Modal */}
      <Modal
        animationType="slide"
        visible={isReviewModalVisible}
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <SafeAreaView style={{flex: 1}}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Rate Your Experience</Text>
            <View style={{alignItems: 'center'}}>
              <Text style={styles.modalLabel}>Your Rating</Text>
              <StarRating rating={myRating} onRate={setMyRating} size={40} />
            </View>
            <Text style={styles.modalLabel}>Your Comment (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={5}
              placeholder="Tell us what you liked or disliked..."
              value={myComment}
              onChangeText={handleCommentChange}
              maxLength={COMMENT_LIMIT}
            />
            <Text style={styles.characterCount}>
              {commentCharCount}/{COMMENT_LIMIT} characters
            </Text>
            <View style={styles.modalButtonContainer}>
              <Button title="Cancel" onPress={() => setReviewModalVisible(false)} color="gray" />
              <Button 
                title={isSubmitting ? "Submitting..." : "Submit Review"} 
                onPress={handleReviewSubmit} 
                disabled={isSubmitting} 
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* All Reviews Modal */}
      <Modal
        animationType="slide"
        visible={isAllReviewsModalVisible}
        onRequestClose={() => setAllReviewsModalVisible(false)}
      >
        <SafeAreaView style={{flex: 1}}>
          <View style={styles.allReviewsContainer}>
            <View style={styles.allReviewsHeader}>
              <Text style={styles.allReviewsTitle}>All Reviews ({reviews.length})</Text>
              <TouchableOpacity onPress={() => setAllReviewsModalVisible(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.allReviewsScroll} showsVerticalScrollIndicator>
              {reviews.map(review => (
                <View key={review._id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{review.customerName}</Text>
                    <StarRating rating={review.rating} size={16} />
                  </View>
                  {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                  <Text style={styles.reviewDate}>{new Date(review.createdAt).toDateString()}</Text>
                </View>
              ))}
            </ScrollView>
                     </View>
         </SafeAreaView>
       </Modal>
       
       
     </SafeAreaView>
   );
 };

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  swiper: {},
  image: { width: '100%', height: '100%' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  contentContainer: { padding: 20 },
  name: { fontSize: 26, fontWeight: 'bold', marginBottom: 5 },
  address: { fontSize: 16, color: '#666', marginBottom: 10 },
  hours: { fontSize: 14, color: '#666', marginBottom: 15, fontStyle: 'italic' },
     contactNumber: { fontSize: 16, color: '#007bff', marginBottom: 10, fontWeight: '500' },
   description: { fontSize: 14, color: '#333', marginBottom: 20, lineHeight: 20, fontStyle: 'italic' },
  roomsContainer: { marginBottom: 20 },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    paddingBottom: 5 
  },
     roomCard: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 15, marginBottom: 10 },
   roomType: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
   systemsSummary: { marginTop: 5 },
   systemsSummaryText: { fontSize: 14, color: '#333', marginBottom: 5 },
   roomPrice: { fontSize: 12, color: '#007bff', fontWeight: '600' },
  errorText: { color: 'red' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 30,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  bookButton: { backgroundColor: '#007bff', paddingVertical: 15, borderRadius: 8, alignItems: 'center' },
  bookButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Reviews
  reviewsContainer: { marginTop: 20 },
  reviewSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  reviewCard: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 15, marginVertical: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reviewAuthor: { fontSize: 16, fontWeight: 'bold' },
  reviewComment: { fontSize: 14, color: '#333', lineHeight: 20 },
  reviewDate: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 10 },
  noReviewsText: { textAlign: 'center', color: '#666', marginTop: 20, fontStyle: 'italic' },
  modalContainer: { flex: 1, padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalLabel: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 10, alignSelf: 'flex-start' },
  commentInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, height: 120, textAlignVertical: 'top', fontSize: 16 },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, width: '100%' },
  characterCount: { fontSize: 12, color: '#666', textAlign: 'right', marginTop: 5 },
  viewAllButton: { backgroundColor: '#f0f0f0', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  viewAllButtonText: { color: '#007bff', fontSize: 16, fontWeight: '600' },
     allReviewsContainer: { flex: 1, backgroundColor: '#fff' },
   allReviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
   allReviewsTitle: { fontSize: 20, fontWeight: 'bold' },
   closeButton: { padding: 5 },
   allReviewsScroll: { flex: 1, padding: 20 },
   noRoomsText: { textAlign: 'center', color: '#666', marginTop: 20, fontStyle: 'italic' },
   noSystemsText: { textAlign: 'center', color: '#666', marginTop: 10, fontStyle: 'italic' },
   

});

export default CafeDetailScreen;
