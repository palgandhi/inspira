import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Check if the backend is available
 */
export async function isBackendAvailable() {
  try {
    const response = await axios.get(`${API_URL}/api/health`, { timeout: 2000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Analyze inspiration image
 * @param {File} imageFile - The inspiration image file
 * @returns {Promise<Object>} Response with job_id, style, furniture, palette
 */
export async function analyzeInspiration(imageFile) {
  const available = await isBackendAvailable();
  if (available) {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await axios.post(`${API_URL}/api/analyze-inspiration`, formData);
    return response.data;
  } else {
    // Mock response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          job_id: 'mock-123',
          status: 'processing',
          // The analyze endpoint returns style, furniture, palette directly? According to spec:
          // POST /api/analyze-inspiration → { job_id, style, furniture[], palette[] }
          // But the mock described earlier: { job_id: "mock-123", status: "processing" }
          // We'll follow the spec for the endpoint.
          style: 'Modern Minimalist',
          furniture: ["Sofa", "Coffee Table", "Floor Lamp", "Wardrobe"],
          palette: ["#4a5568", "#e8e0d5", "#c4a882", "#2d1f14"]
        });
      }, 2000);
    });
  }
}

/**
 * Upload room photos
 * @param {FileList} photos - Array of photo files
 * @returns {Promise<Object>} Response with job_id and photo_count
 */
export async function uploadRoomPhotos(photos) {
  const available = await isBackendAvailable();
  if (available) {
    const formData = new FormData();
    for (let i = 0; i < photos.length; i++) {
      formData.append('photos[]', photos[i]);
    }
    const response = await axios.post(`${API_URL}/api/upload-room-photos`, formData);
    return response.data;
  } else {
    // Mock response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          job_id: 'mock-123',
          photo_count: photos.length
        });
      }, 2000);
    });
  }
}

const mockJobs = {};

/**
 * Get job status
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} Response with status, stage, progress
 */
export async function getJobStatus(jobId) {
  const available = await isBackendAvailable();
  if (available) {
    const response = await axios.get(`${API_URL}/api/job/${jobId}`);
    return response.data;
  } else {
    // Mock response: simulate progress over 8 seconds
    return new Promise((resolve) => {
      if (!mockJobs[jobId]) {
        mockJobs[jobId] = Date.now();
      }
      
      const elapsed = Date.now() - mockJobs[jobId];
      const totalTime = 8000;
      
      if (elapsed >= totalTime) {
        resolve({ status: 'complete', stage: 5, progress: 100 });
        return;
      }
      
      const stageDuration = totalTime / 5; // 1600ms per stage
      const currentStage = Math.floor(elapsed / stageDuration) + 1; // 1 to 5
      const timeInStage = elapsed % stageDuration;
      const progress = Math.floor((timeInStage / stageDuration) * 100);
      
      resolve({
        status: 'processing',
        stage: Math.min(currentStage, 5),
        progress: Math.min(progress, 100)
      });
    });
  }
}

/**
 * Get result data
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} Response with style, furniture, palette, layout
 */
export async function getResult(jobId) {
  try {
    const res = await fetch(`${API_URL}/api/result/${jobId}`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    // Fallback mock data
    return {
      style: 'Modern Minimalist',
      furniture: ['Sofa', 'Coffee Table', 'Floor Lamp', 'Wardrobe'],
      palette: ['#4a5568', '#e8e0d5', '#c4a882', '#2d1f14'],
      confidence: 0.87
    };
  }
}

/**
 * Get PLY file (binary)
 * @param {string} jobId - The job ID
 * @returns {Promise<ArrayBuffer>} PLY file binary data
 */
export async function getSplat(jobId) {
  const available = await isBackendAvailable();
  if (available) {
    const response = await axios.get(`${API_URL}/api/splat/${jobId}`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  } else {
    // For mock, we'll load the local PLY file from public folder
    // Since we cannot fetch local file via axios in mock, we'll handle this in the component.
    // Return null to indicate fallback.
    return null;
  }
}

/**
 * Get user job history
 * @returns {Promise<Array>} Array of past job objects
 */
export async function getHistory() {
  const available = await isBackendAvailable();
  if (available) {
    const response = await axios.get(`${API_URL}/api/history`);
    return response.data;
  } else {
    // Mock response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            job_id: 'mock-123',
            date: new Date(Date.now() - 86400000 * 2).toISOString(),
            style: 'Modern Minimalist',
            status: 'complete',
            thumbnail: '/outputs/reconstructions/thumb1.jpg' // Placeholder
          },
          {
            job_id: 'mock-124',
            date: new Date(Date.now() - 86400000 * 5).toISOString(),
            style: 'Mid-Century Modern',
            status: 'complete',
            thumbnail: '/outputs/reconstructions/thumb2.jpg'
          },
          {
            job_id: 'mock-125',
            date: new Date().toISOString(),
            style: 'Industrial Loft',
            status: 'processing',
            thumbnail: null
          }
        ]);
      }, 800);
    });
  }
}