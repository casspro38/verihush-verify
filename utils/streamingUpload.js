import { readAsStringAsync, getInfoAsync, EncodingType } from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

export class StreamingUploader {
  constructor() {
    this.sessionId = null;
    this.chunkIndex = 0;
    this.isStreaming = false;
    this.userId = null;
    this.location = null;
    this.lastFileSize = 0;
    this.uploadedChunks = [];
  }

  async init(location) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      this.userId = session.user.id;
      this.sessionId = 'stream_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      this.location = location;
      this.chunkIndex = 0;
      this.lastFileSize = 0;
      this.uploadedChunks = [];
      this.isStreaming = true;
      console.log('Streaming session started:', this.sessionId);
      return this.sessionId;
    } catch (e) {
      console.log('Streaming init error:', e.message);
      return null;
    }
  }

  async uploadChunk(fileUri) {
    if (!this.isStreaming || !fileUri) return null;
    try {
      const fileInfo = await getInfoAsync(fileUri);
      if (!fileInfo.exists || !fileInfo.size || fileInfo.size < 100) return null;

      // Skip if file size hasn't changed since last upload
      if (fileInfo.size === this.lastFileSize) {
        console.log('Chunk skipped - no new data (size unchanged)');
        return null;
      }
      this.lastFileSize = fileInfo.size;

      const base64 = await readAsStringAsync(fileUri, { encoding: EncodingType.Base64 });
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        base64
      );
      const arrayBuffer = decode(base64);
      const fileName = `${this.userId}/chunks/${this.sessionId}/chunk_${String(this.chunkIndex).padStart(4, '0')}.m4a`;

      const { error: uploadError } = await supabase.storage
        .from('evidence-files')
        .upload(fileName, arrayBuffer, {
          contentType: 'audio/m4a',
          upsert: false,
        });

      if (uploadError) {
        console.log('Chunk upload error:', uploadError.message);
        return null;
      }

      const { error: dbError } = await supabase.from('evidence_chunks').insert({
        user_id: this.userId,
        session_id: this.sessionId,
        chunk_index: this.chunkIndex,
        file_url: fileName,
        file_size: fileInfo.size,
        sha256_hash: hash,
        latitude: this.location?.latitude || null,
        longitude: this.location?.longitude || null,
        city: this.location?.city || null,
        consent_type: this.location?.consentType || null,
        status: 'uploaded',
      });

      if (dbError) {
        console.log('Chunk DB error:', dbError.message);
      }

      const chunkInfo = {
        chunkIndex: this.chunkIndex,
        hash,
        size: fileInfo.size,
        fileName,
      };
      this.uploadedChunks.push(chunkInfo);
      this.chunkIndex++;
      console.log(`Chunk ${this.chunkIndex} uploaded (${(fileInfo.size / 1024).toFixed(1)} KB)`);
      return chunkInfo;
    } catch (e) {
      console.log('Chunk upload exception:', e.message);
      return null;
    }
  }

  stop() {
    this.isStreaming = false;
    console.log('Streaming stopped. Total chunks:', this.uploadedChunks.length);
    return {
      sessionId: this.sessionId,
      totalChunks: this.uploadedChunks.length,
      chunks: this.uploadedChunks,
    };
  }

  getStatus() {
    return {
      isStreaming: this.isStreaming,
      sessionId: this.sessionId,
      chunksUploaded: this.uploadedChunks.length,
      totalSize: this.uploadedChunks.reduce((s, c) => s + (c.size || 0), 0),
    };
  }
}
