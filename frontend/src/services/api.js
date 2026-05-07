import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Analyze inspiration image
 * @param {File} imageFile - The inspiration image file
 * @param {string|null} jobId - Optional existing job ID
 * @returns {Promise<Object>} Response with job_id, style, furniture, palette
 */
export async function analyzeInspiration(imageFile, jobId = null) {
  const formData = new FormData();
  formData.append('image', imageFile);
  const url = jobId
    ? `${API_URL}/api/analyze-inspiration?job_id=${jobId}`
    : `${API_URL}/api/analyze-inspiration`;
  const response = await axios.post(url, formData);
  return response.data;
}

/**
 * Upload room photos
 * @param {FileList} photos - Array of photo files
 * @param {string|null} jobId - Optional existing job ID to reuse
 * @returns {Promise<Object>} Response with job_id and photo_count
 */
export async function uploadRoomPhotos(photos, jobId = null) {
  const formData = new FormData();
  for (let i = 0; i < photos.length; i++) {
    formData.append('photos', photos[i]);
  }
  const url = jobId
    ? `${API_URL}/api/upload-room-photos?job_id=${jobId}`
    : `${API_URL}/api/upload-room-photos`;
  const response = await axios.post(url, formData);
  return response.data;
}

/**
 * Start reconstruction job
 * @param {string} jobId - The job ID
 * @param {string} stylePrompt - Optional style prompt
 * @param {string} globalLighting - Optional lighting prompt
 * @returns {Promise<Object>} Response with status and message
 */
export async function startReconstruction(jobId, stylePrompt = "", globalLighting = "cinematic lighting, soft shadows") {
  const response = await axios.post(`${API_URL}/api/reconstruct`, {
    job_id: jobId,
    style_prompt: stylePrompt,
    global_lighting: globalLighting,
  });
  return response.data;
}

/**
 * Get job status
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} Response with status, stage, progress
 */
export async function getJobStatus(jobId) {
  const response = await axios.get(`${API_URL}/api/job/${jobId}`);
  return response.data;
}

/**
 * Get result data
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} Response with style, furniture, palette, layout, model_url
 */
export async function getResult(jobId) {
  const response = await axios.get(`${API_URL}/api/result/${jobId}`);
  const data = response.data;

  let modelUrl = data.model_url;
  if (modelUrl && modelUrl.startsWith('/')) {
    modelUrl = `${API_URL}${modelUrl}`;
  }

  return {
    style:      data.style,
    furniture:  data.furniture,
    palette:    data.palette,
    confidence: data.confidence,
    modelUrl:   modelUrl,
    layout:     data.layout,
  };
}

/**
 * Get PLY file (binary)
 * @param {string} jobId - The job ID
 * @returns {Promise<ArrayBuffer>} PLY file binary data
 */
export async function getSplat(jobId) {
  const response = await axios.get(`${API_URL}/api/splat/${jobId}`, {
    responseType: 'arraybuffer',
  });
  return response.data;
}

/**
 * Get user job history
 * @returns {Promise<Array>} Array of past job objects
 */
export async function getHistory() {
  const response = await axios.get(`${API_URL}/api/history`);
  return response.data;
}
