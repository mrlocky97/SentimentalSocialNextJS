/**
 * Quick test to verify WebSocket implementation
 * Run with: npm run dev
 */

import { io, Socket } from 'socket.io-client';

// Test WebSocket connection
async function testWebSocketConnection() {
  console.log('🔌 Testing WebSocket connection...');
  
  const socket: Socket = io('http://localhost:3001', {
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected successfully!');
    console.log('Socket ID:', socket.id);
    
    // Test joining a campaign room
    socket.emit('join-campaign', 'test-campaign-123');
  });

  socket.on('joined-campaign', (data: any) => {
    console.log('✅ Joined campaign room:', data);
  });

  socket.on('scraping-progress', (progress: any) => {
    console.log('📊 Progress update:', progress);
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
  });

  socket.on('error', (error: any) => {
    console.error('❌ WebSocket error:', error);
  });

  // Disconnect after 5 seconds
  setTimeout(() => {
    console.log('🔌 Disconnecting WebSocket...');
    socket.disconnect();
  }, 5000);
}

// Test async scraping endpoint
async function testAsyncScraping() {
  console.log('🚀 Testing async scraping endpoint...');
  
  try {
    const response = await fetch('http://localhost:3001/api/v1/scraping/hashtag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hashtag: 'test',
        campaignId: 'test-campaign-123',
        maxTweets: 100 // Should trigger async mode
      })
    });

    const data = await response.json();
    console.log('✅ Async scraping response:', data);

    if (data.progress?.useWebSocket) {
      console.log('✅ WebSocket mode detected correctly!');
    }
  } catch (error) {
    console.error('❌ Async scraping test failed:', error);
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting WebSocket Implementation Tests');
  console.log('=' .repeat(50));
  
  // First test WebSocket connection
  await testWebSocketConnection();
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Then test async endpoint
  await testAsyncScraping();
  
  console.log('=' .repeat(50));
  console.log('🏁 Tests completed');
}

// Export for potential use
export { testAsyncScraping, testWebSocketConnection };

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}