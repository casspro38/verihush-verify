import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import qrGenerator from 'qrcode-generator';
import { supabase } from './supabase';

const VERIFY_URL = 'https://verify.verihush.com';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + 'm ' + s + 's';
}

function formatFileSize(bytes) {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function generateQRSvg(text, size) {
  try {
    const qr = qrGenerator(0, 'M');
    qr.addData(text);
    qr.make();
    const modules = qr.getModuleCount();
    const cellSize = size / modules;
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">';
    svg += '<rect width="' + size + '" height="' + size + '" fill="white"/>';
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        if (qr.isDark(row, col)) {
          svg += '<rect x="' + (col * cellSize) + '" y="' + (row * cellSize) + '" width="' + cellSize + '" height="' + cellSize + '" fill="#071325"/>';
        }
      }
    }
    svg += '</svg>';
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    return 'data:image/svg+xml;base64,' + base64;
  } catch (err) {
    console.log('QR SVG error:', err);
    return null;
  }
}

export async function generateBasicPDF(evidenceItems, userEmail) {
  const now = new Date();
  const reportId = 'VH-' + now.getFullYear() + ('0'+(now.getMonth()+1)).slice(-2) + ('0'+now.getDate()).slice(-2) + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const evidenceIds = evidenceItems.map(e => e.id);
  const { data: hashLogs } = await supabase
    .from('hash_log')
    .select('*')
    .in('evidence_id', evidenceIds)
    .order('timestamp', { ascending: true });

  const totalDuration = evidenceItems.reduce((sum, e) => sum + (e.duration || 0), 0);
  const totalSize = evidenceItems.reduce((sum, e) => sum + (e.file_size || 0), 0);
  const audioCount = evidenceItems.filter(e => e.type === 'audio').length;
  const photoCount = evidenceItems.filter(e => e.type === 'photo').length;
  const noteCount = evidenceItems.filter(e => e.type === 'note').length;

  const dateRange = evidenceItems.length > 0
    ? formatDate(evidenceItems[evidenceItems.length - 1].created_at) + ' ~ ' + formatDate(evidenceItems[0].created_at)
    : 'N/A';

  const qrResults = evidenceItems.map((item) => {
    const hash = hashLogs ? hashLogs.find(h => h.evidence_id === item.id) : null;
    const hashValue = item.sha256_hash || (hash ? hash.hash_value : null);
    if (hashValue) {
      const qrUrl = VERIFY_URL + '/?hash=' + hashValue;
      const qrSvg = generateQRSvg(qrUrl, 80);
      return { id: item.id, hash: hashValue, qrSvg, qrUrl };
    }
    return { id: item.id, hash: null, qrSvg: null, qrUrl: null };
  });

  const mainHash = qrResults.find(q => q.hash)?.hash;
  const mainQR = mainHash ? generateQRSvg(VERIFY_URL + '/?hash=' + mainHash, 160) : null;

  let evidenceListHTML = '';
  evidenceItems.forEach((item, index) => {
    const hash = hashLogs ? hashLogs.find(h => h.evidence_id === item.id) : null;
    const qr = qrResults.find(q => q.id === item.id);

    evidenceListHTML += '<div style="border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:12px;background:#F9FAFB;">';
    evidenceListHTML += '<div style="display:flex;justify-content:space-between;align-items:flex-start;">';
    evidenceListHTML += '<div style="flex:1;">';
    evidenceListHTML += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
    evidenceListHTML += '<span style="font-weight:700;color:#071325;">#' + (index + 1) + ' ' + (item.title || 'Untitled') + '</span>';
    evidenceListHTML += '<span style="background:' + (item.type === 'audio' ? '#4D8EFF' : item.type === 'photo' ? '#10B981' : '#F59E0B') + ';color:white;padding:2px 8px;border-radius:4px;font-size:11px;">' + (item.type || 'unknown').toUpperCase() + '</span>';
    evidenceListHTML += '</div>';
    evidenceListHTML += '<table style="width:100%;font-size:12px;color:#6B7280;">';
    evidenceListHTML += '<tr><td style="padding:2px 0;width:130px;">Date Created</td><td>' + formatDate(item.created_at) + '</td></tr>';
    if (item.duration) {
      evidenceListHTML += '<tr><td style="padding:2px 0;">Duration</td><td>' + formatDuration(item.duration) + '</td></tr>';
    }
    if (item.file_size) {
      evidenceListHTML += '<tr><td style="padding:2px 0;">File Size</td><td>' + formatFileSize(item.file_size) + '</td></tr>';
    }
    if (item.city) {
      evidenceListHTML += '<tr><td style="padding:2px 0;">Location</td><td>' + item.city + (item.latitude ? ' (' + item.latitude.toFixed(4) + ', ' + item.longitude.toFixed(4) + ')' : '') + '</td></tr>';
    }
    if (item.consent_type) {
      evidenceListHTML += '<tr><td style="padding:2px 0;">Consent Law</td><td>' + item.consent_type + '</td></tr>';
    }
    const hashValue = item.sha256_hash || (hash ? hash.hash_value : null);
    if (hashValue) {
      evidenceListHTML += '<tr><td style="padding:2px 0;">SHA-256</td><td style="font-family:monospace;font-size:10px;word-break:break-all;">' + hashValue + '</td></tr>';
    }
    if (hash && hash.hash_type) {
      evidenceListHTML += '<tr><td style="padding:2px 0;">Hash Algorithm</td><td>' + hash.hash_type + '</td></tr>';
    }
    if (hash && hash.previous_hash) {
      evidenceListHTML += '<tr><td style="padding:2px 0;">Previous Hash (Chain)</td><td style="font-family:monospace;font-size:10px;word-break:break-all;">' + hash.previous_hash + '</td></tr>';
    }
    if (item.transcript) {
      evidenceListHTML += '<tr><td style="padding:2px 0;">Note / Transcript</td><td>' + item.transcript.substring(0, 200) + (item.transcript.length > 200 ? '...' : '') + '</td></tr>';
    }
    evidenceListHTML += '</table>';
    evidenceListHTML += '</div>';

    if (qr && qr.qrSvg) {
      evidenceListHTML += '<div style="margin-left:12px;text-align:center;flex-shrink:0;">';
      evidenceListHTML += '<img src="' + qr.qrSvg + '" style="width:80px;height:80px;" />';
      evidenceListHTML += '<div style="font-size:8px;color:#8899AA;margin-top:2px;">Scan to Verify</div>';
      evidenceListHTML += '</div>';
    }

    evidenceListHTML += '</div>';
    evidenceListHTML += '</div>';
  });

  let chainValid = true;
  let chainHTML = '';
  if (hashLogs && hashLogs.length > 1) {
    for (let i = 1; i < hashLogs.length; i++) {
      const isLinked = hashLogs[i].previous_hash === hashLogs[i - 1].hash_value;
      if (!isLinked) chainValid = false;
      chainHTML += '<div style="display:flex;align-items:center;margin:4px 0;font-size:11px;">';
      chainHTML += '<span style="color:' + (isLinked ? '#10B981' : '#EF4444') + ';margin-right:6px;">' + (isLinked ? '✓' : '✗') + '</span>';
      chainHTML += '<span style="font-family:monospace;color:#6B7280;">' + hashLogs[i - 1].hash_value.substring(0, 16) + '...</span>';
      chainHTML += '<span style="margin:0 6px;color:#6B7280;">→</span>';
      chainHTML += '<span style="font-family:monospace;color:#6B7280;">' + hashLogs[i].hash_value.substring(0, 16) + '...</span>';
      chainHTML += '</div>';
    }
  }

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:40px;color:#071325;font-size:13px;}'
    + '.header{text-align:center;border-bottom:3px solid #4D8EFF;padding-bottom:20px;margin-bottom:30px;}'
    + '.logo{font-size:28px;font-weight:800;color:#4D8EFF;letter-spacing:-1px;}'
    + '.subtitle{font-size:14px;color:#6B7280;margin:4px 0;}'
    + '.report-id{font-size:11px;color:#8899AA;margin-top:4px;font-family:monospace;}'
    + '.badge{display:inline-block;background:#4D8EFF;color:white;padding:4px 14px;border-radius:4px;font-size:12px;font-weight:600;margin-top:8px;}'
    + '.section{margin-bottom:24px;}'
    + '.section-title{font-size:16px;font-weight:700;color:#4D8EFF;border-bottom:1px solid #E5E7EB;padding-bottom:8px;margin-bottom:12px;}'
    + '.stats-grid{display:flex;gap:12px;margin-bottom:20px;}'
    + '.stat-card{flex:1;background:#F0F7FF;border-radius:8px;padding:14px;text-align:center;}'
    + '.stat-value{font-size:20px;font-weight:800;color:#4D8EFF;}'
    + '.stat-label{font-size:10px;color:#8899AA;margin-top:4px;}'
    + '.chain-status{padding:12px;border-radius:8px;text-align:center;font-weight:700;margin-bottom:16px;}'
    + '.chain-valid{background:#ECFDF5;color:#10B981;border:1px solid #10B981;}'
    + '.chain-invalid{background:#FEF2F2;color:#EF4444;border:1px solid #EF4444;}'
    + '.qr-section{text-align:center;padding:20px;margin:20px 0;background:#F0F7FF;border-radius:12px;border:2px dashed #4D8EFF;}'
    + '.qr-title{font-size:14px;font-weight:700;color:#4D8EFF;margin-bottom:8px;}'
    + '.qr-desc{font-size:11px;color:#6B7280;margin-top:8px;line-height:1.5;}'
    + '.qr-url{font-size:9px;color:#8899AA;font-family:monospace;margin-top:4px;word-break:break-all;}'
    + '.disclaimer{background:#FFF7ED;border:1px solid #F59E0B;border-radius:8px;padding:12px;font-size:11px;color:#92400E;margin-top:20px;line-height:1.5;}'
    + '.footer{border-top:2px solid #E5E7EB;padding-top:16px;margin-top:30px;text-align:center;font-size:10px;color:#8899AA;line-height:1.6;}'
    + '.info-table{width:100%;font-size:13px;}'
    + '.info-table td{padding:4px 0;}'
    + '.info-label{width:140px;color:#8899AA;}'
    + '</style></head><body>'

    + '<div class="header">'
    + '<div class="logo">VeriHush</div>'
    + '<div class="subtitle">Evidence Integrity Report</div>'
    + '<div class="report-id">Report ID: ' + reportId + '</div>'
    + '<div><span class="badge">CERTIFIED REPORT</span></div>'
    + '</div>'

    + (mainQR ? '<div class="qr-section">'
    + '<div class="qr-title">Evidence Verification QR Code</div>'
    + '<img src="' + mainQR + '" style="width:160px;height:160px;" />'
    + '<div class="qr-desc">Scan this QR code to independently verify the integrity of this evidence.<br/>Judges, lawyers, or any third party can instantly confirm that the evidence has not been tampered with.</div>'
    + '<div class="qr-url">' + VERIFY_URL + '/?hash=' + mainHash + '</div>'
    + '</div>' : '')

    + '<div class="section">'
    + '<div class="section-title">Report Information</div>'
    + '<table class="info-table">'
    + '<tr><td class="info-label">Generated</td><td>' + formatDate(now.toISOString()) + '</td></tr>'
    + '<tr><td class="info-label">User</td><td>' + (userEmail || 'N/A') + '</td></tr>'
    + '<tr><td class="info-label">Collection Period</td><td>' + dateRange + '</td></tr>'
    + '<tr><td class="info-label">Verification URL</td><td style="font-family:monospace;font-size:11px;">' + VERIFY_URL + '</td></tr>'
    + '</table>'
    + '</div>'

    + '<div class="stats-grid">'
    + '<div class="stat-card"><div class="stat-value">' + evidenceItems.length + '</div><div class="stat-label">Total Evidence</div></div>'
    + '<div class="stat-card"><div class="stat-value">' + formatDuration(totalDuration) + '</div><div class="stat-label">Total Duration</div></div>'
    + '<div class="stat-card"><div class="stat-value">' + formatFileSize(totalSize) + '</div><div class="stat-label">Total Size</div></div>'
    + '</div>'
    + '<div class="stats-grid">'
    + '<div class="stat-card"><div class="stat-value">' + audioCount + '</div><div class="stat-label">Audio</div></div>'
    + '<div class="stat-card"><div class="stat-value">' + photoCount + '</div><div class="stat-label">Photos</div></div>'
    + '<div class="stat-card"><div class="stat-value">' + noteCount + '</div><div class="stat-label">Notes</div></div>'
    + '<div class="stat-card"><div class="stat-value">' + (hashLogs ? hashLogs.length : 0) + '</div><div class="stat-label">Hashes</div></div>'
    + '</div>'

    + '<div class="section">'
    + '<div class="section-title">SHA-256 Hash Chain Verification</div>'
    + '<div class="chain-status ' + (chainValid ? 'chain-valid' : 'chain-invalid') + '">'
    + (chainValid ? '✓ Hash chain integrity verified — all evidence is sequentially linked' : '✗ Hash chain mismatch detected — some links are broken')
    + '</div>'
    + chainHTML
    + '</div>'

    + '<div class="section">'
    + '<div class="section-title">Evidence Details</div>'
    + evidenceListHTML
    + '</div>'

    + '<div class="disclaimer">'
    + '<strong>⚠️ Disclaimer</strong><br/>'
    + 'This report was automatically generated by the VeriHush app as a digital evidence integrity verification document. '
    + 'SHA-256 hash values mathematically prove the original state of each file, and the hash chain ensures chronological continuity between evidence items. '
    + 'You can independently verify the integrity by scanning the QR code or visiting ' + VERIFY_URL + '. '
    + 'This document does not constitute legal advice. Consult a qualified attorney before using this report in legal proceedings.'
    + '</div>'

    + '<div class="footer">'
    + '<div style="font-weight:700;color:#4D8EFF;font-size:12px;">VeriHush — Secure Evidence Platform</div>'
    + '<div>Report ID: ' + reportId + '</div>'
    + '<div>Generated: ' + now.toISOString() + '</div>'
    + '<div>SHA-256 Hash Chain Verified | ' + evidenceItems.length + ' Evidence Items</div>'
    + '<div>Verification: ' + VERIFY_URL + '</div>'
    + '<div style="margin-top:6px;">This document was automatically generated by VeriHush.</div>'
    + '<div>Tampering with this report may constitute a criminal offense.</div>'
    + '</div>'

    + '</body></html>';

  return { html, reportId };
}

export async function createAndSharePDF(evidenceItems, userEmail) {
  try {
    const { html, reportId } = await generateBasicPDF(evidenceItems, userEmail);

    const { uri } = await Print.printToFileAsync({
      html: html,
      width: 612,
      height: 1800,
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const totalDuration = evidenceItems.reduce((sum, e) => sum + (e.duration || 0), 0);
      await supabase.from('reports').insert({
        user_id: session.user.id,
        title: reportId,
        report_type: 'basic',
        evidence_ids: evidenceItems.map(e => e.id),
        total_evidence_count: evidenceItems.length,
        total_duration_seconds: totalDuration,
        date_range_start: evidenceItems.length > 0 ? evidenceItems[evidenceItems.length - 1].created_at : null,
        date_range_end: evidenceItems.length > 0 ? evidenceItems[0].created_at : null,
        status: 'completed',
      });
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'VeriHush Evidence Report',
        UTI: 'com.adobe.pdf',
      });
    }

    return { success: true, uri, reportId };
  } catch (error) {
    console.log('PDF ERROR:', error.message);
    return { success: false, error: error.message };
  }
}
