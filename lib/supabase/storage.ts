import { createServiceClient } from './server';
import { logServerMessage, logServerError } from '@/lib/sentry';

const BUCKET_NAME = 'lesson-generated-images';

/**
 * Ensure the storage bucket exists and is configured correctly
 * This should be called once during setup
 */
export async function ensureBucketExists(): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      logServerError(listError as Error, { operation: 'list_buckets' });
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { data, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      });
      
      if (createError) {
        logServerError(createError as Error, { operation: 'create_bucket' });
        logServerMessage('Failed to create bucket. Please create it manually in Supabase Dashboard', 'error', {
          bucketName: BUCKET_NAME,
          error: createError.message
        });
        return false;
      }
      
      logServerMessage('Storage bucket created successfully', 'info', { bucketName: BUCKET_NAME });
    } else {
      logServerMessage('Storage bucket already exists', 'info', { bucketName: BUCKET_NAME });
    }
    
    return true;
  } catch (error) {
    logServerError(error as Error, { operation: 'ensure_bucket_exists' });
    return false;
  }
}

/**
 * Upload a base64 encoded image to Supabase Storage
 * @param base64Data Base64 encoded image data
 * @param lessonId The lesson ID this image belongs to
 * @param index The index of the image (for multiple images)
 * @returns The public URL of the uploaded image, or null if upload fails
 */
export async function uploadImageToStorage(
  base64Data: string,
  lessonId: string,
  index: number
): Promise<string | null> {
  try {
    logServerMessage('Uploading image to storage', 'info', { lessonId, index });
    
    const supabase = createServiceClient();
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${lessonId}/${timestamp}-image-${index}.png`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      logServerError(error as Error, { 
        operation: 'upload_image', 
        lessonId, 
        index,
        fileName 
      });
      
      // If bucket doesn't exist, try to create it
      if (error.message.includes('Bucket not found')) {
        logServerMessage('Bucket not found, attempting to create', 'warning');
        const bucketCreated = await ensureBucketExists();
        
        if (bucketCreated) {
          // Retry upload after creating bucket
          return uploadImageToStorage(base64Data, lessonId, index);
        }
      }
      
      return null;
    }
    
    // Get public URL
    const publicUrl = getPublicImageUrl(fileName);
    
    logServerMessage('Image uploaded successfully', 'info', { 
      lessonId, 
      index, 
      fileName,
      url: publicUrl
    });
    
    return publicUrl;
  } catch (error) {
    logServerError(error as Error, { 
      operation: 'upload_image_to_storage', 
      lessonId, 
      index 
    });
    return null;
  }
}

/**
 * Get the public URL for an image in storage
 * @param path The path to the image in storage
 * @returns The public URL
 */
export function getPublicImageUrl(path: string): string {
  const supabase = createServiceClient();
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * Delete an image from storage
 * @param path The path to the image in storage
 * @returns True if successful, false otherwise
 */
export async function deleteImageFromStorage(path: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);
    
    if (error) {
      logServerError(error as Error, { operation: 'delete_image', path });
      return false;
    }
    
    logServerMessage('Image deleted successfully', 'info', { path });
    return true;
  } catch (error) {
    logServerError(error as Error, { operation: 'delete_image_from_storage', path });
    return false;
  }
}

/**
 * Upload multiple images in parallel
 * @param images Array of base64 image data with metadata
 * @param lessonId The lesson ID these images belong to
 * @returns Array of public URLs (null for failed uploads)
 */
export async function uploadImagesInParallel(
  images: { base64Data: string; index: number }[],
  lessonId: string
): Promise<(string | null)[]> {
  try {
    logServerMessage('Uploading multiple images in parallel', 'info', { 
      lessonId, 
      count: images.length 
    });
    
    const uploadPromises = images.map(({ base64Data, index }) =>
      uploadImageToStorage(base64Data, lessonId, index)
    );
    
    const results = await Promise.all(uploadPromises);
    
    const successCount = results.filter(url => url !== null).length;
    logServerMessage('Parallel image upload complete', 'info', {
      lessonId,
      total: images.length,
      successful: successCount,
      failed: images.length - successCount
    });
    
    return results;
  } catch (error) {
    logServerError(error as Error, { 
      operation: 'upload_images_parallel', 
      lessonId 
    });
    return images.map(() => null);
  }
}

/**
 * Delete all images for a lesson
 * @param lessonId The lesson ID
 * @returns True if successful, false otherwise
 */
export async function deleteAllLessonImages(lessonId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    
    // List all files in the lesson folder
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(lessonId);
    
    if (listError || !files || files.length === 0) {
      return true; // No files to delete or already deleted
    }
    
    // Delete all files
    const filePaths = files.map(file => `${lessonId}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);
    
    if (deleteError) {
      logServerError(deleteError as Error, { operation: 'delete_all_images', lessonId });
      return false;
    }
    
    logServerMessage('All lesson images deleted', 'info', { lessonId, count: files.length });
    return true;
  } catch (error) {
    logServerError(error as Error, { operation: 'delete_all_lesson_images', lessonId });
    return false;
  }
}

