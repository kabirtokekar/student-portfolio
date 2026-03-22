import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

// CRITICAL: Disable auto-cancellation globally
pb.autoCancellation(false);

// Optional: Enable debug logging
pb.beforeSend = function (url, options) {
  console.log('PocketBase Request:', url);
  return { url, options };
};

export default pb;