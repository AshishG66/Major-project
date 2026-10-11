/**
 * HridayaDarpana Clinical Report Download & Preview Service
 * 
 * Provides authenticated, patient-isolated PDF report downloads
 * with meaningful file naming, progress state management, and error handling.
 */

import { API_BASE_URL } from './api';
import { useAuthStore } from '../store/authStore';

export interface DownloadReportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

/**
 * Downloads a patient-specific cardiovascular report PDF.
 * If predictionId is omitted or 'latest', the authenticated patient's latest scan is downloaded.
 */
export async function downloadReportPdf(predictionId?: string): Promise<DownloadReportResult> {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Authentication required. Please log in to download clinical reports.');
  }

  const endpoint = `${API_BASE_URL}/prediction/report/${predictionId || 'latest'}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No Risk Scan record found. Please complete a Risk Scan to generate your clinical report.');
      }
      if (response.status === 401) {
        throw new Error('Session expired or unauthenticated. Please log in again.');
      }
      let errMessage = 'Unable to generate the report. Please try again.';
      try {
        const errorJson = await response.json();
        if (errorJson?.message) errMessage = errorJson.message;
      } catch {}
      throw new Error(errMessage);
    }

    // Determine filename from Content-Disposition header
    let filename = `HridayaDarpana_Cardiovascular_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    const disposition = response.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
      const matches = disposition.match(/filename="?([^";]+)"?/i);
      if (matches && matches[1]) {
        filename = matches[1].trim();
      }
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Received an empty report. Please run another Risk Scan or try again.');
    }

    // Trigger browser download via object URL
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 200);

    return { success: true, filename };
  } catch (err: any) {
    console.error('[ReportDownloadService] Error:', err);
    throw err;
  }
}

/**
 * Returns a direct URL with query token for opening report in new tab or external viewer.
 */
export function getReportViewerUrl(predictionId?: string): string {
  const token = useAuthStore.getState().token;
  const base = `${API_BASE_URL}/prediction/report/${predictionId || 'latest'}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}
