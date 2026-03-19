import { EncodingType, readAsStringAsync, getInfoAsync } from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

export async function generateFileHash(fileUri) {
  try {
    const fileInfo = await getInfoAsync(fileUri);
    if (!fileInfo.exists) throw new Error('File not found');
    const fileContent = await readAsStringAsync(fileUri, {
      encoding: EncodingType.Base64,
    });
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      fileContent
    );
    return hash;
  } catch (error) {
    const fallback = fileUri + Date.now().toString();
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      fallback
    );
    return hash;
  }
}

export async function getFileSize(fileUri) {
  try {
    const fileInfo = await getInfoAsync(fileUri);
    if (fileInfo.exists && fileInfo.size) {
      return fileInfo.size;
    }
    return null;
  } catch (error) {
    console.log('getFileSize error:', error.message);
    return null;
  }
}

export async function generateChainHash(previousHash, data) {
  const input = previousHash + JSON.stringify(data);
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

export async function uploadToStorage(fileUri, fileName, contentType) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const userId = session.user.id;
    const filePath = userId + '/' + fileName;

    const base64 = await readAsStringAsync(fileUri, {
      encoding: EncodingType.Base64,
    });

    const arrayBuffer = decode(base64);

    const { data, error } = await supabase.storage
      .from('evidence-files')
      .upload(filePath, arrayBuffer, {
        contentType: contentType,
        upsert: false,
      });

    if (error) throw error;
    return { path: filePath, error: null };
  } catch (error) {
    console.log('UPLOAD ERROR:', error.message);
    return { path: null, error: error.message };
  }
}

export async function saveEvidenceRecord(record) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('evidence')
      .insert({ user_id: session.user.id, ...record })
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function logHash(evidenceId, hashValue, previousHash, location) {
  try {
    const { error } = await supabase
      .from('hash_log')
      .insert({
        evidence_id: evidenceId,
        hash_type: 'SHA-256',
        hash_value: hashValue,
        previous_hash: previousHash || null,
        gps_latitude: location?.latitude || null,
        gps_longitude: location?.longitude || null,
      });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function uploadPhotoEvidence(fileUri, location) {
  try {
    const hash = await generateFileHash(fileUri);
    const fileSize = await getFileSize(fileUri);
    const fileName = 'photo_' + Date.now() + '.jpg';
    const upload = await uploadToStorage(fileUri, fileName, 'image/jpeg');
    if (upload.error) return { success: false, error: upload.error, hash };
    const record = await saveEvidenceRecord({
      type: 'photo',
      title: 'Photo ' + new Date().toLocaleString(),
      file_url: upload.path,
      file_size: fileSize,
      sha256_hash: hash,
      latitude: location?.latitude,
      longitude: location?.longitude,
      country: location?.country,
      region: location?.region,
      city: location?.city,
      consent_type: location?.consentType,
      is_verified: true,
    });
    if (record.data) await logHash(record.data.id, hash, null, location);
    return { success: true, hash, evidence: record.data };
  } catch (error) {
    return { success: false, error: error.message, hash: null };
  }
}

export async function uploadAudioEvidence(fileUri, duration, transcript, location) {
  try {
    const hash = await generateFileHash(fileUri);
    const fileSize = await getFileSize(fileUri);
    const fileName = 'audio_' + Date.now() + '.m4a';
    const upload = await uploadToStorage(fileUri, fileName, 'audio/m4a');
    if (upload.error) return { success: false, error: upload.error, hash };
    const record = await saveEvidenceRecord({
      type: 'audio',
      title: 'Recording ' + new Date().toLocaleString(),
      file_url: upload.path,
      file_size: fileSize,
      duration: duration,
      sha256_hash: hash,
      transcript: transcript || null,
      latitude: location?.latitude,
      longitude: location?.longitude,
      country: location?.country,
      region: location?.region,
      city: location?.city,
      consent_type: location?.consentType,
      is_verified: true,
    });
    if (record.data) await logHash(record.data.id, hash, null, location);
    return { success: true, hash, evidence: record.data };
  } catch (error) {
    return { success: false, error: error.message, hash: null };
  }
}
